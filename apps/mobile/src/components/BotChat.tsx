import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { errorMessage, sendBotMessage } from '@/lib/api';
import { radius, space, usePalette } from '@/lib/theme';
import { replyParts } from '@/lib/replyParts';
import type { BotMessage } from '@web/types';
import { Button, Card, Field, Loading, Row, T } from './ui';

const QUICK = [
  { label: 'Approaches', prompt: 'What approaches would you consider for this problem, with their time and space complexity? No full code.' },
  { label: 'Edge cases', prompt: 'Which edge cases and tricky inputs should I think about before coding this?' },
  { label: 'Hint', prompt: 'Give me one small hint toward the key idea, without the solution.' },
];

/** Prepr Bot on the phone: talk through the approach; the coding happens in the web IDE. */
export function BotChat({ problemId }: { problemId: string }) {
  const p = usePalette();
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    const next: BotMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setError(null);
    setSending(true);
    try {
      const reply = await sendBotMessage({ problemId, language: 'python', code: '', messages: next.slice(-30), trapMode: false, trapsUsed: 0 });
      setMessages([...next, { role: 'assistant', content: reply.reply }]);
    } catch (sendError) {
      setError(errorMessage(sendError));
      setMessages(messages);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card style={{ gap: space.md }}>
      <T variant="eyebrow">Ask Prepr Bot</T>
      <T variant="muted">Talk through the approach, edge cases, or complexity. The coding (and the AI edit review) happens in the web IDE.</T>
      {messages.map((message, index) =>
        message.role === 'user' ? (
          <View key={index} style={[styles.bubble, styles.mine, { backgroundColor: p.accentStrong }]}>
            <T style={{ color: p.onAccent }}>{message.content}</T>
          </View>
        ) : (
          <View key={index} style={[styles.bubble, styles.theirs, { backgroundColor: p.raised, borderColor: p.line }]}>
            {replyParts(message.content).map((part, partIndex) =>
              part.kind === 'code' ? (
                <Text key={partIndex} selectable style={[styles.code, { color: p.text, backgroundColor: p.field }]}>
                  {part.text}
                </Text>
              ) : (
                <T key={partIndex} selectable>
                  {part.text}
                </T>
              ),
            )}
          </View>
        ),
      )}
      {sending ? <Loading label="Prepr Bot is thinking…" /> : null}
      {error ? <T variant="small" style={{ color: p.danger }}>{error}</T> : null}
      <Row>
        {QUICK.map((quick) => (
          <Button key={quick.label} label={quick.label} variant="secondary" onPress={() => void send(quick.prompt)} disabled={sending} style={styles.quick} />
        ))}
      </Row>
      <Field value={draft} onChangeText={setDraft} placeholder="Ask anything about this problem…" minHeight={70} maxLength={4000} editable={!sending} />
      <Button label="Send" onPress={() => void send(draft)} disabled={!draft.trim() || sending} />
    </Card>
  );
}

const styles = StyleSheet.create({
  bubble: { padding: space.md, borderRadius: radius.lg, gap: 6, maxWidth: '92%', borderCurve: 'continuous' },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', borderWidth: 1, borderBottomLeftRadius: 6 },
  code: { fontFamily: 'Menlo', fontSize: 12, padding: space.sm, borderRadius: radius.sm },
  quick: { minHeight: 36, paddingHorizontal: space.md },
});
