import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { createApi } from '../api';
import { normalizeServerUrl } from '../qr';
import { Button, ErrorText, styles } from '../ui';

/**
 * Giriş: sunucu adresi + e-posta + parola.
 * issueToken: true ile API yanıtına JWT eklenir (web istemcisi token'ı hiç görmez, yalnızca httpOnly cookie kullanır).
 */
export default function LoginScreen({ initialBaseUrl, onLoggedIn }) {
  const [server, setServer] = useState(initialBaseUrl || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    const baseUrl = normalizeServerUrl(server);
    if (!baseUrl) return setError('Geçerli bir sunucu adresi girin (örn. http://192.168.1.20:8080).');
    if (!email.trim() || !password) return setError('E-posta ve parola zorunludur.');

    setBusy(true);
    try {
      const api = createApi(() => ({ baseUrl, token: null }));
      const res = await api.post('/auth/login', { email: email.trim(), password, issueToken: true });
      if (!res?.token) throw new Error('Sunucu oturum anahtarı döndürmedi.');
      if (res.user?.must_change_password) {
        setError('Hesabınız geçici parola kullanıyor. Önce web arayüzünden giriş yapıp parolanızı değiştirin.');
        return;
      }
      await onLoggedIn({ baseUrl, token: res.token, user: res.user });
    } catch (err) {
      setError(err.message || 'Giriş yapılamadı.');
    } finally {
      setBusy(false);
      setPassword('');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 48 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Zimmet Saha</Text>
        <Text style={styles.subtitle}>IT demirbaş ve zimmet sisteminin mobil istemcisi</Text>

        <View style={styles.card}>
          <View>
            <Text style={styles.label}>Sunucu adresi</Text>
            <TextInput
              style={styles.input}
              value={server}
              onChangeText={setServer}
              placeholder="http://192.168.1.20:8080"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
          <View>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="ad.soyad@kurum.gov.tr"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
            />
          </View>
          <View>
            <Text style={styles.label}>Parola</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              onSubmitEditing={submit}
            />
          </View>
          <ErrorText>{error}</ErrorText>
          <Button title="Giriş yap" onPress={submit} busy={busy} />
        </View>
        <Text style={styles.muted}>
          Telefon ve sunucu aynı ağda olmalı. Parolanızı unuttuysanız web arayüzündeki “Şifremi unuttum” bağlantısını kullanın.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
