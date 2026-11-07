import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { WorkspaceRole } from '../lib/session';
import { colors } from '../theme';

// Visual direction adapted from Unslop by Damir Sokolovsky (CC BY 4.0).
const content = {
  CREATOR: { title: 'Your work, moving forward', subtitle: 'Follow every invoice from delivery to funding.', action: 'Create an invoice', primary: 'Invoices', next: 'Submit your next invoice' },
  BRAND: { title: 'Payables, in view', subtitle: 'Review delivered work and keep creator payments moving.', action: 'Review payables', primary: 'Invoices to review', next: 'Review an invoice' },
  INVESTOR: { title: 'Capital with context', subtitle: 'Compare approved receivables before making an offer.', action: 'Explore invoices', primary: 'Available invoices', next: 'Review your opportunities' },
  ADMIN: { title: 'Platform overview', subtitle: 'Review business evidence and monitor platform activity.', action: 'Open review queue', primary: 'Companies', next: 'Continue your review' },
} as const;

const dashboardPalette = {
  CREATOR: { hero: '#234c3c', eyebrow: '#c1d5cc', refresh: '#f3d4b0', subtitle: '#d3ded8', accent: '#e7b681', accentInk: '#263b32' },
  BRAND: { hero: '#263d58', eyebrow: '#c7d8eb', refresh: '#f2c894', subtitle: '#d8e2ed', accent: '#f0c28b', accentInk: '#2e3b4b' },
  INVESTOR: { hero: '#53385f', eyebrow: '#dfcbe9', refresh: '#f4d298', subtitle: '#e9dfee', accent: '#e5c6ec', accentInk: '#44314c' },
  ADMIN: { hero: '#344750', eyebrow: '#c6dedb', refresh: '#e5cf9c', subtitle: '#d9e4e2', accent: '#c5ded8', accentInk: '#2c4145' },
} as const;

export function Dashboard({ role, invoices, offers, brands, loading, onOpen, onRefresh }: {
  role: WorkspaceRole; invoices: { id: string; status: string }[]; offers: { status: string }[];
  brands: { status?: string }[]; loading: boolean; onOpen: () => void; onRefresh: () => void;
}) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!active) return;
      Animated.timing(opacity, { toValue: 1, duration: reduce ? 0 : 240, useNativeDriver: true }).start();
    }).catch(() => opacity.setValue(1));
    return () => { active = false; opacity.stopAnimation(); };
  }, [opacity]);

  const copy = content[role];
  const palette = dashboardPalette[role];
  const pending = invoices.filter(item => item.status === 'PENDING_BRAND').length;
  const financeable = invoices.filter(item => item.status === 'FINANCEABLE').length;
  const secondary = role === 'INVESTOR' ? offers.filter(item => item.status === 'ACTIVE').length : role === 'ADMIN' ? brands.filter(item => item.status === 'PENDING').length : role === 'BRAND' ? brands.filter(item => item.status === 'ACTIVE').length : pending;
  const count = role === 'ADMIN' ? brands.length : role === 'INVESTOR' ? financeable : role === 'BRAND' ? pending : invoices.length;
  const label = role === 'INVESTOR' ? 'Active offers' : role === 'ADMIN' ? 'Awaiting review' : role === 'BRAND' ? 'Active companies' : 'Awaiting brand review';

  return <Animated.View style={{ opacity, gap: 18 }}>
    <View style={[s.hero, { backgroundColor: palette.hero }]}>
      <View style={s.heroTop}><Text style={[s.eyebrow, { color: palette.eyebrow }]}>WHITECHAIN SEPOLIA</Text><Pressable accessibilityRole="button" onPress={onRefresh} hitSlop={10}><Text style={[s.refresh, { color: palette.refresh }]}>{loading ? 'Updating…' : 'Refresh'}</Text></Pressable></View>
      <Text style={s.title}>{copy.title}</Text>
      <Text style={[s.subtitle, { color: palette.subtitle }]}>{copy.subtitle}</Text>
      <View style={s.heroRule} />
      <View style={s.metricRow}>
        <View><Text style={s.heroValue}>{loading ? '—' : count}</Text><Text style={s.heroLabel}>{copy.primary}</Text></View>
        <View style={s.metricDivider} />
        <View><Text style={s.heroValue}>{loading ? '—' : secondary}</Text><Text style={s.heroLabel}>{label}</Text></View>
      </View>
      <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [s.cta, { backgroundColor: palette.accent }, pressed && s.pressed]}><Text style={[s.ctaText, { color: palette.accentInk }]}>{copy.action}</Text><Text style={[s.arrow, { color: palette.accentInk }]}>↗</Text></Pressable>
    </View>

    <View style={s.sectionHead}><Text style={s.sectionTitle}>Your workflow</Text><Text style={s.sectionNote}>A clear view of what happens next</Text></View>
    <View style={s.workflow}>
      {[
        { number: '01', title: role === 'BRAND' ? 'Review delivery' : role === 'INVESTOR' ? 'Compare receivables' : role === 'ADMIN' ? 'Review company evidence' : 'Submit delivered work', detail: role === 'BRAND' ? 'Check the invoice and delivery evidence.' : role === 'INVESTOR' ? 'Review terms, due dates and risk.' : role === 'ADMIN' ? 'Inspect registrations and application status.' : 'Add an invoice with its supporting documents.' },
        { number: '02', title: role === 'BRAND' ? 'Approve onchain' : role === 'INVESTOR' ? 'Make an offer' : role === 'ADMIN' ? 'Activate verified businesses' : 'Track brand approval', detail: role === 'BRAND' ? 'Sign the approval, then watch the status update.' : role === 'INVESTOR' ? 'Your approved offer is held in escrow.' : role === 'ADMIN' ? 'Verify the business record on Whitechain.' : 'See the confirmed approval on Whitechain.' },
        { number: '03', title: role === 'ADMIN' ? 'Monitor platform activity' : 'Follow funding', detail: role === 'ADMIN' ? 'Keep company records aligned with confirmed chain events.' : 'Every confirmed transaction is reflected in the invoice timeline.' },
      ].map((step, index) => <View key={step.number} style={s.step}>
        <View style={[s.stepNumber, index === 0 && s.stepCurrent, index === 0 && { backgroundColor: palette.hero, borderColor: palette.hero }]}><Text style={[s.stepNumberText, index === 0 && s.stepCurrentText]}>{step.number}</Text></View>
        <View style={s.stepCopy}><Text style={s.stepTitle}>{step.title}</Text><Text style={s.stepDetail}>{step.detail}</Text></View>
        {index < 2 ? <View style={s.stepLine} /> : null}
      </View>)}
    </View>

    {!loading && !invoices.length && role !== 'ADMIN' ? <Pressable accessibilityRole="button" onPress={onOpen} style={s.empty}><Text style={s.emptyTitle}>{copy.next}</Text><Text style={s.emptyText}>Nothing here yet. Open your workspace to get started.</Text><Text style={[s.emptyLink, { color: palette.hero }]}>{copy.action}  →</Text></Pressable> : null}
  </Animated.View>;
}

const s = StyleSheet.create({
  hero: { padding: 22, borderRadius: 24, backgroundColor: colors.action, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#c1d5cc', fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
  refresh: { color: '#f3d4b0', fontSize: 13, fontWeight: '600', padding: 6 },
  title: { color: '#fffaf2', fontSize: 29, lineHeight: 35, fontWeight: '600', letterSpacing: -0.6 },
  subtitle: { color: '#d3ded8', fontSize: 14, lineHeight: 21, maxWidth: 300 }, heroRule: { height: 1, backgroundColor: '#ffffff25', marginTop: 4 },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 22 }, heroValue: { color: '#fffaf2', fontSize: 28, fontWeight: '600' }, heroLabel: { color: '#c1d5cc', fontSize: 12, marginTop: 2 }, metricDivider: { width: 1, height: 42, backgroundColor: '#ffffff30' },
  cta: { marginTop: 4, minHeight: 50, borderRadius: 14, paddingHorizontal: 16, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, ctaText: { color: '#263b32', fontSize: 14, fontWeight: '700' }, arrow: { color: '#263b32', fontSize: 18, fontWeight: '600' }, pressed: { opacity: 0.84 },
  sectionHead: { gap: 3, marginTop: 4 }, sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '600' }, sectionNote: { color: colors.muted, fontSize: 13 },
  workflow: { padding: 18, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 0 }, step: { flexDirection: 'row', gap: 13, minHeight: 70, position: 'relative' }, stepNumber: { height: 30, width: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, zIndex: 1 }, stepCurrent: { backgroundColor: colors.action, borderColor: colors.action }, stepNumberText: { color: colors.muted, fontSize: 11, fontWeight: '600' }, stepCurrentText: { color: '#fff' }, stepCopy: { flex: 1, paddingTop: 2, gap: 3 }, stepTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' }, stepDetail: { color: colors.muted, fontSize: 12, lineHeight: 17 }, stepLine: { position: 'absolute', left: 14, top: 30, bottom: -1, width: 1, backgroundColor: colors.border },
  empty: { padding: 18, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, gap: 8 }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' }, emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19 }, emptyLink: { color: colors.action, fontSize: 13, fontWeight: '700', marginTop: 4 },
});
