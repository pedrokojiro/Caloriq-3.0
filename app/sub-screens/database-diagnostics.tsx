import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BaseScreen, Card } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { caloriqApi, DatabaseDiagnostics } from '../../src/services/api';

export default function DatabaseDiagnosticsScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DatabaseDiagnostics | null>(null);
  const [failed, setFailed] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    caloriqApi.getDatabaseDiagnostics(controller.signal)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        clearTimeout(timer);
        if (active) {
          setCheckedAt(new Date().toLocaleString('pt-BR'));
          setLoading(false);
        }
      });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  const connected = data?.database === 'connected';
  const statusColor = loading ? colors.textMuted : connected ? globalColors.primary : globalColors.danger;
  const statuses = [
    { label: 'API local', value: loading ? 'Verificando…' : data ? 'Conectada' : 'Não foi possível verificar' },
    { label: 'PostgreSQL', value: loading ? 'Aguardando…' : data ? connected ? 'Conectado' : 'Indisponível' : 'Não verificado' },
    { label: 'Banco de dados', value: data?.databaseName ?? '—' },
  ];

  return (
    <BaseScreen edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar ao perfil" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textMain }]}>Diagnóstico do banco</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.heading}>
            {loading ? <ActivityIndicator color={statusColor} /> : <Ionicons name={connected ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={30} color={statusColor} />}
            <Text accessibilityLiveRegion="polite" style={[styles.headingText, { color: colors.textMain }]}>
              {loading ? 'Consultando o servidor' : connected ? 'Conexão confirmada' : 'Conexão precisa de atenção'}
            </Text>
          </View>
          <Text style={[styles.description, { color: colors.textMuted }]}>Consulta real à API e ao PostgreSQL local. Esta tela não utiliza dados de demonstração.</Text>
          {statuses.map(({ label, value }) => (
            <View key={label} style={[styles.row, { borderTopColor: colors.borderColor }]}>
              <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
              <Text style={[styles.value, { color: colors.textMain }]}>{value}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={[styles.headingText, { color: colors.textMain }]}>Registros salvos</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>Total do usuário local, em todas as datas. Atualize após salvar uma refeição.</Text>
          {[
            { label: 'Refeições', value: data?.counts?.meals },
            { label: 'Ingredientes', value: data?.counts?.items },
            { label: 'Registros de água', value: data?.counts?.waterEntries },
          ].map(({ label, value }) => (
            <View key={label} style={[styles.row, { borderTopColor: colors.borderColor }]}>
              <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
              <Text style={[styles.count, { color: colors.textMain }]}>{value ?? '—'}</Text>
            </View>
          ))}
        </Card>

        {!loading && !connected && (
          <Text accessibilityLiveRegion="polite" style={[styles.description, { color: globalColors.danger }]}>
            {failed
              ? 'Não conseguimos consultar o diagnóstico. Confira se a API está rodando, se foi reiniciada após a atualização e se o endereço configurado está acessível neste aparelho.'
              : 'A API respondeu, mas a consulta ao banco falhou. Confira o serviço PostgreSQL, a configuração de conexão e a migração das tabelas.'}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loading, busy: loading }}
          disabled={loading}
          onPress={() => { setData(null); setFailed(false); setLoading(true); setAttempt((value) => value + 1); }}
          style={[styles.refresh, { backgroundColor: globalColors.primary, opacity: loading ? 0.6 : 1 }]}
        >
          <Text style={styles.refreshText}>{loading ? 'Verificando…' : 'Verificar conexão'}</Text>
        </Pressable>
        <Text style={[styles.note, { color: colors.textLight }]}>Última tentativa: {checkedAt ?? 'aguardando'}</Text>
        {data && <Text style={[styles.note, { color: colors.textLight }]}>Tempo da consulta no servidor: {data.latencyMs} ms</Text>}
        <Text style={[styles.note, { color: colors.textMuted }]}>Para apresentar: salve uma refeição, volte aqui e verifique a contagem. Reabra o aplicativo para demonstrar que os dados persistem.</Text>
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, borderBottomWidth: 1 },
  back: { padding: 10 },
  title: { flex: 1, fontSize: 20, fontWeight: '800' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 32, gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  headingText: { flexShrink: 1, fontSize: 18, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 21, marginVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderTopWidth: 1 },
  label: { flexShrink: 1, fontSize: 14 },
  value: { flexShrink: 1, fontSize: 14, fontWeight: '600' },
  count: { fontSize: 22, fontWeight: '800' },
  refresh: { minHeight: 48, padding: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
