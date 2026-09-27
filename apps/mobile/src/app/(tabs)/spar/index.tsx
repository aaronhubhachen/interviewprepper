import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Card, ErrorCard, Loading, Pill, Row, Screen, T } from '@/components/ui';
import { fetchBehavioral, fetchSparSessions } from '@/lib/api';
import { space, usePalette } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';

export default function SparList() {
  const questions = useLoad(fetchBehavioral);
  const sessions = useLoad(() => fetchSparSessions(10));
  const p = usePalette();

  const refresh = () => {
    questions.refresh();
    sessions.refresh();
  };

  const best = new Map<string, number>();
  for (const session of sessions.data?.sessions ?? []) {
    best.set(session.questionId, Math.max(best.get(session.questionId) ?? 0, session.overall));
  }

  return (
    <Screen refreshing={questions.refreshing} onRefresh={refresh}>
      <T variant="muted">Answer a behavioral question. Get STAR feedback and a follow-up.</T>

      {questions.error && !questions.data ? <ErrorCard message={questions.error} onRetry={questions.reload} /> : null}
      {!questions.data && !questions.error ? <Loading /> : null}

      {questions.data?.questions.map((question) => (
        <Link key={question.id} href={{ pathname: '/spar/[id]', params: { id: question.id } }} asChild>
          <Pressable>
            {({ pressed }) => (
              <Card style={{ opacity: pressed ? 0.8 : 1 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="eyebrow">{question.competency}</T>
                  {best.has(question.id) ? <Pill label={`Best ${best.get(question.id)}`} tone="accent" /> : null}
                </Row>
                <T>{question.prompt}</T>
              </Card>
            )}
          </Pressable>
        </Link>
      ))}

      {sessions.data && sessions.data.sessions.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <T variant="heading">Recent sessions</T>
          {sessions.data.sessions.slice(0, 5).map((session) => (
            <Row key={session.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <T variant="muted" numberOfLines={1} style={{ flex: 1 }}>
                {session.round === 2 ? '↳ ' : ''}
                {session.questionPrompt ?? session.questionId}
              </T>
              <T style={{ color: p.accent, fontWeight: '700' }}>{session.overall}</T>
            </Row>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
