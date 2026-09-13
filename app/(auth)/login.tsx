import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BaseScreen, Button, Input } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { globalColors } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError(''); setLoading(true);
    try { await login(email.trim(), password); router.replace('/(tabs)'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.'); }
    finally { setLoading(false); }
  };

  return <BaseScreen scrollable style={styles.screen} contentContainerStyle={styles.content}>
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient colors={[globalColors.primaryGlow, globalColors.primary]} style={styles.logo}><Text style={styles.logoText}>Q</Text></LinearGradient>
        <Text style={styles.title}>Entrar na conta</Text>
        <Text style={styles.subtitle}>Acesse seus dados alimentares</Text>
      </View>
      <Input label="E-mail" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address"
        autoCapitalize="none" autoCorrect={false} autoComplete="off" importantForAutofill="no" />
      <Input label="Senha" value={password} onChangeText={setPassword} placeholder="Digite sua senha" secureTextEntry={!showPassword}
        autoCapitalize="none" autoCorrect={false} autoComplete="off" importantForAutofill="no"
        rightIcon={<Text style={styles.eye}>{showPassword ? '👁️' : '🙈'}</Text>} onRightIconPress={() => setShowPassword(value => !value)} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Entrar" onPress={handleLogin} loading={loading} disabled={!email.trim() || !password} style={styles.button} />
      <Pressable onPress={() => router.push('/(auth)/register' as never)} style={styles.footer}>
        <Text style={styles.footerText}>Não tem conta? <Text style={{ color: globalColors.primary, fontWeight: '800' }}>Criar agora →</Text></Text>
      </Pressable>
    </View>
  </BaseScreen>;
}

const styles = StyleSheet.create({
  screen:{backgroundColor:'#FFFFFF'}, content:{paddingHorizontal:24,paddingVertical:36,flexGrow:1}, container:{flex:1,paddingTop:36},
  header:{marginBottom:32}, logo:{width:56,height:56,borderRadius:18,alignItems:'center',justifyContent:'center',marginBottom:22}, logoText:{color:'#FFF',fontSize:28,fontWeight:'900'},
  title:{fontSize:30,fontWeight:'900',color:'#0D1117',marginBottom:8}, subtitle:{fontSize:15,color:'#6B7585'}, eye:{fontSize:18},
  error:{color:'#D92D20',fontSize:13,marginTop:-4,marginBottom:14}, button:{marginTop:4}, footer:{alignItems:'center',padding:22}, footerText:{fontSize:14,color:'#6B7585'},
});
