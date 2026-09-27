import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Evaluation, IntervalPreviews, Rating } from '@web/types';
import { radius, space, usePalette } from '@/lib/theme';
import { Bullets, Card, Row, T } from './ui';

const VERDICT: Record<Evaluation['verdict'], { emoji: string; label: string }> = {
  correct: { emoji: '✅', label: 'Nailed it' },
  partial: { emoji: '🟡', label: 'Partly there' },
  incorrect: { emoji: '❌', label: 'Not quite' },
};

export function EvaluationCard({ evaluation, answerKey, keyPoints }: { evaluation: Evaluation; answerKey: string; keyPoints?: string[] }) {
  const p = usePalette();
  const verdict = VERDICT[evaluation.verdict];
  return (
    <Card style={{ gap: space.md }}>
      <Row>
        <Text style={{ fontSize: 22 }}>{verdict.emoji}</Text>
        <T variant="heading">{verdict.label}</T>
      </Row>
      <T variant="muted">{evaluation.feedback}</T>
      {evaluation.nailed.length > 0 ? (
        <View style={{ gap: 6 }}>
          <T variant="eyebrow">You covered</T>
          <Bullets items={evaluation.nailed} marker="✓" />
        </View>
      ) : null}
      {evaluation.missed.length > 0 ? (
        <View style={{ gap: 6 }}>
          <T variant="eyebrow">Missing</T>
          <Bullets items={evaluation.missed} marker="–" />
        </View>
      ) : null}
      <View style={[styles.key, { backgroundColor: p.raised }]}>
        <T variant="eyebrow">Answer key</T>
        <T selectable>{answerKey}</T>
      </View>
      {keyPoints && keyPoints.length > 0 && evaluation.missed.length === 0 && evaluation.nailed.length === 0 ? (
        <Bullets items={keyPoints} />
      ) : null}
    </Card>
  );
}

const RATINGS: { rating: Rating; emoji: string; label: string; grade: 1 | 3 | 5 }[] = [
  { rating: 'love', emoji: '❤️', label: 'Effortless', grade: 5 },
  { rating: 'like', emoji: '👍', label: 'Hesitant', grade: 3 },
  { rating: 'dislike', emoji: '👎', label: 'Guessed', grade: 1 },
];

/** The iMessage tapback scale: ❤️ effortless, 👍 hesitant, 👎 guessed/blank. */
export function TapbackRow({
  preview,
  suggested,
  disabled,
  onRate,
}: {
  preview?: IntervalPreviews;
  suggested?: Rating;
  disabled?: boolean;
  onRate: (grade: 1 | 3 | 5, rating: Rating) => void;
}) {
  const p = usePalette();
  return (
    <View style={styles.tapbacks}>
      {RATINGS.map(({ rating, emoji, label, grade }) => {
        const picked = rating === suggested;
        return (
          <Pressable
            key={rating}
            accessibilityRole="button"
            accessibilityLabel={`${label}${preview ? `, next review in ${preview[rating].label}` : ''}`}
            disabled={disabled}
            onPress={() => onRate(grade, rating)}
            style={({ pressed }) => [
              styles.tapback,
              {
                borderColor: picked ? p.accent : p.line,
                backgroundColor: pressed ? p.raised : p.surface,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
          >
            <Text style={{ fontSize: 26 }}>{emoji}</Text>
            <T variant="small" style={{ color: p.text, fontWeight: '600' }}>
              {label}
            </T>
            {preview ? <T variant="small">{preview[rating].label}</T> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  key: { borderRadius: radius.md, padding: space.md, gap: 4 },
  tapbacks: { flexDirection: 'row', gap: space.sm },
  tapback: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderWidth: 1, borderRadius: radius.lg, borderCurve: 'continuous' },
});
