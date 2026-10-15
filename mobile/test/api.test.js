// Mobil API istemcisi: Bearer token, hata kodları ve 401'de oturum kapatma.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, ApiError } from '../src/api.js';

function mock(status, body) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return calls;
}

test('token Authorization: Bearer başlığıyla gönderilir', async () => {
  const calls = mock(200, { data: [] });
  const api = createApi(() => ({ baseUrl: 'http://10.0.0.5:8080', token: 'abc' }));
  await api.get('/me/assignments', { active: 'true', limit: 100, search: '' });
  assert.equal(calls[0].url, 'http://10.0.0.5:8080/api/me/assignments?active=true&limit=100');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer abc');
});

test('POST gövdesi JSON (backend CSRF kuralı application/json ister)', async () => {
  const calls = mock(201, { id: 9 });
  const api = createApi(() => ({ baseUrl: 'http://h', token: 't' }));
  await api.post('/assignments', { asset_id: 1, user_id: 2 });
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
});

test('401 gelince oturum kapatma geri çağrısı çalışır', async () => {
  mock(401, { error: { code: 'UNAUTHENTICATED', message: 'Oturumunuz sonlandırıldı' } });
  let loggedOut = false;
  const api = createApi(() => ({ baseUrl: 'http://h', token: 't' }), () => { loggedOut = true; });
  await assert.rejects(api.get('/assets/1'), (e) => e instanceof ApiError && e.status === 401);
  assert.equal(loggedOut, true);
});

test('girişteki 401 (hatalı parola) oturum kapatmayı tetiklemez', async () => {
  mock(401, { error: { code: 'INVALID_CREDENTIALS', message: 'E-posta veya parola hatalı' } });
  let loggedOut = false;
  const api = createApi(() => ({ baseUrl: 'http://h', token: null }), () => { loggedOut = true; });
  await assert.rejects(api.post('/auth/login', {}), { code: 'INVALID_CREDENTIALS' });
  assert.equal(loggedOut, false);
});

test('ağ hatası anlaşılır mesajla döner', async () => {
  globalThis.fetch = async () => { throw new TypeError('Network request failed'); };
  const api = createApi(() => ({ baseUrl: 'http://h', token: null }));
  await assert.rejects(api.get('/health'), { code: 'NETWORK_ERROR' });
});
