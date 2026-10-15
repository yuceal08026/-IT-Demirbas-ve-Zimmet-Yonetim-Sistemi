// API istemcisi testleri: fetch taklit edilir, gerçek sunucu gerekmez.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError, onUnauthorized, onPasswordChangeRequired } from '../src/lib/api.js';

let calls;
function mockFetch(status, body, headers = { 'content-type': 'application/json' }) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
  };
}

beforeEach(() => { calls = []; });

test('GET: boş/undefined parametreler sorgu dizesine eklenmez', async () => {
  mockFetch(200, { data: [] });
  await api.get('/assets', { search: 'dell', status: '', page: 2, category: undefined });
  assert.equal(calls[0].url, '/api/assets?search=dell&page=2');
  assert.equal(calls[0].init.credentials, 'same-origin');
});

test('POST: gövde JSON olarak ve doğru Content-Type ile gönderilir', async () => {
  mockFetch(201, { id: 1 });
  const res = await api.post('/assignments', { asset_id: 3, user_id: 5 });
  assert.deepEqual(res, { id: 1 });
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].init.body), { asset_id: 3, user_id: 5 });
});

test('204 yanıtı null döner', async () => {
  mockFetch(204, undefined, {});
  assert.equal(await api.delete('/assets/1'), null);
});

test('hata yanıtı ApiError olur; alan hataları forma uygun biçime çevrilir', async () => {
  mockFetch(400, { error: { code: 'VALIDATION_ERROR', message: 'Hatalı', details: [{ field: 'serial_number', message: 'Zorunlu' }] } });
  await assert.rejects(api.post('/assets', {}), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 400);
    assert.equal(err.code, 'VALIDATION_ERROR');
    assert.deepEqual(err.fieldErrors(), { serial_number: 'Zorunlu' });
    return true;
  });
});

test('409 çakışan zimmet kodu istemciye aynen iletilir', async () => {
  mockFetch(409, { error: { code: 'ASSET_ALREADY_ASSIGNED', message: 'Cihaz zaten zimmetli' } });
  await assert.rejects(api.post('/assignments', { asset_id: 1, user_id: 2 }), { code: 'ASSET_ALREADY_ASSIGNED' });
});

test('401 oturum dinleyicilerini tetikler; skipAuthRedirect ile tetiklemez', async () => {
  let fired = 0;
  const off = onUnauthorized(() => { fired += 1; });
  mockFetch(401, { error: { code: 'UNAUTHENTICATED', message: 'Oturum yok' } });
  await assert.rejects(api.get('/auth/me'));
  await assert.rejects(api.get('/auth/me', undefined, { skipAuthRedirect: true }));
  off();
  assert.equal(fired, 1);
});

test('403 PASSWORD_CHANGE_REQUIRED parola değiştirme ekranını tetikler', async () => {
  let fired = false;
  const off = onPasswordChangeRequired(() => { fired = true; });
  mockFetch(403, { error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'Parola değiştirin' } });
  await assert.rejects(api.get('/assets'));
  off();
  assert.equal(fired, true);
});

test('ağ hatası anlaşılır NETWORK_ERROR olarak döner', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(api.get('/health'), { code: 'NETWORK_ERROR', status: 0 });
});
