import { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, ScrollView, Pressable } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { PostCard } from '@/components/feed/PostCard';
import { Avatar } from '@/components/ui/Avatar';
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

export default function FeedScreen() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  const load = async () => {
    const { data: storyData } = await supabase
      .from('stories')
      .select('id, user_id, media_url, profiles(username, avatar_url)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    setStories((storyData as Story[]) ?? []);

    const { data: postData } = await supabase
      .from('posts')
      .select('id, content, media_url, user_id, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(30);

    const enriched: Post[] = await Promise.all(
      ((postData as Omit<Post, 'likes' | 'comments' | 'liked'>[]) ?? []).map(async (p) => {
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
    setPosts(enriched);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user) return;
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    }
    load();
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesRail}>
        {stories.map((s) => (
          <Pressable key={s.id} style={styles.storyItem}>
            <Avatar url={s.profiles?.avatar_url} name={s.profiles?.username} size={56} />
            <Text style={styles.storyName} numberOfLines={1}>
              {s.profiles?.username}
            </Text>
          </Pressable>
        ))}
        {stories.length === 0 && (
          <Text style={styles.emptyStories}>Aucune story — publie après ton run</Text>
        )}
      </ScrollView>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PostCard
            username={item.profiles?.username ?? 'runner'}
            avatarUrl={item.profiles?.avatar_url}
            content={item.content}
            mediaUrl={item.media_url}
            likesCount={item.likes}
            commentsCount={item.comments}
            liked={item.liked}
            onLike={() => toggleLike(item.id, item.liked)}
            onComment={() => {}}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>Le feed se remplit après tes runs</Text>}
      />
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
});
