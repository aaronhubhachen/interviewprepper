import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, space, usePalette } from '@/lib/theme';

export function Screen({
  children,
  refreshing,
  onRefresh,
  scroll = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
}) {
  const p = usePalette();
  if (!scroll) {
    return <View style={[styles.fill, { backgroundColor: p.bg }]}>{children}</View>;
  }
  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: p.bg }]}
      contentContainerStyle={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={p.accent} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

/** Top-level screen without a native header (tab roots): pads for the status bar. */
export function TabScreen(props: Parameters<typeof Screen>[0]) {
  const p = usePalette();
  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: p.bg }]}>
      <Screen {...props} />
    </SafeAreaView>
  );
}

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'muted' | 'small' | 'eyebrow' | 'mono';

export function T({
  variant = 'body',
  style,
  children,
  numberOfLines,
  selectable,
}: {
  variant?: TextVariant;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const p = usePalette();
  const color =
    variant === 'muted' || variant === 'small' ? p.muted : variant === 'eyebrow' ? p.accent : variant === 'mono' ? p.muted : p.text;
  return (
    <Text style={[textStyles[variant], { color }, style]} numberOfLines={numberOfLines} selectable={selectable}>
      {children}
    </Text>
  );
}

export function Card({ children, style, highlight }: { children: ReactNode; style?: StyleProp<ViewStyle>; highlight?: boolean }) {
  const p = usePalette();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: p.surface, borderColor: highlight ? p.accent : p.line },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const inactive = disabled || loading;
  const bg = variant === 'primary' ? p.accentStrong : variant === 'secondary' ? p.raised : 'transparent';
  const fg = variant === 'primary' ? p.onAccent : variant === 'secondary' ? p.text : p.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: variant === 'secondary' ? p.lineStrong : 'transparent',
          opacity: inactive ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : null}
      <Text style={[styles.buttonLabel, { color: fg }]}>
        {icon ? `${icon}  ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'bad' }) {
  const p = usePalette();
  const colors = {
    neutral: { bg: p.raised, fg: p.muted, border: p.lineStrong },
    accent: { bg: 'transparent', fg: p.accent, border: p.accent },
    good: { bg: 'transparent', fg: p.accentSoft, border: p.accentSoft },
    warn: { bg: 'transparent', fg: p.accent, border: p.accent },
    bad: { bg: 'transparent', fg: p.danger, border: p.danger },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.pillText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

export function Field(props: TextInputProps & { minHeight?: number }) {
  const p = usePalette();
  const { minHeight = 110, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={p.faint}
      multiline
      textAlignVertical="top"
      {...rest}
      style={[styles.field, { minHeight, backgroundColor: p.field, borderColor: p.line, color: p.text }, style]}
    />
  );
}

export function ProgressBar({ value, style }: { value: number; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.track, { backgroundColor: p.track }, style]}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: p.accent, borderRadius: radius.pill }} />
    </View>
  );
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const p = usePalette();
  return (
    <Card style={{ borderColor: p.danger, gap: space.md }}>
      <T variant="heading">Something went wrong</T>
      <T variant="muted">{message}</T>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

export function Loading({ label }: { label?: string }) {
  const p = usePalette();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={p.accent} />
      {label ? <T variant="muted">{label}</T> : null}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Bullets({ items, marker = '•' }: { items: string[]; marker?: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: space.sm }}>
      {items.map((item, index) => (
        <View key={index} style={styles.bulletRow}>
          <Text style={[styles.bulletMarker, { color: p.accent }]}>{marker}</Text>
          <T variant="muted" style={{ flex: 1 }}>
            {item}
          </T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: { padding: space.lg, gap: space.lg, paddingBottom: 120 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderCurve: 'continuous' },
  button: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
    borderCurve: 'continuous',
  },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600' },
  field: { borderWidth: 1, borderRadius: radius.md, padding: space.md, fontSize: 16, lineHeight: 22 },
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  loading: { padding: space.xxl, alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  bulletRow: { flexDirection: 'row', gap: space.sm },
  bulletMarker: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
});

const textStyles = StyleSheet.create({
  display: { fontSize: 44, fontWeight: '800', letterSpacing: -1.5 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23 },
  muted: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  mono: { fontSize: 13, fontFamily: 'Menlo' },
});
