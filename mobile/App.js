import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { createApi } from './src/api';
import { clearSession, loadSession, saveSession } from './src/session';
import { colors, styles } from './src/ui';
import LoginScreen from './src/screens/LoginScreen';
import MyAssetsScreen from './src/screens/MyAssetsScreen';
import ScanScreen from './src/screens/ScanScreen';
import AssetScreen from './src/screens/AssetScreen';

/**
 * Basit durum tabanlı gezinme (navigasyon kütüphanesi yok — web istemcisindeki gibi bağımlılıkları az tutmak için):
 * giriş → alt sekmeler (Zimmetlerim / QR okut) → cihaz detayı.
 */
export default function App() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState({ baseUrl: '', token: null, user: null });
  const [tab, setTab] = useState('mine');
  const [detail, setDetail] = useState(null); // { code } veya { id }
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    loadSession()
      .then((s) => setSession(s))
      .finally(() => setBooting(false));
  }, []);

  const logout = useCallback(async (reason) => {
    await clearSession();
    setSession((s) => ({ baseUrl: s.baseUrl, token: null, user: null }));
    setDetail(null);
    setTab('mine');
    if (reason) Alert.alert('Oturum kapandı', reason);
  }, []);

  // Token süresi dolarsa veya sunucu oturumu iptal ederse (parola değişikliği, pasife alma, rol değişikliği → token_version) 401 gelir.
  const api = useMemo(
    () => createApi(() => sessionRef.current, () => logout('Oturumunuz sona erdi, lütfen tekrar giriş yapın.')),
    [logout],
  );

  // Android geri tuşu: önce cihaz detayını kapat.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detail) {
        setDetail(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [detail]);

  async function handleLoggedIn(next) {
    await saveSession(next);
    setSession(next);
  }

  function confirmLogout() {
    Alert.alert('Çıkış', 'Oturumu kapatmak istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış yap',
        style: 'destructive',
        onPress: async () => {
          await api.post('/auth/logout').catch(() => {});
          await logout();
        },
      },
    ]);
  }

  let body;
  if (booting) {
    body = <View style={[styles.screen, { justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} /></View>;
  } else if (!session.token) {
    body = <LoginScreen initialBaseUrl={session.baseUrl} onLoggedIn={handleLoggedIn} />;
  } else if (detail) {
    body = <AssetScreen api={api} user={session.user} target={detail} onClose={() => setDetail(null)} />;
  } else {
    body = (
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{session.user?.ad_soyad}</Text>
            <Text style={styles.muted}>{session.user?.role === 'ADMIN' ? 'Yönetici' : 'Personel'}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={confirmLogout} hitSlop={12}><Text style={styles.link}>Çıkış</Text></Pressable>
        </View>
        <View style={{ flex: 1 }}>
          {tab === 'mine'
            ? <MyAssetsScreen api={api} onOpenAsset={setDetail} />
            : <ScanScreen active={tab === 'scan' && !detail} onFound={(code) => setDetail({ code })} />}
        </View>
        <View style={styles.tabs}>
          <TabButton label="Zimmetlerim" active={tab === 'mine'} onPress={() => setTab('mine')} />
          <TabButton label="QR okut" active={tab === 'scan'} onPress={() => setTab('scan')} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        {body}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.tab}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}
