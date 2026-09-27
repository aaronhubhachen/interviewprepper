import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Bullets, Button, Card, ErrorCard, Field, Loading, Pill, ProgressBar, Row, T, TabScreen } from '@/components/ui';
import { errorMessage, fetchGrillQuestion, fetchGrillReport, uploadResume } from '@/lib/api';
import { radius, space, usePalette } from '@/lib/theme';
import type { GrillNextResponse, GrillReport, GrillTurn } from '@web/types';

const RESUME_KEY = 'prepr.grill.resume';
const MIN_RESUME_CHARS = 80;
const DEFAULT_TOTAL = 8;

type Stage = 'setup' | 'interview' | 'report';

const VERDICT = {
  held: { label: 'Held up', tone: 'good' },
  shaky: { label: 'Shaky', tone: 'warn' },
  cracked: { label: 'Cracked', tone: 'bad' },
} as const;

export default function GrillScreen() {
  const p = usePalette();
  const [resume, setResume] = useState('');
  const [stage, setStage] = useState<Stage>('setup');
  const [asked, setAsked] = useState<GrillNextResponse[]>([]);
  const [turns, setTurns] = useState<GrillTurn[]>([]);
  const [answer, setAnswer] = useState('');
  const [thinking, setThinking] = useState<'question' | 'report' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GrillReport | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [voice, setVoice] = useState(false);
  const retryRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(RESUME_KEY)
      .then((saved) => saved && setResume(saved))
      .catch(() => {});
    return () => void Speech.stop();
  }, []);

  const updateResume = (text: string) => {
    setResume(text);
    void AsyncStorage.setItem(RESUME_KEY, text).catch(() => {});
  };

  const pickFile = async () => {
    setError(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'text/markdown'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const file = picked.assets[0];
    setUploading(true);
    try {
      const { text, pages } = await uploadResume(file);
      updateResume(text);
      setFileNote(`${file.name}${pages ? ` · ${pages} ${pages === 1 ? 'page' : 'pages'}` : ''}. Check the text and fix anything garbled.`);
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  };

  const total = asked[0]?.total ?? DEFAULT_TOTAL;

  const askNext = async (history: GrillTurn[]) => {
    retryRef.current = () => void askNext(history);
    setError(null);
    setThinking('question');
    try {
      const next = await fetchGrillQuestion({ resume, turns: history });
      setAsked((current) => [...current.slice(0, history.length), next]);
      if (voice) Speech.speak([next.reaction, next.question].filter(Boolean).join(' '), { rate: 1 });
    } catch (askError) {
      setError(errorMessage(askError));
    } finally {
      setThinking(null);
    }
  };

  const finish = async (history: GrillTurn[]) => {
    retryRef.current = () => void finish(history);
    void Speech.stop();
    setError(null);
    setThinking('report');
    try {
      setReport(await fetchGrillReport({ resume, turns: history }));
      setStage('report');
    } catch (reportError) {
      setError(errorMessage(reportError));
    } finally {
      setThinking(null);
    }
  };

  const start = () => {
    setAsked([]);
    setTurns([]);
    setReport(null);
    setAnswer('');
    setStage('interview');
    void askNext([]);
  };

  const submit = () => {
    const current = asked[turns.length];
    const text = answer.trim();
    if (!current || !text) return;
    void Speech.stop();
    const history = [...turns, { question: current.question, target: current.target, answer: text }];
    setTurns(history);
    setAnswer('');
    if (history.length >= total) void finish(history);
    else void askNext(history);
  };

  const quit = () => {
    void Speech.stop();
    setStage('setup');
    setAsked([]);
    setTurns([]);
    setReport(null);
    setError(null);
  };

  const awaiting = asked.length > turns.length && !thinking;

  return (
    <TabScreen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="title">Resume grill</T>
        {stage === 'interview' ? <Button label="Quit" variant="ghost" onPress={quit} /> : null}
      </Row>

      {stage === 'setup' ? (
        <>
          <T variant="muted">The interviewer picks your resume apart one claim at a time: inflated verbs, unverifiable numbers, shallow tech.</T>
          <Button label={uploading ? 'Reading your resume…' : 'Upload resume (PDF, .txt, .md)'} icon="📄" onPress={() => void pickFile()} loading={uploading} variant="secondary" />
          {fileNote ? <T variant="small">{fileNote}</T> : null}
          {error ? <ErrorCard message={error} /> : null}
          <Field value={resume} onChangeText={updateResume} placeholder="…or paste your resume here." minHeight={220} maxLength={20_000} style={{ fontFamily: 'Menlo', fontSize: 13 }} />
          <T variant="small" style={{ color: p.faint }}>
            Saved on this phone only. The server stores nothing; the text goes to the model to write questions.
          </T>
          <Button label="Start the grill" icon="→" onPress={start} disabled={resume.trim().length < MIN_RESUME_CHARS} />
        </>
      ) : null}

      {stage === 'interview' ? (
        <>
          <Card style={{ gap: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="heading">
                Question {Math.min(Math.max(asked.length, 1), total)} of {total}
              </T>
              <Button
                label={voice ? 'Voice on' : 'Voice off'}
                variant="ghost"
                onPress={() => {
                  if (voice) void Speech.stop();
                  setVoice(!voice);
                }}
              />
            </Row>
            <ProgressBar value={turns.length / total} />
          </Card>

          {asked.map((question, index) => (
            <View key={index} style={{ gap: space.sm }}>
              <View style={[styles.bubble, styles.theirs, { backgroundColor: p.surface, borderColor: p.line }]}>
                {question.reaction ? <T variant="muted">{question.reaction}</T> : null}
                <T>{question.question}</T>
                <T variant="small" style={{ color: p.subtle }} numberOfLines={2}>
                  On: {question.target}
                </T>
              </View>
              {turns[index] ? (
                <View style={[styles.bubble, styles.mine, { backgroundColor: p.accentStrong }]}>
                  <T style={{ color: p.onAccent }}>{turns[index].answer}</T>
                </View>
              ) : null}
            </View>
          ))}

          {thinking === 'question' ? <Loading label="The interviewer is reading your answer…" /> : null}
          {thinking === 'report' ? <Loading label="The panel is reviewing your answers (10-30s)…" /> : null}
          {error ? <ErrorCard message={error} onRetry={() => retryRef.current?.()} /> : null}

          {awaiting ? (
            <>
              <Field value={answer} onChangeText={setAnswer} placeholder="Defend your resume. Be specific. Tap the keyboard mic to dictate." maxLength={6000} autoFocus />
              <Button label={turns.length + 1 >= total ? 'Final answer' : 'Answer'} onPress={submit} disabled={!answer.trim()} />
            </>
          ) : null}
          {turns.length > 0 && !thinking ? <Button label="End now and get the verdict" variant="ghost" onPress={() => void finish(turns)} /> : null}
        </>
      ) : null}

      {stage === 'report' && report ? <ReportView report={report} questions={turns.length} onAgain={start} onNewResume={quit} /> : null}
    </TabScreen>
  );
}

function ReportView({ report, questions, onAgain, onNewResume }: { report: GrillReport; questions: number; onAgain: () => void; onNewResume: () => void }) {
  const band =
    report.overall >= 80 ? 'Your resume survived.' : report.overall >= 60 ? 'Mostly held, with soft spots.' : report.overall >= 40 ? 'Several claims buckled.' : "The resume didn't survive.";
  return (
    <View style={{ gap: space.lg }}>
      <Card highlight style={{ gap: space.sm }}>
        <Row style={{ alignItems: 'flex-end' }}>
          <T variant="display">{report.overall}</T>
          <T variant="muted" style={{ paddingBottom: 8 }}>
            /100
          </T>
        </Row>
        <T variant="heading">{band}</T>
        <T variant="muted">{report.summary}</T>
        <Row>
          <Pill label={`${questions} questions`} />
          {report.source === 'heuristic' ? <Pill label="Offline scoring" /> : null}
        </Row>
      </Card>

      <Card style={{ gap: space.md }}>
        <T variant="heading">Claim by claim</T>
        {report.claims.map((claim, index) => (
          <View key={index} style={{ gap: 4 }}>
            <Pill label={VERDICT[claim.verdict].label} tone={VERDICT[claim.verdict].tone} />
            <T style={{ fontWeight: '600' }}>{claim.claim}</T>
            {claim.note ? <T variant="small">{claim.note}</T> : null}
          </View>
        ))}
      </Card>

      {report.redFlags.length > 0 ? (
        <Card>
          <T variant="heading">Red flags</T>
          <Bullets items={report.redFlags} marker="!" />
        </Card>
      ) : null}
      <Card>
        <T variant="heading">Fix before the real one</T>
        <Bullets items={report.fixes} marker="→" />
      </Card>

      <Button label="Grill me again" icon="↻" onPress={onAgain} />
      <Button label="Use a different resume" variant="secondary" onPress={onNewResume} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { padding: space.md, borderRadius: radius.lg, gap: 4, maxWidth: '88%', borderCurve: 'continuous' },
  theirs: { alignSelf: 'flex-start', borderWidth: 1, borderBottomLeftRadius: 6 },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
});
