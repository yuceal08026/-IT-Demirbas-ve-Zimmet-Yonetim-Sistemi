import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { formatDate } from '../qr';
import { ErrorText, StatusBadge, styles } from '../ui';

/** Kişisel zimmet ekranı: giriş yapan kullanıcının üzerindeki cihazlar (GET /api/me/assignments). */
export default function MyAssetsScreen({ api, onOpenAsset }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/me/assignments', { active: 'true', limit: 100 });
      setItems(res?.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={(
        <View style={{ gap: 4 }}>
          <Text style={styles.title}>Zimmetlerim</Text>
          <Text style={styles.subtitle}>Üzerinizde kayıtlı cihazlar. Yenilemek için aşağı çekin.</Text>
          <ErrorText>{error}</ErrorText>
        </View>
      )}
      ListEmptyComponent={!loading && !error ? (
        <View style={styles.card}><Text style={styles.muted}>Üzerinize zimmetli cihaz yok.</Text></View>
      ) : null}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpenAsset({ id: item.asset.id })}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.h2}>{item.asset.asset_code}</Text>
            <StatusBadge status={item.asset.status} />
          </View>
          <Text style={{ fontSize: 15 }}>{`${item.asset.brand} ${item.asset.model}`}</Text>
          <Text style={styles.muted}>{`${item.asset.category} · Seri no ${item.asset.serial_number}`}</Text>
          <Text style={styles.muted}>{`Teslim tarihi: ${formatDate(item.assigned_at)}`}</Text>
        </Pressable>
      )}
    />
  );
}
