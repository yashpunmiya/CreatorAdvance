import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { lastWorkspace } from '../src/lib/session';
import { SafeAreaView, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const stories = [
  { tag: 'YOUR WORK. YOUR MOMENT.', title: 'Great work deserves\nfaster payment.', body: 'Turn an approved brand invoice into an opportunity to get paid sooner.', action: 'See how it works' },
  { tag: 'A CLEAR PATH FORWARD', title: 'From delivered\nto paid.', body: 'Submit your invoice. Your brand confirms the payable. Approved investors can make offers you choose to accept.', action: 'Choose your workspace' },
];

export default function Welcome() {
  const [step, setStep] = useState(0);
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
  if (!ready) return <SafeAreaView style={s.safe}><Text style={[s.logo, { padding: 28 }]}>ca.</Text></SafeAreaView>;
  const story = stories[Math.min(step, 1)];
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <View style={s.header}><Text style={s.logo}>ca.</Text><Text style={s.badge}>SEPOLIA TESTNET</Text></View>
    {step < 2 ? <>
      <View style={s.art} accessible accessibilityLabel="An invoice moves from completed work to a financing offer">
        <Svg width="100%" height="260" viewBox="0 0 320 260"><Circle cx="160" cy="130" r="110" fill="none" stroke="#d3d9dd" /><Circle cx="160" cy="130" r="78" fill="none" stroke="#d3d9dd" /><Path d="M50 180 C130 180 120 70 270 70" stroke="#21374d" strokeWidth="3" fill="none" /></Svg>
        <View style={s.receipt}><Text style={s.muted}>WORK DELIVERED</Text><Text style={s.receiptTitle}>Your next chapter</Text><View style={s.rule}/><Text style={s.muted}>Invoice → approval → offers</Text></View>
      </View>
      <Text style={s.tag}>{story.tag}</Text><Text style={s.title}>{story.title}</Text><Text style={s.body}>{story.body}</Text>
      <View style={s.dots}>{[0,1,2].map(i=><View key={i} style={[s.dot,i===step && s.selected]}/>)}</View>
      <Pressable accessibilityRole="button" style={s.primary} onPress={()=>setStep(step+1)}><Text style={s.primaryText}>{story.action}  →</Text></Pressable>
      <Pressable accessibilityRole="button" style={s.link} onPress={()=>setStep(2)}><Text style={s.muted}>Already know your way? Get started</Text></Pressable>
    </> : <>
      <Text style={s.tag}>YOUR ACCOUNT, YOUR ACCESS</Text><Text style={s.title}>Sign in to continue.</Text><Text style={s.body}>Connect your Whitechain Sepolia wallet first. Your wallet identifies your account; workspace access depends on the permissions granted to it. You can manage eligible workspaces in Account.</Text>
      <Pressable accessibilityRole="button" style={s.primary} onPress={()=>router.replace('/workspace')}><Text style={s.primaryText}>Continue to wallet  →</Text></Pressable>
    </>}
    <Text style={s.footer}>Test tokens only · No real customer documents</Text>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#f4f5f7'},page:{flexGrow:1,padding:28,gap:20},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},logo:{fontSize:42,fontWeight:'800',letterSpacing:-3,color:'#17212b'},badge:{fontSize:10,letterSpacing:1.2,color:'#495563'},art:{height:280,justifyContent:'center'},receipt:{position:'absolute',alignSelf:'center',backgroundColor:'#fff',padding:24,borderRadius:18,borderWidth:1,borderColor:'#d7dce2',gap:18,transform:[{rotate:'-6deg'}]},receiptTitle:{fontSize:22,fontWeight:'700',color:'#17212b'},rule:{height:1,backgroundColor:'#d7dce2'},tag:{fontSize:10,fontWeight:'700',letterSpacing:1.6,color:'#617080'},title:{fontSize:36,lineHeight:43,fontWeight:'700',letterSpacing:-1.2,color:'#17212b'},body:{fontSize:15,lineHeight:24,color:'#495563'},muted:{fontSize:12,lineHeight:18,color:'#617080'},dots:{flexDirection:'row',gap:6},dot:{width:6,height:6,borderRadius:3,backgroundColor:'#d7dce2'},selected:{width:28,backgroundColor:'#21374d'},primary:{minHeight:56,justifyContent:'center',alignItems:'center',borderRadius:16,backgroundColor:'#21374d'},primaryText:{fontSize:16,fontWeight:'600',color:'#fff'},link:{padding:12,alignItems:'center'},choice:{padding:22,gap:10,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#d7dce2'},choiceTitle:{fontSize:22,fontWeight:'600',color:'#17212b'},footer:{fontSize:11,color:'#667482',marginTop:12}});
