import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { WorkspaceRole } from '../lib/session';

const copy = {
  CREATOR: ['Your work.\nYour next chapter.', 'Turn approved invoices into opportunities to get paid sooner.', 'Create an invoice', 'Your invoices'],
  BRAND: ['Good partnerships.\nClear commitments.', 'Review delivered work and keep your creator payments moving.', 'Manage payables', 'Payables'],
  INVESTOR: ['Put opportunity\nin perspective.', 'Explore approved receivables and decide what fits your risk.', 'Explore marketplace', 'Available invoices'],
  ADMIN: ['Trust starts\nwith oversight.', 'Review business evidence and manage platform access.', 'Open review queue', 'Review queue'],
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
      Animated.timing(opacity, { toValue: 1, duration: reduce ? 0 : 260, useNativeDriver: true }).start();
    }).catch(() => opacity.setValue(1));
    return () => { active = false; opacity.stopAnimation(); };
  }, [opacity]);
  const [title, description, action, metric] = copy[role];
  const pending = invoices.filter(i => i.status === 'PENDING_BRAND').length;
  const secondary = role === 'INVESTOR' ? offers.filter(o => o.status === 'ACTIVE').length : role === 'ADMIN' ? brands.filter(b => b.status === 'PENDING').length : pending;
  return <Animated.View style={{ opacity, gap: 20 }}>
    <View style={s.hero}><Text style={s.kicker}>{role} / OVERVIEW</Text><Text style={s.title}>{title}</Text><Text style={s.description}>{description}</Text>
      <Svg width="100%" height="90" viewBox="0 0 320 90" accessible={false}><Path d="M0 76 H320 M0 40 H320" stroke="#ffffff18"/><Path d="M8 73 C65 73 54 40 118 40 S210 68 250 30 S290 18 312 8" fill="none" stroke="#d5e0e8" strokeWidth="2"/><Circle cx="312" cy="8" r="5" fill="#fff"/></Svg>
      <Text style={s.caption}>A path from delivered work to payment · illustration</Text>
      <Pressable accessibilityRole="button" onPress={onOpen} style={s.cta}><Text style={s.ctaText}>{action}  ↗</Text></Pressable>
    </View>
    <View style={s.metrics}><View style={s.metric}><Text style={s.label}>{metric}</Text><Text style={s.value}>{loading ? '—' : role === 'ADMIN' ? brands.length : invoices.length}</Text></View><View style={s.metric}><Text style={s.label}>{role === 'INVESTOR' ? 'Active offers' : role === 'ADMIN' ? 'Pending reviews' : 'Awaiting approval'}</Text><Text style={s.value}>{loading ? '—' : secondary}</Text></View></View>
    <View style={s.heading}><Text style={s.section}>Your next step</Text><Pressable accessibilityRole="button" onPress={onRefresh}><Text style={s.link}>{loading ? 'Loading…' : 'Refresh ↻'}</Text></Pressable></View>
    <View style={s.next}><Text style={s.section}>{role === 'CREATOR' ? 'From completed work to a clear offer' : role === 'BRAND' ? 'Stay ahead of your payables' : role === 'INVESTOR' ? 'Review before you commit' : 'Review the evidence'}</Text><Text style={s.body}>{role === 'CREATOR' ? 'Choose an active brand, upload your payable, and track approval before comparing investor offers.' : role === 'BRAND' ? 'Complete verification, reserve collateral and review invoices from your creators.' : role === 'INVESTOR' ? 'Check the invoice terms, offer expiry and repayment risk. Your offer is escrowed onchain.' : 'Review business documents and verify the intended wallet before granting access.'}</Text></View>
    {!loading && !invoices.length && role !== 'ADMIN' ? <Text style={s.body}>Your activity will appear here as you complete your first transaction.</Text> : null}
  </Animated.View>;
}
const s = StyleSheet.create({hero:{padding:24,borderRadius:26,backgroundColor:'#21374d',gap:18},kicker:{color:'#bdcbd6',fontSize:10,letterSpacing:1.8,fontWeight:'700'},title:{color:'#fff',fontSize:32,lineHeight:38,fontWeight:'600',letterSpacing:-1},description:{color:'#d5e0e8',fontSize:15,lineHeight:23},caption:{color:'#bdcbd6',fontSize:10},cta:{minHeight:52,borderRadius:14,backgroundColor:'#fff',justifyContent:'center',paddingHorizontal:18},ctaText:{color:'#21374d',fontSize:15,fontWeight:'700'},metrics:{flexDirection:'row',gap:12},metric:{flex:1,padding:20,gap:12,backgroundColor:'#fff',borderRadius:20,borderWidth:1,borderColor:'#e2e6ea'},label:{color:'#617080',fontSize:12},value:{fontSize:34,color:'#17212b',fontWeight:'600'},heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},section:{fontSize:17,fontWeight:'600',color:'#17212b'},link:{color:'#21374d',fontSize:13,padding:10},next:{padding:22,gap:12,borderRadius:20,backgroundColor:'#fff'},body:{color:'#617080',fontSize:14,lineHeight:22}});
