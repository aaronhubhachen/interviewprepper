import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card, ErrorCard, Loading, Pill, ProgressBar, Row, Screen, T } from '@/components/ui';
import { fetchPlans, fetchProblems } from '@/lib/api';
import { humanizeTag } from '@/lib/format';
import { radius, space, usePalette } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';
import type { PlanSummary, ProblemSummary } from '@web/types';

const STAGES = ['invariant', 'edgeCase', 'code'] as const;

export default function PracticeList() {
  const params = useLocalSearchParams<{ tag?: string }>();
  const problems = useLoad(fetchProblems);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(params.tag ?? null);
  const [planId, setPlanId] = useState<PlanSummary['id'] | null>(null);
  const plans = useLoad(fetchPlans, String(problems.data?.problems.filter((problem) => problem.progress.solved).length ?? 0));
  const plan = plans.data?.plans.find((candidate) => candidate.id === planId) ?? null;
  const p = usePalette();

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const problem of problems.data?.problems ?? []) for (const t of problem.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [problems.data]);

  const visible = (problems.data?.problems ?? []).filter(
    (problem) => (!tag || problem.tags.includes(tag as never)) && problem.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: { placeholder: 'Search problems', onChangeText: (event) => setQuery(event.nativeEvent.text) },
        }}
      />
      <Screen refreshing={problems.refreshing} onRefresh={problems.refresh}>
        <T variant="muted">Invariant and edge case here; code on the web.</T>
        <Row style={{ gap: space.sm }}>
          <Chip label="All problems" active={!planId} onPress={() => setPlanId(null)} />
          {(plans.data?.plans ?? []).map((candidate) => (
            <Chip key={candidate.id} label={candidate.title} active={planId === candidate.id} onPress={() => setPlanId(candidate.id)} />
          ))}
        </Row>
        {plan ? <PlanView plan={plan} /> : null}
        {plan ? null : (
        <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          <Chip label="All" active={!tag} onPress={() => setTag(null)} />
          {tags.map((t) => (
            <Chip key={t} label={humanizeTag(t)} active={tag === t} onPress={() => setTag(tag === t ? null : t)} />
          ))}
        </ScrollView>

        {problems.error && !problems.data ? <ErrorCard message={problems.error} onRetry={problems.reload} /> : null}
        {problems.loading && !problems.data ? <Loading /> : null}
        {problems.data && visible.length === 0 ? <T variant="muted">No problems match.</T> : null}
        {visible.map((problem) => (
          <ProblemRow key={problem.id} problem={problem} />
        ))}
        {problems.data ? (
          <T variant="small" style={{ textAlign: 'center', color: p.faint }}>
            {visible.length} of {problems.data.problems.length} problems
          </T>
        ) : null}
        </>
        )}
      </Screen>
    </>
  );
}

function PlanView({ plan }: { plan: PlanSummary }) {
  const p = usePalette();
  return (
    <>
      <Card style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="heading">{plan.title}</T>
          <T variant="muted">
            {plan.solved}/{plan.total} solved
          </T>
        </Row>
        <ProgressBar value={plan.solved / plan.total} />
      </Card>
      {plan.categories.map((category) => (
        <Card key={category.name} style={{ gap: space.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="heading">{category.name}</T>
            <T variant="small">
              {category.solved}/{category.total}
            </T>
          </Row>
          <ProgressBar value={category.solved / category.total} />
          {category.items.map((item) => {
            const open = () =>
              item.problemId
                ? router.push({ pathname: '/practice/[id]', params: { id: item.problemId } })
                : void Linking.openURL(`https://leetcode.com/problems/${item.slug}/`);
            return (
              <Pressable key={item.slug} onPress={open} style={({ pressed }) => [styles.planRow, { borderColor: p.line, opacity: pressed ? 0.7 : 1 }]}>
                <T style={{ width: 20, color: item.solved ? p.accent : p.faint }}>{item.solved ? '✓' : '○'}</T>
                <T style={{ flex: 1, color: item.problemId ? p.text : p.subtle }} numberOfLines={1}>
                  {item.title}
                </T>
                <T variant="small" style={{ color: p.faint }}>
                  {item.problemId ? (item.difficulty ?? '') : 'LeetCode ↗'}
                </T>
              </Pressable>
            );
          })}
        </Card>
      ))}
    </>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, { borderColor: active ? p.accent : p.lineStrong, backgroundColor: active ? p.accentStrong : p.surface }]}
    >
      <T variant="small" style={{ color: active ? p.onAccent : p.text, fontWeight: '600' }}>
        {label}
      </T>
    </Pressable>
  );
}

function ProblemRow({ problem }: { problem: ProblemSummary }) {
  const p = usePalette();
  const passed = new Set(problem.progress.stagesPassed);
  return (
    <Link href={{ pathname: '/practice/[id]', params: { id: problem.id } }} asChild>
      <Pressable>
        {({ pressed }) => (
          <Card style={{ opacity: pressed ? 0.8 : 1, gap: space.sm }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <T variant="heading" style={{ flex: 1 }} numberOfLines={2}>
                {problem.title}
              </T>
              <View style={styles.dots}>
                {STAGES.map((stage) => (
                  <View key={stage} style={[styles.dot, { backgroundColor: passed.has(stage) ? p.accent : p.track }]} />
                ))}
              </View>
            </Row>
            <Row>
              <Pill label={problem.difficulty} tone={problem.difficulty === 'hard' ? 'bad' : problem.difficulty === 'medium' ? 'warn' : 'good'} />
              {problem.tags.slice(0, 3).map((t) => (
                <Pill key={t} label={humanizeTag(t)} />
              ))}
              {problem.progress.card.due ? <Pill label="Due" tone="accent" /> : null}
            </Row>
          </Card>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
