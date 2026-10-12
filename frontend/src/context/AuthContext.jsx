import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, onUnauthorized } from '../lib/api.js';
import { useNavigate } from '../lib/router.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * Oturum durumu. user: undefined = kontrol ediliyor, null = giriş yapılmamış.
 * Token httpOnly cookie'de durur; burada yalnızca kullanıcı bilgisi tutulur.
 * Arayüzdeki rol kontrolleri yalnızca görünürlük içindir — yetkiyi backend doğrular.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    api.get('/auth/me', undefined, { skipAuthRedirect: true })
      .then((r) => setUser(r.user))
      .catch(() => setUser(null));
  }, []);

  // Herhangi bir istek 401 dönerse (oturum süresi doldu, şifre sıfırlandı, hesap pasif) çıkış yap.
  const userRef = useRef(user);
  userRef.current = user;
  useEffect(
    () =>
      onUnauthorized(() => {
        if (userRef.current) toast.info('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        setUser(null);
      }),
    [toast],
  );

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password }, { skipAuthRedirect: true });
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout', {}, { skipAuthRedirect: true }).catch(() => {});
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ user, isAdmin: user?.role === 'ADMIN', login, logout, setUser }),
    [user, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
