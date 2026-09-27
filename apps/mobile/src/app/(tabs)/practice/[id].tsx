import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { BotChat } from '@/components/BotChat';
import { EvaluationCard } from '@/components/feedback';
import { Bullets, Button, Card, ErrorCard, Field, Loading, Pill, Row, Screen, T } from '@/components/ui';
import { errorMessage, evaluateStageAnswer, fetchProblem, recordAttempt, webUrl } from '@/lib/api';
import { humanizeTag, statementBlocks } from '@/lib/format';
import { radius, space, usePalette } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';
import type { ClientProblem, PracticeEvaluateResponse, TextStage } from '@web/types';

export default function ProblemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const problem = useLoad(() => fetchProblem(id), id);
  const data = problem.data;

  return (
    <>
      <Stack.Screen options={{ title: data?.problem.title ?? '' }} />
      <Screen refreshing={problem.refreshing} onRefresh={problem.refresh}>
        {problem.error && !data ? <ErrorCard message={problem.error} onRetry={problem.reload} /> : null}
        {!data && !problem.error ? <Loading /> : null}
        {data ? <ProblemBody problem={data.problem} passed={data.progress.stagesPassed} /> : null}
      </Screen>
    </>
  );
}

function ProblemBody({ problem, passed }: { problem: ClientProblem; passed: string[] }) {
  const p = usePalette();
  const [invariantDone, setInvariantDone] = useState(passed.includes('invariant'));

  return (
    <>
      <Row>
        <Pill label={problem.difficulty} tone={problem.difficulty === 'hard' ? 'bad' : problem.difficulty === 'medium' ? 'warn' : 'good'} />
        {problem.tags.map((tag) => (
          <Pill key={tag} label={humanizeTag(tag)} />
        ))}
      </Row>

      <Card style={{ gap: space.md }}>
        {statementBlocks(problem.statement).map((block, index) =>
          block.kind === 'list' ? (
            <Bullets key={index} items={block.items} />
          ) : block.kind === 'code' ? (
            <T key={index} variant="mono">
              {block.text}
            </T>
          ) : (
            <T key={index} selectable>
              {block.text}
            </T>
          ),
        )}
        {problem.examples.map((example, index) => (
          <View key={index} style={{ backgroundColor: p.raised, borderRadius: radius.md, padding: space.md, gap: 4 }}>
            <T variant="eyebrow">Example {index + 1}</T>
            <T variant="mono" selectable>
              Input: {example.input}
            </T>
            <T variant="mono" selectable>
              Output: {example.output}
            </T>
            {example.explanation ? <T variant="small">{example.explanation}</T> : null}
          </View>
        ))}
      </Card>

      <StageCard problemId={problem.id} stage="invariant" step={1} title="The invariant" prompt={problem.stages.invariant} onDone={() => setInvariantDone(true)} alreadyPassed={passed.includes('invariant')} />
      {invariantDone ? (
        <StageCard problemId={problem.id} stage="edgeCase" step={2} title="The edge-case trap" prompt={problem.stages.edgeCase} alreadyPassed={passed.includes('edgeCase')} />
      ) : (
        <Card>
          <T variant="eyebrow">Stage 2 · Edge-case trap</T>
          <T variant="muted">Answer stage 1 to unlock it.</T>
        </Card>
      )}

      <Card style={{ gap: space.md }}>
        <T variant="eyebrow">Stage 3 · Code</T>
        <T variant="muted">Code this one in the web IDE.</T>
        <Button label="Open the IDE" variant="secondary" icon="↗" onPress={() => void WebBrowser.openBrowserAsync(webUrl(`/practice/${problem.id}`))} />
      </Card>

      <BotChat problemId={problem.id} />
    </>
  );
}

function StageCard({
  problemId,
  stage,
  step,
  title,
  prompt,
  onDone,
  alreadyPassed,
}: {
  problemId: string;
  stage: TextStage;
  step: number;
  title: string;
  prompt: { prompt: string; hint: string };
  onDone?: () => void;
  alreadyPassed: boolean;
}) {
  const p = usePalette();
  const [answer, setAnswer] = useState('');
  const [hintShown, setHintShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PracticeEvaluateResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const startedAt = useRef(0);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const evaluated = await evaluateStageAnswer({ problemId, stage, answer });
      setResult(evaluated);
      const attempt = await recordAttempt({
        problemId,
        stage,
        grade: evaluated.evaluation.suggestedGrade,
        hintsUsed: hintShown ? 1 : 0,
        answer,
        ...(startedAt.current ? { durationMs: Date.now() - startedAt.current } : {}),
      });
      setMessage(attempt.message);
      onDone?.();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    setResult(null);
    setMessage(null);
    setAnswer('');
    startedAt.current = 0;
  };

  return (
    <View style={{ gap: space.md }}>
      <Card highlight={!result} style={{ gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="eyebrow">
            Stage {step} · {title}
          </T>
          {alreadyPassed ? <Pill label="Passed before" tone="good" /> : null}
        </Row>
        <T selectable>{prompt.prompt}</T>
        {hintShown ? (
          <T variant="muted" style={{ fontStyle: 'italic' }}>
            Hint: {prompt.hint}
          </T>
        ) : null}
        {!result ? (
          <>
            <Field
              value={answer}
              onChangeText={(text) => {
                if (!startedAt.current) startedAt.current = Date.now();
                setAnswer(text);
              }}
              placeholder="1–2 sentences." maxLength={4000} editable={!busy} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Button label={hintShown ? 'Hint shown' : 'Hint'} variant="ghost" onPress={() => setHintShown(true)} disabled={hintShown} />
              <Button label="Check" onPress={() => void submit()} disabled={answer.trim().length === 0} loading={busy} />
            </Row>
          </>
        ) : null}
        {error ? <T variant="small" style={{ color: p.danger }}>{error}</T> : null}
      </Card>
      {result ? (
        <>
          <EvaluationCard evaluation={result.evaluation} answerKey={result.answerKey} keyPoints={result.keyPoints} />
          {message ? (
            <T variant="small" style={{ color: p.accent }}>
              {message}
            </T>
          ) : null}
          <Button label="Try this stage again" variant="ghost" onPress={retry} />
        </>
      ) : null}
    </View>
  );
}
