import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { View } from 'react-native';
import { EvaluationCard, TapbackRow } from '@/components/feedback';
import { Button, Card, ErrorCard, Field, Loading, Pill, Row, T, TabScreen } from '@/components/ui';
import { errorMessage, evaluateCardAnswer, fetchNextCard, gradeCard } from '@/lib/api';
import { humanizeTag } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';
import type { ReviewEvaluateResponse, ReviewNextResponse, Tag } from '@web/types';

type Step =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'answer'; next: Extract<ReviewNextResponse, { card: object }> }
  | { kind: 'graded'; next: Extract<ReviewNextResponse, { card: object }>; result: ReviewEvaluateResponse; answer: string }
  | { kind: 'empty'; next: Extract<ReviewNextResponse, { card: null }> };

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ tag?: string }>();
  const tag = (params.tag || undefined) as Tag | undefined;
  // Remount per tag so a new drill starts from a clean session.
  return <ReviewSession key={tag ?? 'all'} tag={tag} />;
}

function stepFor(next: ReviewNextResponse): Step {
  return next.card ? { kind: 'answer', next } : { kind: 'empty', next };
}

function ReviewSession({ tag }: { tag: Tag | undefined }) {
  const p = usePalette();
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(0);

  const load = async (exclude: string[] = []) => {
    setStep({ kind: 'loading' });
    setAnswer('');
    setShowHint(false);
    try {
      setStep(stepFor(await fetchNextCard({ tag, exclude })));
    } catch (error) {
      setStep({ kind: 'error', message: errorMessage(error) });
    }
  };

  const loadFirst = useEffectEvent(() => {
    fetchNextCard({ tag }).then(
      (next) => setStep(stepFor(next)),
      (error: unknown) => setStep({ kind: 'error', message: errorMessage(error) }),
    );
  });

  useEffect(() => {
    loadFirst();
  }, []);

  const check = async (text: string) => {
    if (step.kind !== 'answer') return;
    setNotice(null);
    setBusy(true);
    try {
      const result = await evaluateCardAnswer({ cardId: step.next.card.id, answer: text });
      setStep({ kind: 'graded', next: step.next, result, answer: text });
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const rate = async (grade: 1 | 3 | 5) => {
    if (step.kind !== 'graded') return;
    setBusy(true);
    try {
      const graded = await gradeCard({ cardId: step.next.card.id, grade, answer: step.answer, verdict: step.result.evaluation });
      setReviewed((count) => count + 1);
      setNotice(`Next review in ${graded.nextLabel}.`);
      await load(skipped);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    if (step.kind !== 'answer') return;
    const next = [...skipped, step.next.card.id];
    setSkipped(next);
    void load(next);
  };

  return (
    <TabScreen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="title">Review</T>
        {reviewed > 0 ? <Pill label={`${reviewed} done`} tone="accent" /> : null}
      </Row>
      {tag ? (
        <Row>
          <Pill label={`Drilling ${humanizeTag(tag)}`} tone="accent" />
          <Button label="Clear" variant="ghost" onPress={() => router.setParams({ tag: '' })} />
        </Row>
      ) : null}
      {notice ? (
        <T variant="small" style={{ color: p.accent }}>
          {notice}
        </T>
      ) : null}

      {step.kind === 'loading' ? <Loading /> : null}
      {step.kind === 'error' ? <ErrorCard message={step.message} onRetry={() => void load(skipped)} /> : null}

      {step.kind === 'empty' ? (
        <Card style={{ gap: space.md, alignItems: 'center', paddingVertical: space.xxl }}>
          <T variant="display">🎉</T>
          <T variant="heading">All caught up</T>
          <T variant="muted" style={{ textAlign: 'center' }}>
            {step.next.nextDueIn ? `Next card is due in ${step.next.nextDueIn}.` : 'Nothing else is scheduled.'}
          </T>
          <Button label="Check again" variant="secondary" onPress={() => void load()} />
        </Card>
      ) : null}

      {step.kind === 'answer' || step.kind === 'graded' ? (
        <Card highlight={step.kind === 'answer'} style={{ gap: space.md }}>
          <Row>
            <Pill label={step.next.card.kind === 'problem' ? 'Problem' : 'Micro-card'} />
            {step.next.reason === 'new' ? <Pill label="New" tone="accent" /> : null}
            {step.next.weakTags.map((weak) => (
              <Pill key={weak.tag} label={`‼️ ${weak.label}`} tone="warn" />
            ))}
          </Row>
          <T variant="heading">{step.next.card.title}</T>
          <T selectable>{step.next.card.prompt}</T>
          {showHint ? (
            <T variant="muted" style={{ fontStyle: 'italic' }}>
              Hint: {step.next.card.hint}
            </T>
          ) : null}
        </Card>
      ) : null}

      {step.kind === 'answer' ? (
        <View style={{ gap: space.md }}>
          <Field
            value={answer}
            onChangeText={setAnswer}
            placeholder="Your answer…"
            maxLength={4000}
            editable={!busy}
          />
          <Button label="Check answer" onPress={() => void check(answer)} disabled={answer.trim().length === 0} loading={busy} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Button label={showHint ? 'Hint shown' : 'Hint'} variant="ghost" onPress={() => setShowHint(true)} disabled={showHint} />
            <Button label="I don't know" variant="ghost" onPress={() => void check('idk')} disabled={busy} />
            <Button label="Skip" variant="ghost" onPress={skip} disabled={busy} />
          </Row>
        </View>
      ) : null}

      {step.kind === 'graded' ? (
        <View style={{ gap: space.md }}>
          <EvaluationCard evaluation={step.result.evaluation} answerKey={step.result.answerKey} keyPoints={step.result.keyPoints} />
          {step.result.explanation && step.result.explanation !== step.result.answerKey ? (
            <Card>
              <T variant="eyebrow">Why</T>
              <T variant="muted">{step.result.explanation}</T>
            </Card>
          ) : null}
          <T variant="heading">How did that feel?</T>
          <TapbackRow preview={step.result.preview} suggested={step.result.suggestedRating} disabled={busy} onRate={(grade) => void rate(grade)} />
          {step.result.problemId ? (
            <Button
              label="Open the full problem"
              variant="ghost"
              onPress={() => router.push({ pathname: '/practice/[id]', params: { id: step.result.problemId! } })}
            />
          ) : null}
        </View>
      ) : null}
    </TabScreen>
  );
}
