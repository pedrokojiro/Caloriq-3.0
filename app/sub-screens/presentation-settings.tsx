import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BaseScreen, Card } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { readSettings, saveSettings } from '../../src/services/local-settings';
import { caloriqApi, getApiUrl } from '../../src/services/api';
import { GeminiServiceError, testGeminiConnection } from '../../src/services/gemini';

export default function PresentationSettings() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const [key, setKey] = useState('');
  const [url, setUrl] = useState('');
  const [effectiveUrl, setEffectiveUrl] = useState('');
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Carregando configurações…');
  useEffect(() => {
    let active = true;
    Promise.all([readSettings(), getApiUrl()]).then(([settings, address]) => {
      if (!active) return;
      setKey(settings.geminiKey); setUrl(settings.apiUrl); setEffectiveUrl(address);
      setReady(true); setMessage('');
    }).catch(() => { if (active) setMessage('Não foi possível ler as configurações. Reabra esta tela.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  async function run(action: 'save' | 'gemini' | 'database' | 'reset') {
    if (busy || !ready) return;
    setBusy(true); setMessage('Aguarde…');
    try {
      await saveSettings({ geminiKey: action === 'reset' ? '' : key, apiUrl: action === 'reset' ? '' : url });
      if (action === 'reset') { setKey(''); setUrl(''); }
      setEffectiveUrl(await getApiUrl());
      if (action === 'gemini') {
        await testGeminiConnection();
        setMessage('Configurações salvas. Gemini respondeu ao teste real.');
      } else if (action === 'database') {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const result = await caloriqApi.getDatabaseDiagnostics(controller.signal);
          setMessage(result.database === 'connected' ? 'Configurações salvas. API e PostgreSQL conectados.' : 'Configurações salvas. API acessível, mas PostgreSQL indisponível. Confira o notebook.');
        } finally { clearTimeout(timer); }
      } else setMessage(action === 'reset' ? 'Configuração deste aparelho removida. Voltamos aos valores do iniciador/.env.' : 'Configurações salvas e aplicadas.');
    } catch (error) {
      setMessage(error instanceof GeminiServiceError ? error.message : action === 'database' ? 'Falha ao salvar ou conectar. Confira o endereço, a API e a rede.' : 'Não foi possível salvar ou testar. Confira os campos, o armazenamento e a conexão.');
    } finally { setBusy(false); }
  }
  const inputStyle = [styles.input, { color: colors.textMain, borderColor: colors.borderColor, backgroundColor: colors.bgApp }];
  const button = (label: string, action: 'save' | 'gemini' | 'database' | 'reset') => (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !ready }} disabled={busy || !ready} onPress={() => void run(action)} style={[styles.button, { backgroundColor: globalColors.primary, opacity: busy || !ready ? 0.5 : 1 }]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
  return (
    <BaseScreen edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <BaseScreen scrollable edges={[]} contentContainerStyle={styles.content}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={{ color: globalColors.primary }}>← Voltar ao perfil</Text></Pressable>
          <Text style={[styles.title, { color: colors.textMain }]}>Configuração da apresentação</Text>
          <Card>
            <Text style={[styles.label, { color: colors.textMain }]}>Chave da API Gemini (visível)</Text>
            <Text style={{ color: colors.textMuted }}>Cole a chave abaixo. Ela fica salva neste aparelho/navegador, sem criptografia. Não mostre esta tela no projetor nem compartilhe prints.</Text>
            <TextInput accessibilityLabel="Chave da API Gemini visível" value={key} onChangeText={setKey} editable={!busy && ready} secureTextEntry={false} autoCapitalize="none" autoCorrect={false} style={inputStyle} placeholder="Cole sua chave aqui" placeholderTextColor={colors.textMuted} />
            <Text style={{ color: colors.textMuted }}>Se deixar vazio, será usada a chave do .env, se existir. O teste consome cota e não garante disponibilidade futura.</Text>
            {button('Salvar e testar Gemini', 'gemini')}
          </Card>
          <Card>
            <Text style={[styles.label, { color: colors.textMain }]}>Endereço do backend (opcional)</Text>
            <Text style={{ color: colors.textMuted }}>Deixe vazio para usar o endereço do iniciador. Se necessário, informe o IPv4 e a porta da API — não a porta do PostgreSQL.</Text>
            <TextInput accessibilityLabel="Endereço do backend" value={url} onChangeText={setUrl} editable={!busy && ready} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={inputStyle} placeholder="http://192.168.1.10:3333" placeholderTextColor={colors.textMuted} />
            <Text selectable style={{ color: colors.textMuted }}>Endereço salvo em uso: {effectiveUrl || '—'}</Text>
            <Text style={{ color: colors.textMuted }}>A senha do banco continua somente no notebook. Esta tela não instala nem inicia o servidor.</Text>
            {button('Salvar e testar banco', 'database')}
          </Card>
          {button('Salvar sem testar', 'save')}
          {button('Remover configurações deste aparelho', 'reset')}
          <Text accessibilityLiveRegion="polite" style={{ color: colors.textMain }}>{message}</Text>
        </BaseScreen>
      </KeyboardAvoidingView>
    </BaseScreen>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, width: '100%', maxWidth: 700, alignSelf: 'center' },
  title: { fontSize: 25, fontWeight: '700' }, label: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginVertical: 14, minHeight: 50, fontSize: 16 },
  button: { padding: 15, borderRadius: 12, marginTop: 10, minHeight: 48 },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, back: { paddingVertical: 12 },
});
