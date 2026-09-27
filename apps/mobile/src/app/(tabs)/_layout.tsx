import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { usePalette } from '@/lib/theme';

export default function TabsLayout() {
  const p = usePalette();
  return (
    <NativeTabs tintColor={p.accent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Label>Review</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'rectangle.on.rectangle', selected: 'rectangle.fill.on.rectangle.fill' }} md="style" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="practice">
        <NativeTabs.Trigger.Label>Practice</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chevron.left.forwardslash.chevron.right" md="code" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="spar">
        <NativeTabs.Trigger.Label>Behavioral</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'mic', selected: 'mic.fill' }} md="mic" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="grill">
        <NativeTabs.Trigger.Label>Grill</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'flame', selected: 'flame.fill' }} md="local_fire_department" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
