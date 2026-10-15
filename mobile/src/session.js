import * as SecureStore from 'expo-secure-store';

/**
 * Oturum bilgisinin kalıcı saklanması.
 * JWT düz AsyncStorage yerine SecureStore'da tutulur: iOS'ta Keychain, Android'de Keystore ile şifrelenir.
 * Parola hiçbir yerde saklanmaz.
 */
const KEYS = { token: 'zimmet_token', baseUrl: 'zimmet_base_url', user: 'zimmet_user' };

export async function loadSession() {
  const [token, baseUrl, user] = await Promise.all([
    SecureStore.getItemAsync(KEYS.token),
    SecureStore.getItemAsync(KEYS.baseUrl),
    SecureStore.getItemAsync(KEYS.user),
  ]);
  let parsedUser = null;
  try {
    parsedUser = user ? JSON.parse(user) : null;
  } catch {
    parsedUser = null;
  }
  return { token, baseUrl: baseUrl || '', user: parsedUser };
}

export async function saveSession({ token, baseUrl, user }) {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.token, token),
    SecureStore.setItemAsync(KEYS.baseUrl, baseUrl),
    SecureStore.setItemAsync(KEYS.user, JSON.stringify(user)),
  ]);
}

/** Çıkışta token ve kullanıcı silinir; sunucu adresi bir sonraki giriş için hatırlanır. */
export async function clearSession() {
  await Promise.all([SecureStore.deleteItemAsync(KEYS.token), SecureStore.deleteItemAsync(KEYS.user)]);
}

export async function saveBaseUrl(baseUrl) {
  await SecureStore.setItemAsync(KEYS.baseUrl, baseUrl);
}
