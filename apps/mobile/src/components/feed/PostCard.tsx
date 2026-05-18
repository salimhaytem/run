import { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/ui/Avatar';
import { colors, spacing, radius } from '@/theme/tokens';

interface PostCardProps {
  postId: string;
  username: string;
  avatarUrl?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
  onFollow?: () => void;
  onShare?: () => void;
}

export const PostCard = memo(function PostCard({
  postId,
  username,
  avatarUrl,
  content,
  mediaUrl,
  likesCount,
  commentsCount,
  liked,
  onLike,
  onComment,
  onFollow,
  onShare,
}: PostCardProps) {
  const heartScale = useSharedValue(1);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleLike = () => {
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 8, stiffness: 150 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar url={avatarUrl} name={username} size={40} story />
        <Text style={styles.username}>{username}</Text>
        {onFollow && (
          <Pressable onPress={onFollow} style={styles.followBtn}>
            <Text style={styles.followText}>+ Suivre</Text>
          </Pressable>
        )}
      </View>
      {content ? <Text style={styles.content}>{content}</Text> : null}
      {mediaUrl ? (
        <Image
          source={{ uri: mediaUrl }}
          style={styles.media}
          contentFit="cover"
          transition={400}
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'L3P3?u~q-;%#?b?bIV-;%#?b?bIV' }}
        />
      ) : null}
      <View style={styles.actions}>
        <Pressable onPress={handleLike} style={styles.actionBtn}>
          <Animated.View style={heartStyle}>
            <Text style={[styles.actionIcon, liked && { color: colors.primary }]}>
              {liked ? '♥' : '♡'}
            </Text>
          </Animated.View>
          <Text style={[styles.actionCount, liked && { color: colors.primary }]}>{likesCount}</Text>
        </Pressable>
        <Pressable onPress={onComment} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{commentsCount}</Text>
        </Pressable>
        {onShare && (
          <Pressable onPress={onShare} style={styles.actionBtn}>
            <Text style={styles.actionIcon}>↗️</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  username: { color: colors.text, fontWeight: '600', fontSize: 16, flex: 1 },
  followBtn: { backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm },
  followText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  content: { color: colors.textSecondary, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  media: { width: '100%', height: 280 },
  actions: { flexDirection: 'row', gap: spacing.lg, padding: spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionIcon: { color: colors.textSecondary, fontSize: 18 },
  actionCount: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});