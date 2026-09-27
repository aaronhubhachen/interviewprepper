import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Button, Card, ErrorCard, Loading, Pill, ProgressBar, Row, T, TabScreen } from '@/components/ui';
import { errorMessage, fetchReportCard, fetchStats, setAgentPaused } from '@/lib/api';
import { useServer } from '@/lib/server';
import { radius, space, usePalette } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';
import type { ReportCard, StatsResponse } from '@web/types';

export default function HomeScreen() {
  const stats = useLoad(fetchStats);
  const { url } = useServer();
  const p = usePalette();

  return (
    <TabScreen refreshing={stats.refreshing} onRefresh={stats.refresh}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: space.sm }}>
          <Image source={require('../../../assets/images/splash-icon.png')} style={styles.mark} accessibilityIgnoresInvertColors />
          <T variant="title">
            P<T variant="title" style={{ color: p.accent }}>repr</T>
          </T>
        </Row>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Server settings"
          onPress={() => router.push('/settings')}
          hitSlop={12}
          style={[styles.gear, { borderColor: p.lineStrong, backgroundColor: p.surface }]}
        >
          <T variant="small">⚙︎</T>
        </Pressable>
      </Row>

      {stats.error && !stats.data ? (
        <>
          <ErrorCard message={stats.error} onRetry={stats.reload} />
          <Button label="Change server address" variant="ghost" onPress={() => router.push('/settings')} />
        </>
      ) : !stats.data ? (
        <Loading />
      ) : (
        <>
          <Dashboard stats={stats.data} onChanged={stats.refresh} />
          <WeeklyReport url={url} refreshKey={stats.data.generatedAt} />
        </>
      )}

      <T variant="small" style={{ textAlign: 'center', color: p.faint }}>
        Synced with {url}
      </T>
    </TabScreen>
  );
}

function Dashboard({ stats, onChanged }: { stats: StatsResponse; onChanged: () => void }) {
  const p = usePalette();
  const due = stats.queue.dueNow;
  const newLeft = stats.queue.newRemaining;
  const forecast = stats.forecast14.slice(0, 7);
  const peak = Math.max(1, ...forecast.map((day) => day.count));
  const mastery = [...stats.masteryByTag].sort((a, b) => b.cards - a.cards).slice(0, 6);

  return (
    <>
      <Card highlight style={{ gap: space.md }}>
        <T variant="eyebrow">Today</T>
        <Row style={{ alignItems: 'flex-end', gap: space.md }}>
          <T variant="display">{due}</T>
          <T variant="muted" style={{ paddingBottom: 8 }}>
            {due === 1 ? 'card due' : 'cards due'}
            {newLeft > 0 ? ` · ${newLeft} new` : ''}
          </T>
        </Row>
        <Button
          label={due + newLeft > 0 ? 'Start review' : 'Review ahead'}
          icon="→"
          onPress={() => router.push('/review')}
        />
      </Card>

      <View style={styles.grid}>
        <Stat label="Streak" value={`${stats.streakDays}d`} />
        <Stat label="Reviewed today" value={String(stats.reviewedToday)} />
        <Stat label="Retention (30d)" value={stats.retention30d === null ? '–' : `${Math.round(stats.retention30d * 100)}%`} />
        <Stat label="Learned" value={`${stats.cardsLearned}/${stats.totalCards}`} />
      </View>

      <Card>
        <T variant="heading">Next 7 days</T>
        <View style={styles.bars}>
          {forecast.map((day) => (
            <View key={day.offset} style={styles.barCol}>
              <T variant="small">{day.count}</T>
              <View style={[styles.barTrack, { backgroundColor: p.raised }]}>
                <View style={{ height: `${(day.count / peak) * 100}%`, backgroundColor: day.offset === 0 ? p.accent : p.accentSoft, borderRadius: 6 }} />
              </View>
              <T variant="small" style={{ color: p.subtle }}>
                {day.label}
              </T>
            </View>
          ))}
        </View>
      </Card>

      {stats.weakTags.length > 0 ? (
        <Card>
          <T variant="heading">Weak spots</T>
          <T variant="small">Tap one to drill just that topic.</T>
          <View style={{ gap: space.sm, marginTop: space.xs }}>
            {stats.weakTags.slice(0, 5).map((weak) => (
              <Pressable
                key={weak.tag}
                onPress={() => router.push({ pathname: '/review', params: { tag: weak.tag } })}
                style={({ pressed }) => [styles.weakRow, { borderColor: p.line, backgroundColor: pressed ? p.raised : 'transparent' }]}
              >
                <T style={{ flex: 1 }}>{weak.label}</T>
                <T variant="small" style={{ color: p.accent }}>
                  Drill →
                </T>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      {mastery.length > 0 ? (
        <Card>
          <T variant="heading">Mastery</T>
          <View style={{ gap: space.md, marginTop: space.xs }}>
            {mastery.map((tag) => (
              <View key={tag.tag} style={{ gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="muted">{tag.label}</T>
                  <T variant="small">{Math.round(tag.progress * 100)}%</T>
                </Row>
                <ProgressBar value={tag.progress} />
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <LinkCard stats={stats} onChanged={onChanged} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={[styles.stat, { backgroundColor: p.surface, borderColor: p.line }]}>
      <T variant="small">{label}</T>
      <T variant="title">{value}</T>
    </View>
  );
}

function LinkCard({ stats, onChanged }: { stats: StatsResponse; onChanged: () => void }) {
  const { link } = stats;
  const p = usePalette();
  const [paused, setPaused] = useState(link.paused);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (next: boolean) => {
    setPaused(!next);
    setError(null);
    try {
      await setAgentPaused(!next);
      onChanged();
    } catch (toggleError) {
      setPaused(link.paused);
      setError(errorMessage(toggleError));
    }
  };

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">iMessage</T>
        <Pill label={link.linked ? 'Linked' : 'Not linked'} tone={link.linked ? 'good' : 'neutral'} />
      </Row>
      {link.linked ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="muted" style={{ flex: 1 }}>
            Text me due cards{link.handle ? ` at ${link.handle}` : ''}
          </T>
          <Switch value={!paused} onValueChange={toggle} trackColor={{ true: p.accentStrong }} />
        </Row>
      ) : (
        <T variant="muted">
          Text “link {link.linkCode ?? '····'}” to the Prepr number on iMessage to get micro-cards when they’re due.
        </T>
      )}
      {error ? <T variant="small" style={{ color: p.danger }}>{error}</T> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  mark: { width: 30, height: 30 },
  grade: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  gear: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { flexGrow: 1, flexBasis: '45%', borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: 2, borderCurve: 'continuous' },
  bars: { flexDirection: 'row', gap: space.sm, height: 130, marginTop: space.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '70%', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  weakRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: space.md },
});

/** This week's report card (the same one the agent texts on Sunday), with a link to the shareable PNG. */
function WeeklyReport({ url, refreshKey }: { url: string; refreshKey: number }) {
  const p = usePalette();
  const report = useLoad(fetchReportCard, String(refreshKey));
  const card: ReportCard | null = report.data ?? null;
  if (!card) return null;
  const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);
  return (
    <Card style={{ gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">Weekly report card</T>
        <View style={[styles.grade, { backgroundColor: p.accentStrong }]}>
          <T variant="heading" style={{ color: '#fff' }}>
            {card.grade}
          </T>
        </View>
      </Row>
      <T variant="muted">{card.headline}</T>
      <T variant="small">
        {card.reviews} reviews ({signed(card.reviewsDelta)} vs last week) · active {card.activeDays}/7
        {card.aiUse ? ` · AI-use ${card.aiUse.average}` : ''}
      </T>
      <Button label="Open shareable card" variant="secondary" onPress={() => void Linking.openURL(`${url}/report`)} />
    </Card>
  );
}
