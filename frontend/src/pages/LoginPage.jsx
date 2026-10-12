import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, useSearchParams } from '../lib/router.jsx';
import { useTitle } from '../lib/hooks.js';
import { Spinner } from '../components/ui.jsx';

/** Yalnızca uygulama içi yollara dönüş (açık yönlendirme açığını önler). */
function safeNext(next) {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function LoginPage() {
  useTitle('Giriş');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('E-posta ve parolanızı girin.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const user = await login(form.email.trim(), form.password);
      const next = safeNext(params.next);
      navigate(user.role === 'ADMIN' || next !== '/' ? next : '/my-assets', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="relative hidden overflow-hidden bg-ink px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="text-lg font-bold">Zimmet</p>
        <div>
          <div className="mb-10 inline-flex -rotate-2 flex-col gap-3 rounded-lg border border-[#b9c3cd] bg-gradient-to-b from-[#eef1f4] via-[#d9dfe5] to-[#e6eaee] px-6 py-5 text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.8),0_18px_40px_rgb(0_0_0/0.35)]">
            <div className="flex items-center justify-between gap-10 text-[11px] font-semibold text-ink-soft">
              <span>DEMİRBAŞ</span>
              <span>BİLGİ İŞLEM</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="size-2 rounded-full bg-[#9aa6b2] shadow-[inset_0_1px_1px_rgb(0_0_0/0.35)]" />
              <span className="font-mono text-3xl font-semibold tracking-wider">IT-2026-000042</span>
              <span className="size-2 rounded-full bg-[#9aa6b2] shadow-[inset_0_1px_1px_rgb(0_0_0/0.35)]" />
            </div>
            <div className="flex h-8 gap-[3px]" aria-hidden="true">
              {'1101001110100110111010011101001011101001'.split('').map((b, i) => (
                <span key={i} className={`h-full ${b === '1' ? 'w-[3px] bg-ink' : 'w-[2px] bg-transparent'}`} />
              ))}
            </div>
          </div>
          <h1 className="max-w-md text-[34px] leading-[1.15] font-bold">Her cihaz kimde, ne durumda — tek yerden.</h1>
          <p className="mt-4 max-w-md text-white/70">
            Envanter kaydı, personele teslim ve iade, arıza takibi ve tüm işlem geçmişi.
          </p>
        </div>
        <p className="text-sm text-white/50">Yapay Zekâ ve Dijital Dönüşüm Koordinatörlüğü</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <p className="mb-8 text-lg font-bold lg:hidden">Zimmet</p>
          <h2 className="text-[26px] font-bold tracking-tight">Giriş yap</h2>
          <p className="mt-1 text-steel-dark">Kurum e-posta adresiniz ve parolanızla devam edin.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="field-label">E-posta</label>
              <input id="email" type="email" autoComplete="username" className="field-input" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
            </div>
            <div>
              <label htmlFor="password" className="field-label">Parola</label>
              <input id="password" type="password" autoComplete="current-password" className="field-input" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            {error && <p className="rounded-md bg-st-defect-tint px-3 py-2 text-sm text-st-defect" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary w-full py-2.5 text-[15px]" disabled={busy}>
              {busy && <Spinner className="size-4 text-white" />}
              Giriş yap
            </button>
          </form>
          <p className="mt-6 text-sm text-steel-dark">Parolanızı unuttuysanız Bilgi İşlem birimine başvurun.</p>
        </div>
      </section>
    </div>
  );
}
