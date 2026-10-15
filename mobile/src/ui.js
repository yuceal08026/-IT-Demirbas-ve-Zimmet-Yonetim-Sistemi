import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { STATUS_LABELS } from './qr';

export const colors = {
  bg: '#f4f5f7',
  card: '#ffffff',
  text: '#16181d',
  muted: '#5d6470',
  border: '#dde0e5',
  primary: '#1d4ed8',
  danger: '#b42318',
  ok: '#067647',
  warn: '#b54708',
};

const STATUS_COLORS = { ACTIVE: colors.primary, IN_STOCK: colors.ok, DEFECTIVE: colors.danger };

export function Button({ title, onPress, variant = 'primary', disabled, busy }) {
  const style = [
    styles.button,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'danger' && styles.buttonDanger,
    (disabled || busy) && styles.buttonDisabled,
  ];
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || busy} style={style}>
      {busy ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonTextSecondary]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || colors.muted;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{STATUS_LABELS[status] || status}</Text>
    </View>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted },
  h2: { fontSize: 17, fontWeight: '600', color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, color: colors.text, backgroundColor: '#fff',
  },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 13, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  buttonSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonTextSecondary: { color: colors.primary },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  muted: { color: colors.muted, fontSize: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
});
