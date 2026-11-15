import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { Card } from './Card';
import { Button } from './Button';
import { useTheme } from '../hooks/useTheme';
import { caloriqApi } from '../services/api';
import { shareExistingFile, shareTextFile } from '../services/share-file';
import { deviceTimeZone } from '../utils/history';
import { buildReportCsv, buildReportHtml, PERIOD_LABELS, reportFileName, reportRange, type ReportPeriod } from '../utils/report';

type Format = 'pdf' | 'csv';

export function ReportExportCard({ initialPeriod, userName }: { initialPeriod: ReportPeriod; userName: string }) {
  const { colors } = useTheme();
  const brandText = colors.brandText;
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod);
  const [format, setFormat] = useState<Format>('pdf');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const generate = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const { from, to } = reportRange(period);
      const report = await caloriqApi.getReport(from.toISOString(), to.toISOString(), deviceTimeZone());
      if (!report.meals.length) {
        setStatus({ ok: false, text: 'Não há refeições registradas neste período.' });
        return;
      }
      if (format === 'csv') {
        await shareTextFile(reportFileName(period, 'csv'), buildReportCsv(report), 'text/csv', 'Salvar relatório (CSV)');
      } else {
        const html = buildReportHtml(report, { userName, periodLabel: PERIOD_LABELS[period] });
        if (Platform.OS === 'web') {
          await Print.printAsync({ html });
        } else {
          const { uri } = await Print.printToFileAsync({ html, base64: false });
          await shareExistingFile(uri, 'application/pdf', 'Salvar relatório (PDF)');
        }
      }
      setStatus({ ok: true, text: 'Relatório gerado. Escolha onde salvar ou com quem compartilhar.' });
    } catch (reason) {
      setStatus({ ok: false, text: reason instanceof Error ? reason.message : 'Não foi possível gerar o relatório.' });
    } finally {
      setLoading(false);
    }
  };

  const chip = (selected: boolean, label: string, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={[styles.chip, { borderColor: selected ? brandText : colors.inputBorder, backgroundColor: selected ? colors.aiTint : 'transparent' }]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, { color: selected ? brandText : colors.textMuted }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="document-text-outline" size={22} color={colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textMain }]}>Exportar relatório</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Leve seus registros para um nutricionista ou guarde uma cópia.</Text>
        </View>
      </View>
      <Text style={[styles.label, { color: colors.textMuted }]}>Período</Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map(value => chip(period === value, PERIOD_LABELS[value], () => setPeriod(value), value))}
      </View>
      <Text style={[styles.label, { color: colors.textMuted }]}>Formato</Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {chip(format === 'pdf', 'PDF · resumo e refeições', () => setFormat('pdf'), 'pdf')}
        {chip(format === 'csv', 'CSV · planilha', () => setFormat('csv'), 'csv')}
      </View>
      <Button title="Gerar relatório" onPress={generate} loading={loading} style={{ marginTop: 14 }} />
      {status ? <Text style={[styles.status, { color: status.ok ? brandText : colors.dangerText }]} accessibilityLiveRegion="polite">{status.text}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  titleRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
  status: { fontSize: 13, lineHeight: 18, marginTop: 12 },
});
