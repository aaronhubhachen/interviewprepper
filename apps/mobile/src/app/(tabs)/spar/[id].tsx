import { Stack, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Bullets, Button, Card, ErrorCard, Field, Loading, Pill, ProgressBar, Row, Screen, T } from '@/components/ui';
import { errorMessage, evaluateSpar, fetchBehavioral } from '@/lib/api';
import { spokenDurationMs, wordCount } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';
import type { SparEvaluateResponse } from '@web/types';

const SCORE_LABELS = {
  star: 'STAR structure',
  ownership: 'Ownership',
  impact: 'Impact',
  technicalDepth: 'Technical depth',
  conciseness: 'Conciseness',
  clarity: 'Clarity',
} as const;

const STAR_PARTS = ['situation', 'task', 'action', 'result'] as const;
const MIN_WORDS = 15;

export default function SparRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const questions = useLoad(fetchBehavioral);
  const question = questions.data?.questions.find((candidate) => candidate.id === id);
  const p = usePalette();

  const [round, setRound] = useState<1 | 2>(1);
  const [followUpOf, setFollowUpOf] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SparEvaluateResponse | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const prompt = round === 2 && followUpOf ? followUpOf : question?.prompt ?? '';

  useEffect(() => () => void Speech.stop(), []);

  const readAloud = () => {
    if (speaking) {
      void Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(prompt, { rate: 0.95, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  };

  const submit = async () => {
    if (!question) return;
    void Speech.stop();
    setBusy(true);
    setError(null);
    try {
      const response = await evaluateSpar({
        questionId: question.id,
        transcript: answer.trim(),
        durationMs: spokenDurationMs(answer),
        round,
        ...(round === 2 && followUpOf ? { followUpOf } : {}),
      });
      setResult(response);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  const answerFollowUp = () => {
    if (!result) return;
    setFollowUpOf(result.feedback.followUp);
    setRound(2);
    setResult(null);
    setAnswer('');
  };

  const restart = () => {
    setRound(1);
    setFollowUpOf(null);
    setResult(null);
    setAnswer('');
  };

  const words = wordCount(answer);

  return (
    <>
      <Stack.Screen options={{ title: question?.competency ?? 'Behavioral' }} />
      <Screen>
        {questions.error ? <ErrorCard message={questions.error} onRetry={questions.reload} /> : null}
        {!questions.data && !questions.error ? <Loading /> : null}
        {questions.data && !question ? <ErrorCard message="That question no longer exists." /> : null}

        {question ? (
          <Card highlight={!result} style={{ gap: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="eyebrow">{round === 2 ? 'Follow-up' : 'Engineering Manager'}</T>
              <Button label={speaking ? 'Stop' : 'Read aloud'} variant="ghost" icon={speaking ? '■' : '🔊'} onPress={readAloud} />
            </Row>
            <T variant="heading">{prompt}</T>
          </Card>
        ) : null}

        {question && !result ? (
          <View style={{ gap: space.md }}>
            <Field
              value={answer}
              onChangeText={setAnswer}
              minHeight={200}
              placeholder="Dictate or type. Situation, task, action, result."
              maxLength={20_000}
              editable={!busy}
            />
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="small">
                {words} words{words > 0 ? ` · ~${Math.round(spokenDurationMs(answer) / 1000)}s spoken` : ''}
              </T>
              <T variant="small" style={{ color: p.subtle }}>
                Aim for 60-90s
              </T>
            </Row>
            <Button
              label={busy ? 'Your EM is reviewing…' : 'Get feedback'}
              onPress={() => void submit()}
              disabled={words < MIN_WORDS}
              loading={busy}
            />
            {words > 0 && words < MIN_WORDS ? <T variant="small">Keep going: at least {MIN_WORDS} words.</T> : null}
            {error ? <ErrorCard message={error} onRetry={() => void submit()} /> : null}
          </View>
        ) : null}

        {result ? <Results result={result} onFollowUp={round === 1 ? answerFollowUp : undefined} onRestart={restart} /> : null}
      </Screen>
    </>
  );
}

function Results({ result, onFollowUp, onRestart }: { result: SparEvaluateResponse; onFollowUp?: () => void; onRestart: () => void }) {
  const { feedback } = result;
  const p = usePalette();
  return (
    <View style={{ gap: space.lg }}>
      <Card highlight style={{ gap: space.md }}>
        <Row style={{ alignItems: 'flex-end' }}>
          <T variant="display">{feedback.overall}</T>
          <T variant="muted" style={{ paddingBottom: 8 }}>
            /100
          </T>
          {result.source === 'heuristic' ? <Pill label="Offline scoring" /> : null}
        </Row>
        {(Object.keys(SCORE_LABELS) as (keyof typeof SCORE_LABELS)[]).map((key) => (
          <View key={key} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="small">{SCORE_LABELS[key]}</T>
              <T variant="small">{feedback.scores[key]}</T>
            </Row>
            <ProgressBar value={feedback.scores[key] / 100} />
          </View>
        ))}
      </Card>

      <Card>
        <T variant="heading">Strengths</T>
        <Bullets items={feedback.strengths} marker="✓" />
      </Card>
      <Card>
        <T variant="heading">Improve</T>
        <Bullets items={feedback.improvements} marker="→" />
      </Card>

      <Card style={{ gap: space.md }}>
        <T variant="heading">STAR check</T>
        {STAR_PARTS.map((part) => {
          const item = feedback.starBreakdown[part];
          return (
            <View key={part} style={{ gap: 2 }}>
              <T style={{ fontWeight: '600', color: item.present ? p.text : p.subtle }}>
                {item.present ? '✓' : '○'} {part[0]!.toUpperCase() + part.slice(1)}
              </T>
              <T variant="small">{item.note}</T>
            </View>
          );
        })}
      </Card>

      <Card>
        <T variant="eyebrow">A tighter opening</T>
        <T selectable>{feedback.rewrittenOpening}</T>
      </Card>

      <Card highlight>
        <T variant="eyebrow">Your EM follows up</T>
        <T variant="heading">{feedback.followUp}</T>
        {onFollowUp ? <Button label="Answer the follow-up" onPress={onFollowUp} style={{ marginTop: space.sm }} /> : null}
      </Card>
      <Button label="Start over" variant="secondary" onPress={onRestart} />
    </View>
  );
}
