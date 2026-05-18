import { useEffect, useState } from 'react';
import { View, FlatList, TextInput, StyleSheet, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme/tokens';

interface Message {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  profiles?: { username: string };
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');

  const channelType = id?.startsWith('crew-')
    ? 'crew'
    : id?.startsWith('sos-')
      ? 'session'
      : 'session';
  const channelId = id?.replace(/^(crew-|sos-)/, '') ?? id ?? '';

  const load = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('id, body, sender_id, created_at, profiles(username)')
      .eq('channel_type', channelType)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
  };

  useEffect(() => {
    load();
    const sub = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [id]);

  const send = async () => {
    if (!user || !text.trim()) return;
    await supabase.from('chat_messages').insert({
      channel_type: channelType,
      channel_id: channelId,
      sender_id: user.id,
      body: text.trim(),
    });
    setText('');
    load();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.sender_id === user?.id ? styles.mine : styles.theirs,
            ]}
          >
            <Text style={styles.user}>{item.profiles?.username ?? 'runner'}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={colors.textSecondary}
        />
        <Button title="Envoyer" onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  bubble: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    maxWidth: '80%',
  },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primaryMuted },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  user: { color: colors.textSecondary, fontSize: 11, marginBottom: 4 },
  body: { color: colors.text },
  inputRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
  },
});
