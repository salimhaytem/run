import { useEffect, useState } from 'react';
import { View, FlatList, TextInput, StyleSheet, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonCircle } from '@/components/ui/Skeleton';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, spacing } from '@/theme/tokens';

interface Message { id: string; body: string; sender_id: string; created_at: string; profiles?: { username: string } }

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const haptics = useHaptics();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const channelType = id?.startsWith('crew-') ? 'crew' : id?.startsWith('sos-') ? 'session' : 'session';
  const channelId = id?.replace(/^(crew-|sos-)/, '') ?? id ?? '';

  const load = async () => {
    const { data } = await supabase.from('chat_messages').select('id, body, sender_id, created_at, profiles(username)').eq('channel_type', channelType).eq('channel_id', channelId).order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const sub = supabase.channel(`chat-${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` }, load).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [id]);

  const send = async () => {
    if (!user || !text.trim()) return;
    haptics.light();
    await supabase.from('chat_messages').insert({ channel_type: channelType, channel_id: channelId, sender_id: user.id, body: text.trim() });
    setText('');
    load();
  };

  if (loading) return (
    <View style={styles.container}>
      <View style={{ padding: spacing.md, gap: 12 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={{ flexDirection: i % 2 === 0 ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
            <SkeletonCircle size={28} />
            <Skeleton width={i % 2 === 0 ? '60%' : '40%'} height={40} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 30)}
            style={[styles.bubble, item.sender_id === user?.id ? styles.mine : styles.theirs]}
          >
            <Text style={styles.user}>{item.profiles?.username ?? 'runner'}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </Animated.View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Message..." placeholderTextColor={colors.textSecondary} />
        <Button title="Envoyer" onPress={send} haptic="light" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  bubble: { padding: spacing.md, borderRadius: 12, marginBottom: spacing.sm, maxWidth: '80%' },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primaryMuted },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  user: { color: colors.textSecondary, fontSize: 11, marginBottom: 4 },
  body: { color: colors.text },
  inputRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, alignItems: 'center' },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, color: colors.text, borderWidth: 1, borderColor: colors.border },
});