import { useEffect, useState, useCallback, memo } from 'react';
import { View, FlatList, StyleSheet, Text, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { PostCard } from '@/components/feed/PostCard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/BottomSheet';
import { SkeletonFeed } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { followUser } from '@/features/social/followUser';
import { colors, spacing } from '@/theme/tokens';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  profiles?: { username: string; avatar_url: string | null };
}

interface Post {
  id: string;
  content: string | null;
  media_url: string | null;
  user_id: string;
  profiles?: { username: string; avatar_url: string | null };
  likes: number;
  comments: number;
  liked: boolean;
}

const PAGE_SIZE = 15;

const StoryItem = memo(function StoryItem({ story, onPress }: { story: Story; onPress: () => void }) {
  return (
    <Pressable style={styles.storyItem} onPress={onPress}>
      <Avatar url={story.profiles?.avatar_url} name={story.profiles?.username} size={56} story />
      <Text style={styles.storyName} numberOfLines={1}>{story.profiles?.username}</Text>
    </Pressable>
  );
});

export default function FeedScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const haptics = useHaptics();
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [commentPost, setCommentPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [storyViewer, setStoryViewer] = useState<Story[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);

  const load = useCallback(async (pageNum = 0, append = false) => {
    setLoading(true);
    const { data: storyData } = await supabase
      .from('stories')
      .select('id, user_id, media_url, profiles(username, avatar_url)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20);
    setStories((storyData as Story[]) ?? []);

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: postData } = await supabase
      .from('posts')
      .select('id, content, media_url, user_id, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
      .range(from, to);

    const rows = (postData as Omit<Post, 'likes' | 'comments' | 'liked'>[]) ?? [];
    setHasMore(rows.length === PAGE_SIZE);

    const enriched: Post[] = await Promise.all(
      rows.map(async (p) => {
        const [{ count: likes }, { count: comments }, likedRes] = await Promise.all([
          supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
          supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
          user
            ? supabase.from('post_likes').select('post_id').eq('post_id', p.id).eq('user_id', user.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        return {
          ...p,
          likes: likes ?? 0,
          comments: comments ?? 0,
          liked: !!likedRes.data,
        };
      }),
    );

    setPosts(append ? (prev) => [...prev, ...enriched] : enriched);
    setLoading(false);
    setInitialLoading(false);
  }, [user?.id]);

  useEffect(() => { load(0); }, [load]);

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user) return;
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, liked: !liked, likes: liked ? p.likes - 1 : p.likes + 1 } : p)),
    );
  };

  const loadMore = () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage, true);
  };

  const submitComment = async () => {
    if (!user || !commentPost || !commentText.trim()) return;
    await supabase.from('post_comments').insert({
      post_id: commentPost,
      user_id: user.id,
      body: commentText.trim(),
    });
    setCommentText('');
    setCommentPost(null);
    haptics.success();
    toast.success('Commentaire ajouté');
    setPosts((prev) =>
      prev.map((p) => (p.id === commentPost ? { ...p, comments: p.comments + 1 } : p)),
    );
  };

  const handleFollow = async (targetId: string) => {
    if (!user) return;
    await followUser(user.id, targetId);
    haptics.medium();
    toast.success('Runner suivi !');
  };

  const handleShare = (postId: string) => {
    haptics.light();
    toast.success('Lien copié !');
  };

  const openStory = (index: number) => {
    setStoryViewer(stories);
    setStoryIndex(index);
  };

  if (initialLoading) return <SkeletonFeed />;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesRail}>
        {stories.map((s, i) => (
          <StoryItem key={s.id} story={s} onPress={() => openStory(i)} />
        ))}
        {stories.length === 0 && (
          <Text style={styles.emptyStories}>Aucune story — publie après ton run</Text>
        )}
      </ScrollView>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={5}
        renderItem={({ item }) => (
          <PostCard
            postId={item.id}
            username={item.profiles?.username ?? 'runner'}
            avatarUrl={item.profiles?.avatar_url}
            content={item.content}
            mediaUrl={item.media_url}
            likesCount={item.likes}
            commentsCount={item.comments}
            liked={item.liked}
            onLike={() => toggleLike(item.id, item.liked)}
            onComment={() => setCommentPost(item.id)}
            onFollow={user && item.user_id !== user.id ? () => handleFollow(item.user_id) : undefined}
            onShare={() => handleShare(item.id)}
          />
        )}
        ListFooterComponent={loading ? <Text style={styles.loading}>Chargement...</Text> : null}
        ListEmptyComponent={<Text style={styles.empty}>Le feed se remplit après tes runs</Text>}
      />

      <Sheet visible={!!commentPost} onClose={() => setCommentPost(null)} title="Commentaire" snapPoints={['50%']}>
        <TextInput
          style={styles.input}
          placeholder="Écris un commentaire..."
          placeholderTextColor={colors.textSecondary}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          autoFocus
        />
        <Button title="Envoyer" onPress={submitComment} haptic="medium" />
      </Sheet>

      <Sheet visible={storyViewer.length > 0} onClose={() => setStoryViewer([])} title="Stories" snapPoints={['90%']}>
        {storyViewer.length > 0 && (
          <View style={styles.storyContent}>
            <Text style={styles.storyUsername}>@{storyViewer[storyIndex]?.profiles?.username}</Text>
            {storyViewer[storyIndex]?.media_url && (
              <Avatar url={storyViewer[storyIndex].media_url} name="" size={250} />
            )}
            <View style={styles.storyNav}>
              <Button title="←" variant="ghost" onPress={() => setStoryIndex(Math.max(0, storyIndex - 1))} disabled={storyIndex === 0} />
              <Button title="→" variant="ghost" onPress={() => setStoryIndex(Math.min(storyViewer.length - 1, storyIndex + 1))} disabled={storyIndex >= storyViewer.length - 1} />
            </View>
          </View>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  storiesRail: { maxHeight: 90, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  storyItem: { alignItems: 'center', marginRight: spacing.md, width: 64 },
  storyName: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },
  emptyStories: { color: colors.textSecondary, padding: spacing.md },
  list: { padding: spacing.md },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  loading: { color: colors.textSecondary, textAlign: 'center', padding: spacing.md },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, color: colors.text, marginBottom: spacing.md, minHeight: 100, borderWidth: 1, borderColor: colors.border },
  storyContent: { alignItems: 'center', gap: spacing.md },
  storyUsername: { color: colors.text, fontSize: 18, fontWeight: '600' },
  storyNav: { flexDirection: 'row', gap: spacing.lg },
});