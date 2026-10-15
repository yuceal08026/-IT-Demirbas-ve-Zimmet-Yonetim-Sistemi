import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { formatDate } from '../qr';
import { Button, ErrorText, Row, StatusBadge, colors, styles } from '../ui';

/**
 * Cihaz detayı ve saha işlemleri.
 * - Personel: yalnızca kendi üzerindeki cihazı görebilir; başkasının cihazında API 404 döner (varlık sızdırılmaz).
 * - Yönetici: Teslim et / Geri al / Arıza bildir. Yetki kontrolü backend'de yapılır; burada yalnızca görünürlük yönetilir.
 */
export default function AssetScreen({ api, user, target, onClose }) {
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [panel, setPanel] = useState(null); // 'assign' | 'return' | 'fault'
  const isAdmin = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const path = target.code ? `/assets/by-code/${encodeURIComponent(target.code)}` : `/assets/${target.id}`;
      setAsset(await api.get(path));
    } catch (err) {
      setAsset(null);
      setError(err.status === 404 ? 'Cihaz bulunamadı veya bu cihazı görme yetkiniz yok.' : err.message);
    } finally {
      setLoading(false);
    }
  }, [api, target]);

  useEffect(() => { load(); }, [load]);

  async function done(message) {
    setPanel(null);
    setNotice(message);
    await load();
  }

  const assignment = asset?.current_assignment;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}><Text style={styles.link}>‹ Geri</Text></Pressable>
        <Text style={styles.headerTitle}>{asset?.asset_code || target.code || 'Cihaz'}</Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading && <Text style={styles.muted}>Yükleniyor…</Text>}
        <ErrorText>{error}</ErrorText>
        {notice ? <Text style={{ color: colors.ok, fontSize: 15 }}>{notice}</Text> : null}

        {asset && (
          <>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.h2}>{`${asset.brand} ${asset.model}`}</Text>
                <StatusBadge status={asset.status} />
              </View>
              <Row label="Kategori" value={asset.category} />
              <Row label="Seri no" value={asset.serial_number} />
              <Row label="Alım tarihi" value={formatDate(asset.purchase_date)} />
              <Row label="Garanti bitişi" value={formatDate(asset.warranty_end_date)} />
              {!asset.is_active && <Text style={{ color: colors.warn }}>Bu cihaz pasife alınmış.</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.h2}>Zimmet</Text>
              {assignment ? (
                <>
                  <Row label="Kimde" value={assignment.user.ad_soyad} />
                  <Row label="Departman" value={assignment.user.department?.name} />
                  <Row label="Teslim tarihi" value={formatDate(assignment.assigned_at)} />
                </>
              ) : (
                <Text style={styles.muted}>Cihaz kimseye zimmetli değil.</Text>
              )}
            </View>

            {isAdmin && asset.is_active && !panel && (
              <View style={{ gap: 10 }}>
                {asset.status === 'IN_STOCK' && <Button title="Teslim et" onPress={() => { setNotice(''); setPanel('assign'); }} />}
                {assignment && <Button title="Geri kabul et" onPress={() => { setNotice(''); setPanel('return'); }} />}
                <Button title="Arıza bildir" variant="secondary" onPress={() => { setNotice(''); setPanel('fault'); }} />
              </View>
            )}

            {panel === 'assign' && <AssignPanel api={api} asset={asset} onCancel={() => setPanel(null)} onDone={done} />}
            {panel === 'return' && assignment && (
              <ReturnPanel api={api} assignment={assignment} onCancel={() => setPanel(null)} onDone={done} />
            )}
            {panel === 'fault' && <FaultPanel api={api} asset={asset} onCancel={() => setPanel(null)} onDone={done} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Teslim: personel ara → seç → onayla. Çakışan zimmet backend'de engellenir (409 ASSET_ALREADY_ASSIGNED). */
function AssignPanel({ api, asset, onCancel, onDone }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/users', { search: search.trim(), is_active: 'true', limit: 10, sort: 'ad_soyad', order: 'asc' });
        if (!cancelled) setUsers(res?.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [api, search]);

  async function submit() {
    if (!selected) return setError('Personel seçin.');
    setBusy(true);
    setError('');
    try {
      await api.post('/assignments', { asset_id: asset.id, user_id: selected.id, note: note.trim() || undefined });
      await onDone(`${asset.asset_code}, ${selected.ad_soyad} adlı personele teslim edildi.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.h2}>Teslim et</Text>
      <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Personel ara (ad veya e-posta)" autoCorrect={false} />
      {users.map((u) => (
        <Pressable
          key={u.id}
          onPress={() => setSelected(u)}
          style={{ paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: selected?.id === u.id ? '#e0e7ff' : 'transparent' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600' }}>{u.ad_soyad}</Text>
          <Text style={styles.muted}>{[u.email, u.department?.name || u.department_name].filter(Boolean).join(' · ')}</Text>
        </Pressable>
      ))}
      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Not (isteğe bağlı)" maxLength={500} />
      <ErrorText>{error}</ErrorText>
      <Button title={selected ? `${selected.ad_soyad} adlı personele teslim et` : 'Personel seçin'} onPress={submit} busy={busy} disabled={!selected} />
      <Button title="Vazgeç" variant="secondary" onPress={onCancel} />
    </View>
  );
}

/** Geri kabul: cihaz depoya veya arızalı olarak döner. */
function ReturnPanel({ api, assignment, onCancel, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function confirm(condition) {
    const label = condition === 'DEFECTIVE' ? 'arızalı olarak' : 'depoya';
    Alert.alert('İadeyi onaylayın', `Cihaz ${assignment.user.ad_soyad} adlı personelden ${label} geri alınacak.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Onayla', onPress: () => submit(condition) },
    ]);
  }

  async function submit(condition) {
    setBusy(true);
    setError('');
    try {
      await api.post(`/assignments/${assignment.id}/return`, { condition, return_note: note.trim() || undefined });
      await onDone(condition === 'DEFECTIVE' ? 'Cihaz arızalı olarak geri alındı.' : 'Cihaz depoya geri alındı.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.h2}>Geri kabul et</Text>
      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="İade notu (isteğe bağlı)" maxLength={500} />
      <ErrorText>{error}</ErrorText>
      <Button title="Sağlam: depoya al" onPress={() => confirm('IN_STOCK')} busy={busy} />
      <Button title="Arızalı olarak al" variant="danger" onPress={() => confirm('DEFECTIVE')} disabled={busy} />
      <Button title="Vazgeç" variant="secondary" onPress={onCancel} />
    </View>
  );
}

/** Arıza bildirimi: bakım kaydı açar. Depodaki cihaz arızalıya geçer; zimmetli cihaz personelde kalır. */
function FaultPanel({ api, asset, onCancel, onDone }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (text.trim().length < 5) return setError('Arızayı en az 5 karakterle açıklayın.');
    setBusy(true);
    setError('');
    try {
      await api.post(`/assets/${asset.id}/maintenance`, { issue_description: text.trim() });
      await onDone('Arıza kaydı açıldı.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.h2}>Arıza bildir</Text>
      <TextInput
        style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
        value={text}
        onChangeText={setText}
        placeholder="Arızanın açıklaması"
        multiline
        maxLength={2000}
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Kaydı aç" onPress={submit} busy={busy} />
      <Button title="Vazgeç" variant="secondary" onPress={onCancel} />
    </View>
  );
}
