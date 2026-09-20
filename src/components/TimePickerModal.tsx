import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { normalizeTime } from '../services/notifications';

type Props = {
  visible: boolean;
  title: string;
  initialTime: string | null;
  onClose: () => void;
  onConfirm: (time: string) => void;
};

export function TimePickerModal({ visible, title, initialTime, onClose, onConfirm }: Props) {
  const { colors, globalColors } = useTheme();
  const minuteRef = useRef<TextInput>(null);
  const [initialHour = '', initialMinute = ''] = initialTime?.split(':') ?? [];
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [error, setError] = useState('');

  const confirm = () => {
    const value = normalizeTime(hour, minute);
    if (!value) {
      setError('Informe um horário válido entre 00:00 e 23:59.');
      return;
    }
    onConfirm(value);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modal, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: `${globalColors.primary}18` }]}>
              <Ionicons name="time-outline" size={24} color={globalColors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.eyebrow, { color: globalColors.primary }]}>HORÁRIO DO LEMBRETE</Text>
              <Text style={[styles.title, { color: colors.textMain }]}>{title}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={23} color={colors.textLight} />
            </Pressable>
          </View>

          <Text style={[styles.helper, { color: colors.textLight }]}>Escolha quando você normalmente faz esta refeição.</Text>
          <View style={styles.timeRow}>
            <TextInput
              value={hour}
              onChangeText={value => {
                const digits = value.replace(/\D/g, '').slice(0, 2);
                setHour(digits);
                setError('');
                if (digits.length === 2 && Number(digits) <= 23) minuteRef.current?.focus();
              }}
              style={[styles.timeInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: error ? '#EF4444' : colors.borderColor }]}
              placeholder="08"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              accessibilityLabel="Hora"
            />
            <Text style={[styles.separator, { color: colors.textMain }]}>:</Text>
            <TextInput
              ref={minuteRef}
              value={minute}
              onChangeText={value => { setMinute(value.replace(/\D/g, '').slice(0, 2)); setError(''); }}
              style={[styles.timeInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: error ? '#EF4444' : colors.borderColor }]}
              placeholder="30"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              accessibilityLabel="Minutos"
            />
          </View>
          <View style={styles.legendRow}>
            <Text style={[styles.legend, { color: colors.textLight }]}>HORA</Text>
            <Text style={[styles.legend, { color: colors.textLight }]}>MINUTOS</Text>
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.confirmButton, { backgroundColor: globalColors.primary }]} onPress={confirm}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.confirmText}>Salvar horário</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(3, 7, 18, 0.72)', justifyContent: 'center', padding: 22 },
  modal: { borderRadius: 26, borderWidth: 1, padding: 22, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  helper: { fontSize: 13, lineHeight: 19 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 6 },
  timeInput: { width: 96, height: 82, borderRadius: 20, borderWidth: 1, textAlign: 'center', fontSize: 34, fontWeight: '800' },
  separator: { fontSize: 36, fontWeight: '800' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 104, marginTop: -8 },
  legend: { width: 70, textAlign: 'center', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  error: { color: '#EF4444', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  confirmButton: { height: 54, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  confirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
