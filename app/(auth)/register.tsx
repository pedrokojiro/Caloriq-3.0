import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { BaseScreen, Button, Input } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter(); const { globalColors } = useTheme(); const { register } = useAuth();
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [weight,setWeight]=useState('');
  const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState('');
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const submit = async () => {
    if (password !== confirm) return setError('As senhas não são iguais.');
    setError(''); setLoading(true);
    try { await register({ name:name.trim(), email:email.trim(), password, weight:Number(weight.replace(',','.')) }); router.replace('/(tabs)'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar a conta.'); }
    finally { setLoading(false); }
  };
  return <BaseScreen scrollable style={styles.screen} contentContainerStyle={styles.content}>
    <View><Text style={styles.title}>Criar sua conta</Text><Text style={styles.subtitle}>Seus registros ficarão separados dos demais usuários.</Text></View>
    <View style={styles.form}>
      <Input label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" autoComplete="off" importantForAutofill="no" />
      <Input label="E-mail" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="off" importantForAutofill="no" />
      <Input label="Peso atual (kg)" value={weight} onChangeText={setWeight} placeholder="Ex.: 78" keyboardType="decimal-pad" autoComplete="off" importantForAutofill="no" />
      <Input label="Senha" value={password} onChangeText={setPassword} placeholder="Mínimo de 8 caracteres" secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" importantForAutofill="no" />
      <Input label="Confirmar senha" value={confirm} onChangeText={setConfirm} placeholder="Digite novamente" secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" importantForAutofill="no" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Criar conta" onPress={submit} loading={loading} disabled={!name.trim()||!email.trim()||!weight||password.length<8||!confirm} />
      <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.footer}><Text style={styles.footerText}>Já tem uma conta? <Text style={{color:globalColors.primary,fontWeight:'800'}}>Entrar</Text></Text></Pressable>
    </View>
  </BaseScreen>;
}
const styles=StyleSheet.create({screen:{backgroundColor:'#FFF'},content:{paddingHorizontal:24,paddingTop:48,paddingBottom:36,flexGrow:1},title:{fontSize:30,fontWeight:'900',color:'#0D1117',marginBottom:8},subtitle:{fontSize:15,lineHeight:21,color:'#6B7585'},form:{marginTop:28},error:{color:'#D92D20',fontSize:13,marginBottom:14},footer:{alignItems:'center',padding:22},footerText:{fontSize:14,color:'#6B7585'}});
