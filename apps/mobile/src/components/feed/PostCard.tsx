import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { colors, spacing } from '@/theme/tokens';

interface PostCardProps {
  username: string;
  avatarUrl?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
}

export function PostCard({
  username,
  avatarUrl,
  content,
  mediaUrl,
  likesCount,
  commentsCount,
  liked,
  onLike,
  onComment,
}: PostCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar url={avatarUrl} name={username} size={40} />
        <Text style={styles.username}>{username}</Text>
      </View>
      {content ? <Text style={styles.content}>{content}</Text> : null}
      {mediaUrl ? <Image source={{ uri: mediaUrl }} style={styles.media} /> : null}
      <View style={styles.actions}>
        <Pressable onPress={onLike}>
          <Text style={[styles.action, liked && { color: colors.primary }]}>
            {liked ? '♥' : '♡'} {likesCount}
          </Text>
        </Pressable>
        <Pressable onPress={onComment}>
          <Text style={styles.action}>💬 {commentsCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  username: { color: colors.text, fontWeight: '600', fontSize: 16 },
  content: { color: colors.textSecondary, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  media: { width: '100%', height: 240 },
  actions: { flexDirection: 'row', gap: spacing.lg, padding: spacing.md },
  action: { color: colors.textSecondary, fontSize: 15 },
});
