import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen, Button, Card, Input } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/context/AuthContext';
import { caloriqApi, type AccountSession } from '../../src/services/api';
import { shareTextFile } from '../../src/services/share-file';

type Status = { kind: 'ok' | 'error'; text: string } | null;

const formatDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const errorText = (reason: unknown, fallback: string) => (reason instanceof Error ? reason.message : fallback);

export default function AccountScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { logout } = useAuth();
  const brandText = isDark ? '#3DD68C' : '#0E7A3E';
  const danger = isDark ? '#FF8A7A' : '#C4320A';

  const [sessions, setSessions] = useState<AccountSession[] | null>(null);
  const [sessionStatus, setSessionStatus] = useState<Status>(null);
  const [busySession, setBusySession] = useState<string | null>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<Status>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<Status>(null);

  const loadSessions = useCallback(async () => {
    try {
      setSessions((await caloriqApi.getSessions()).sessions);
    } catch (reason) {
      setSessionStatus({ kind: 'error', text: errorText(reason, 'Não foi possível carregar os aparelhos.') });
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    caloriqApi.getSessions()
      .then(result => { if (active) setSessions(result.sessions); })
      .catch(reason => {
        if (!active) return;
        setSessionStatus({ kind: 'error', text: errorText(reason, 'Não foi possível carregar os aparelhos.') });
        setSessions([]);
      });
    return () => { active = false; };
  }, []);

  const endSession = async (id: string) => {
    setBusySession(id);
    setSessionStatus(null);
    try {
      await caloriqApi.endSession(id);
      setSessions(current => current?.filter(item => item.id !== id) ?? null);
      setSessionStatus({ kind: 'ok', text: 'Sessão encerrada.' });
    } catch (reason) {
      setSessionStatus({ kind: 'error', text: errorText(reason, 'Não foi possível encerrar a sessão.') });
    } finally { setBusySession(null); }
  };

  const endOthers = async () => {
    setBusySession('others');
    setSessionStatus(null);
    try {
      const { ended } = await caloriqApi.endOtherSessions();
      setSessions(current => current?.filter(item => item.current) ?? null);
      setSessionStatus({ kind: 'ok', text: ended ? `${ended} sessão(ões) encerrada(s).` : 'Nenhum outro aparelho conectado.' });
    } catch (reason) {
      setSessionStatus({ kind: 'error', text: errorText(reason, 'Não foi possível encerrar as sessões.') });
    } finally { setBusySession(null); }
  };

  const savePassword = async () => {
    if (newPassword !== confirmPassword) return setPasswordStatus({ kind: 'error', text: 'As senhas novas não são iguais.' });
    setSavingPassword(true);
    setPasswordStatus(null);
    try {
      const { endedSessions } = await caloriqApi.changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordOpen(false);
      setPasswordStatus({ kind: 'ok', text: endedSessions ? `Senha alterada. Saímos da conta em ${endedSessions} outro(s) aparelho(s).` : 'Senha alterada.' });
      void loadSessions();
    } catch (reason) {
      setPasswordStatus({ kind: 'error', text: errorText(reason, 'Não foi possível alterar a senha.') });
    } finally { setSavingPassword(false); }
  };

  const exportData = async () => {
    setExporting(true);
    setExportStatus(null);
    try {
      const data = await caloriqApi.exportAccountData();
      const stamp = new Date().toISOString().slice(0, 10);
      await shareTextFile(`caloriq-dados-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json', 'Salvar meus dados do CaloriQ');
      setExportStatus({ kind: 'ok', text: 'Arquivo gerado. Escolha onde salvar ou com quem compartilhar.' });
    } catch (reason) {
      setExportStatus({ kind: 'error', text: errorText(reason, 'Não foi possível gerar o arquivo.') });
    } finally { setExporting(false); }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteStatus(null);
    try {
      await caloriqApi.deleteAccount(deletePassword);
      await logout().catch(() => undefined);
      router.replace('/(auth)/login');
    } catch (reason) {
      setDeleteStatus({ kind: 'error', text: errorText(reason, 'Não foi possível excluir a conta.') });
      setDeleting(false);
    }
  };

  const statusLine = (status: Status) => status ? (
    <Text style={[styles.status, { color: status.kind === 'ok' ? brandText : danger }]} accessibilityLiveRegion="polite">{status.text}</Text>
  ) : null;
  const sectionTitle = (text: string) => <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{text}</Text>;

  return (
    <BaseScreen edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={4}>
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Privacidade e conta</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.bgApp }]} keyboardShouldPersistTaps="handled">
        {sectionTitle('SEGURANÇA')}
        <Card style={styles.card}>
          <Pressable onPress={() => setPasswordOpen(open => !open)} style={styles.row} accessibilityRole="button" accessibilityState={{ expanded: passwordOpen }}>
            <Ionicons name="key-outline" size={22} color={brandText} />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.textMain }]}>Alterar senha</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>Você continua conectado neste aparelho.</Text>
            </View>
            <Ionicons name={passwordOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
          </Pressable>
          {passwordOpen ? (
            <View style={styles.form}>
              <Input label="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" />
              <Input label="Nova senha" value={newPassword} onChangeText={setNewPassword} placeholder="Mínimo de 8 caracteres" secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
              <Input label="Confirmar nova senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
              <Button title="Salvar nova senha" onPress={savePassword} loading={savingPassword} disabled={!currentPassword || newPassword.length < 8 || !confirmPassword} />
            </View>
          ) : null}
          {statusLine(passwordStatus)}
        </Card>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="phone-portrait-outline" size={22} color={brandText} />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.textMain }]}>Aparelhos conectados</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>Encerre o acesso de aparelhos que você não usa mais.</Text>
            </View>
          </View>
          {sessions === null ? <ActivityIndicator color={brandText} style={{ marginVertical: 12 }} /> : sessions.map(session => (
            <View key={session.id} style={[styles.session, { borderTopColor: colors.borderColor }]}>
              <View style={styles.rowText}>
                <Text style={[styles.sessionDevice, { color: colors.textMain }]} numberOfLines={2}>{session.device}</Text>
                <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>Último acesso: {formatDate(session.lastSeenAt)}</Text>
              </View>
              {session.current ? (
                <Text style={[styles.badge, { color: brandText, backgroundColor: isDark ? '#1A3030' : '#E8F7EF' }]}>Este aparelho</Text>
              ) : (
                <Pressable onPress={() => endSession(session.id)} disabled={busySession !== null} style={styles.textButton} accessibilityRole="button" accessibilityLabel={`Encerrar sessão em ${session.device}`}>
                  {busySession === session.id ? <ActivityIndicator color={danger} /> : <Text style={[styles.textButtonLabel, { color: danger }]}>Encerrar</Text>}
                </Pressable>
              )}
            </View>
          ))}
          {sessions && sessions.some(item => !item.current) ? (
            <Pressable onPress={endOthers} disabled={busySession !== null} style={[styles.outline, { borderColor: danger }]} accessibilityRole="button">
              {busySession === 'others' ? <ActivityIndicator color={danger} /> : <Text style={[styles.textButtonLabel, { color: danger }]}>Sair de todos os outros aparelhos</Text>}
            </Pressable>
          ) : null}
          {statusLine(sessionStatus)}
        </Card>

        {sectionTitle('SEUS DADOS')}
        <Card style={styles.card}>
          <Text style={[styles.rowTitle, { color: colors.textMain }]}>O que o CaloriQ guarda</Text>
          {[
            'Nome, e-mail e senha (somente como hash, nunca em texto).',
            'Perfil nutricional: peso, altura, idade, objetivo e metas.',
            'Refeições, itens, água e horários que você registra.',
            'Fotos enviadas para análise de refeições não são guardadas pelo servidor.',
            'Fotos de evolução só vão para a nuvem se você ativar "Guardar na nuvem".',
            'Aparelhos conectados, para você poder encerrar o acesso.',
          ].map(item => (
            <View key={item} style={styles.bullet}>
              <Ionicons name="checkmark-circle-outline" size={18} color={brandText} />
              <Text style={[styles.bulletText, { color: colors.textMuted }]}>{item}</Text>
            </View>
          ))}
          <Button title="Baixar meus dados (JSON)" onPress={exportData} loading={exporting} variant="outline" style={{ marginTop: 12 }} />
          {statusLine(exportStatus)}
        </Card>

        {sectionTitle('EXCLUIR CONTA')}
        <Card style={[styles.card, { borderColor: danger }]}>
          <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
            Apaga sua conta, refeições, água, metas e sessões de forma permanente. Baixe seus dados antes, se quiser guardar uma cópia.
          </Text>
          {deleteOpen ? (
            <View style={styles.form}>
              <Input label="Sua senha" value={deletePassword} onChangeText={setDeletePassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" />
              <Input label='Digite "EXCLUIR" para confirmar' value={deleteConfirm} onChangeText={setDeleteConfirm} autoCapitalize="characters" autoCorrect={false} />
              <Pressable
                onPress={deleteAccount}
                disabled={deleting || !deletePassword || deleteConfirm.trim().toUpperCase() !== 'EXCLUIR'}
                style={[styles.dangerBtn, { backgroundColor: danger, opacity: deleting || !deletePassword || deleteConfirm.trim().toUpperCase() !== 'EXCLUIR' ? 0.5 : 1 }]}
                accessibilityRole="button"
              >
                {deleting ? <ActivityIndicator color={isDark ? '#0D1117' : '#FFFFFF'} /> : <Text style={[styles.dangerLabel, { color: isDark ? '#0D1117' : '#FFFFFF' }]}>Excluir minha conta para sempre</Text>}
              </Pressable>
              <Pressable onPress={() => { setDeleteOpen(false); setDeletePassword(''); setDeleteConfirm(''); }} style={styles.textButton} accessibilityRole="button">
                <Text style={[styles.textButtonLabel, { color: colors.textMain }]}>Cancelar</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setDeleteOpen(true)} style={[styles.outline, { borderColor: danger }]} accessibilityRole="button">
              <Text style={[styles.textButtonLabel, { color: danger }]}>Excluir conta</Text>
            </Pressable>
          )}
          {statusLine(deleteStatus)}
        </Card>
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 8 },
  card: { padding: 16, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  rowSubtitle: { fontSize: 14, lineHeight: 20 },
  form: { marginTop: 12 },
  session: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, marginTop: 4 },
  sessionDevice: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  badge: { fontSize: 12, lineHeight: 16, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  textButton: { minHeight: 48, minWidth: 48, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  textButtonLabel: { fontSize: 14, fontWeight: '700' },
  outline: { minHeight: 48, borderWidth: 1.5, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 16 },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 8 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20 },
  status: { fontSize: 14, lineHeight: 20, marginTop: 10 },
  dangerBtn: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  dangerLabel: { fontSize: 16, fontWeight: '700' },
});
