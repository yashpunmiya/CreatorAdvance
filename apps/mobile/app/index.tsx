import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { lastWorkspace } from '../src/lib/session';
import { colors, spacing } from '../src/theme';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

type EntryStep = 0 | 1 | 2;

export default function Welcome() {
  const [step, setStep] = useState<EntryStep>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void lastWorkspace().then(role => {
      if (!active) return;
      if (role) router.replace({ pathname: '/workspace', params: { role } });
      else setReady(true);
    }).catch(() => setReady(true));
    return () => { active = false; };
  }, []);

  if (!ready) return <SafeAreaView style={s.safe}><View style={s.loading}><Text style={s.logo}>CreatorAdvance</Text><View style={s.loadingMark}/></View></SafeAreaView>;

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        {step === 0 ? <View style={s.logoRow}><View style={s.logoMark}><Text style={s.logoMarkText}>ca</Text><View style={s.logoDot}/></View><Text style={s.logo}>CreatorAdvance</Text></View> : <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => setStep(step === 2 ? 1 : 0)} style={s.back}><Text style={s.backText}>←</Text></Pressable>}
        <View style={s.networkPill}><View style={s.networkDot}/><Text style={s.networkText}>SEPOLIA</Text></View>
      </View>

      {step === 0 ? <>
        <View style={s.heroArt} accessible accessibilityLabel="Approved invoice with financing offers">
          <Svg width="100%" height="100%" viewBox="0 0 360 260" style={StyleSheet.absoluteFill}>
            <Circle cx="181" cy="130" r="112" fill="none" stroke="#ffffff1c" strokeWidth="1"/>
            <Circle cx="181" cy="130" r="83" fill="none" stroke="#ffffff18" strokeWidth="1"/>
            <Path d="M24 190 C102 190 94 62 178 62 S254 202 334 202" fill="none" stroke="#e7b681" strokeWidth="2" strokeDasharray="5 8"/>
            <Circle cx="178" cy="62" r="5" fill="#e7b681"/>
            <Circle cx="334" cy="202" r="5" fill="#e7b681"/>
          </Svg>
          <View style={s.approvedPill}><View style={s.approvedDot}/><Text style={s.approvedText}>BRAND APPROVED</Text></View>
          <View style={s.invoiceCard}>
            <View style={s.invoiceTop}><Text style={s.invoiceLabel}>CREATOR INVOICE</Text><Text style={s.invoiceNumber}># 0042</Text></View>
            <Text style={s.invoiceAmount}>1,250.00 <Text style={s.invoiceCurrency}>USDT</Text></Text>
            <View style={s.invoiceRule}/>
            <View style={s.invoiceBottom}><Text style={s.invoiceCaption}>Delivery confirmed</Text><View style={s.approvedStamp}><Text style={s.approvedStampText}>✓</Text></View></View>
          </View>
          <View style={s.offerPill}><Text style={s.offerPillIcon}>↗</Text><Text style={s.offerPillText}>Offers, on your terms</Text></View>
        </View>

        <View style={s.introCopy}>
          <Text style={s.eyebrow}>CREATOR FINANCE, WITH CLARITY</Text>
          <Text style={s.headline}>Turn approved invoices into opportunity.</Text>
          <Text style={s.body}>Track approval, review financing offers, and choose when to accept.</Text>
        </View>

        <View style={s.actions}>
          <PrimaryButton title="Get started" onPress={() => setStep(2)} />
          <Pressable accessibilityRole="button" onPress={() => setStep(1)} style={s.secondaryButton}><Text style={s.secondaryText}>See how it works <Text style={s.arrow}>→</Text></Text></Pressable>
        </View>
      </> : step === 1 ? <>
        <View style={s.flowIntro}>
          <Text style={s.eyebrow}>A SIMPLE, VISIBLE FLOW</Text>
          <Text style={s.headline}>From delivered work to a clear choice.</Text>
          <Text style={s.body}>Every step has a status, and every offer stays yours to accept or decline.</Text>
        </View>
        <View style={s.flowCard}>
          {[
            { n: '01', title: 'Submit your invoice', detail: 'Attach delivery proof, the campaign brief, and your invoice.' },
            { n: '02', title: 'Brand confirms the work', detail: 'Approval is recorded on Whitechain and the invoice status updates.' },
            { n: '03', title: 'Review financing offers', detail: 'Compare offers from approved investors and decide for yourself.' },
          ].map((item, index) => <View key={item.n} style={s.flowStep}>
            <View style={[s.stepNumber, index === 0 && s.stepNumberActive]}><Text style={[s.stepNumberText, index === 0 && s.stepNumberTextActive]}>{item.n}</Text></View>
            <View style={s.flowCopy}><Text style={s.flowTitle}>{item.title}</Text><Text style={s.flowDetail}>{item.detail}</Text></View>
            {index < 2 ? <View style={s.flowLine}/> : null}
          </View>)}
        </View>
        <View style={s.actions}>
          <PrimaryButton title="Continue to wallet" onPress={() => setStep(2)} />
          <Pressable accessibilityRole="button" onPress={() => setStep(0)} style={s.secondaryButton}><Text style={s.secondaryText}>Back to overview</Text></Pressable>
        </View>
      </> : <>
        <View style={s.accessHero}>
          <View style={s.accessIcon}><View style={s.accessIconInner}/><View style={s.accessIconDot}/></View>
          <Text style={s.eyebrow}>WALLET SIGN-IN · WHITECHAIN SEPOLIA</Text>
          <Text style={s.headline}>Your wallet. Your workspace.</Text>
          <Text style={s.body}>Connect the wallet you use for CreatorAdvance. A message signature verifies your account; signing in does not move funds.</Text>
        </View>
        <View style={s.securityCard}>
          <Text style={s.securityTitle}>What to expect</Text>
          <View style={s.securityRow}><View style={s.checkMark}><Text style={s.checkText}>✓</Text></View><Text style={s.securityText}>Connect on Whitechain Sepolia</Text></View>
          <View style={s.securityRow}><View style={s.checkMark}><Text style={s.checkText}>✓</Text></View><Text style={s.securityText}>Sign a message to verify your wallet</Text></View>
          <View style={s.securityRow}><View style={s.checkMark}><Text style={s.checkText}>✓</Text></View><Text style={s.securityText}>No payment transaction to sign in</Text></View>
        </View>
        <View style={s.actions}>
          <PrimaryButton title="Continue to wallet" onPress={() => router.replace('/workspace')} />
          <Pressable accessibilityRole="button" onPress={() => setStep(1)} style={s.secondaryButton}><Text style={s.secondaryText}>Review how it works</Text></Pressable>
        </View>
      </>}

      <View style={s.footer}><View style={s.footerRule}/><Text style={s.footerText}>TEST NETWORK · TEST TOKENS ONLY</Text></View>
    </ScrollView>
  </SafeAreaView>;
}

function PrimaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}><Text style={s.primaryText}>{title}</Text><Text style={s.primaryArrow}>↗</Text></Pressable>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  page: { flexGrow: 1, paddingHorizontal: spacing.page, paddingTop: 10, paddingBottom: 24, gap: 22 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  loadingMark: { width: 28, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  header: { minHeight: 42, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoMark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.action, position: 'relative' },
  logoMarkText: { color: '#fffaf2', fontSize: 17, fontWeight: '800', letterSpacing: -1.2 },
  logoDot: { position: 'absolute', right: 5, bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  logo: { color: colors.ink, fontSize: 17, fontWeight: '700', letterSpacing: -0.6 },
  networkPill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7 },
  networkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6b9876' },
  networkText: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  back: { width: 40, height: 40, justifyContent: 'center' }, backText: { color: colors.ink, fontSize: 27 },
  heroArt: { height: 248, borderRadius: 26, overflow: 'hidden', backgroundColor: colors.action, position: 'relative', justifyContent: 'center' },
  approvedPill: { position: 'absolute', top: 17, left: 17, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 15, backgroundColor: '#ffffff18', borderWidth: 1, borderColor: '#ffffff25' },
  approvedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }, approvedText: { color: '#e1ebe5', fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  invoiceCard: { marginHorizontal: 25, marginTop: 9, padding: 17, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#ffffff70', gap: 12, transform: [{ rotate: '-2deg' }] },
  invoiceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, invoiceLabel: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 }, invoiceNumber: { color: colors.quiet, fontSize: 10 },
  invoiceAmount: { color: colors.ink, fontSize: 27, fontWeight: '700', letterSpacing: -0.8 }, invoiceCurrency: { color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0 }, invoiceRule: { height: 1, backgroundColor: colors.border },
  invoiceBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, invoiceCaption: { color: colors.muted, fontSize: 11 }, approvedStamp: { width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5eee7' }, approvedStampText: { color: colors.action, fontSize: 12, fontWeight: '700' },
  offerPill: { position: 'absolute', bottom: 15, right: 16, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 15, backgroundColor: colors.accent }, offerPillIcon: { color: colors.ink, fontSize: 13, fontWeight: '700' }, offerPillText: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  introCopy: { gap: 10 }, eyebrow: { color: colors.action, fontSize: 10, fontWeight: '700', letterSpacing: 1.3 }, headline: { color: colors.ink, fontSize: 31, lineHeight: 36, fontWeight: '700', letterSpacing: -1 }, body: { color: colors.text, fontSize: 14, lineHeight: 21 },
  actions: { gap: 5 }, primaryButton: { minHeight: 54, paddingHorizontal: 17, borderRadius: 15, backgroundColor: colors.action, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, primaryText: { color: '#fffaf2', fontSize: 15, fontWeight: '700' }, primaryArrow: { color: colors.accent, fontSize: 19, fontWeight: '600' }, pressed: { opacity: 0.86 },
  secondaryButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, secondaryText: { color: colors.muted, fontSize: 13, fontWeight: '600' }, arrow: { color: colors.action, fontWeight: '700' },
  footer: { marginTop: 'auto', gap: 10, alignItems: 'center' }, footerRule: { height: 1, alignSelf: 'stretch', backgroundColor: colors.border }, footerText: { color: colors.quiet, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  flowIntro: { gap: 11, paddingTop: 22, paddingBottom: 4 },
  flowCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 18 },
  flowStep: { minHeight: 92, flexDirection: 'row', alignItems: 'flex-start', gap: 13, position: 'relative' },
  stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border, zIndex: 1 },
  stepNumberActive: { backgroundColor: colors.action, borderColor: colors.action }, stepNumberText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, stepNumberTextActive: { color: '#fffaf2' },
  flowCopy: { flex: 1, gap: 5, paddingTop: 2 }, flowTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' }, flowDetail: { color: colors.muted, fontSize: 12, lineHeight: 18 }, flowLine: { position: 'absolute', left: 15, top: 32, bottom: 0, width: 1, backgroundColor: colors.border },
  accessHero: { paddingTop: 25, gap: 14 }, accessIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#e3ebe4', alignItems: 'center', justifyContent: 'center', marginBottom: 4, position: 'relative' },
  accessIconInner: { width: 23, height: 20, borderWidth: 2, borderColor: colors.action, borderRadius: 6 }, accessIconDot: { position: 'absolute', top: 13, width: 23, height: 12, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: colors.action, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  securityCard: { padding: 17, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 13 }, securityTitle: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, checkMark: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5eee7', alignItems: 'center', justifyContent: 'center' }, checkText: { color: colors.action, fontSize: 11, fontWeight: '800' }, securityText: { color: colors.text, fontSize: 12, flex: 1 },
});
