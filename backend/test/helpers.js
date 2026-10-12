import './setup.js';
import { after, before } from 'node:test';
import { createApp } from '../src/app.js';
import { pool, query } from '../src/db.js';
import { runMigrations } from '../src/scripts/migrate.js';
import { runSeed } from '../src/scripts/seed.js';

let server;
let baseUrl;
let ipCounter = 0;

/** Veritabanını sıfırlar, migration + seed çalıştırır, API'yi rastgele portta başlatır. */
export function useTestServer() {
  before(async () => {
    await query('DROP SCHEMA public CASCADE');
    await query('CREATE SCHEMA public');
    await runMigrations({ log: () => {} });
    await runSeed({ log: () => {} });
    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });
}

/**
 * Cookie saklayan basit HTTP istemcisi (tarayıcı gibi davranır).
 * Her istemci farklı bir IP'den geliyormuş gibi görünür (rate limit testleri birbirini etkilemesin).
 */
export function client() {
  const ip = `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;
  let cookie = '';
  let bearer = null;

  async function request(method, path, body, extraHeaders = {}) {
    const headers = { 'X-Forwarded-For': ip, ...extraHeaders };
    if (cookie) headers.Cookie = cookie;
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    if (body !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const setCookie = res.headers.getSetCookie?.() || [];
    for (const c of setCookie) {
      const [pair] = c.split(';');
      const value = pair.slice(pair.indexOf('=') + 1);
      cookie = /Expires=Thu, 01 Jan 1970/i.test(c) || value === '' ? '' : pair;
    }
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : type.startsWith('text') ? await res.text() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, body: data, headers: res.headers, setCookie };
  }

  return {
    get: (p, h) => request('GET', p, undefined, h),
    post: (p, b = {}, h) => request('POST', p, b, h),
    patch: (p, b = {}, h) => request('PATCH', p, b, h),
    delete: (p, h) => request('DELETE', p, undefined, h),
    raw: request,
    setBearer: (t) => { bearer = t; },
    clearCookie: () => { cookie = ''; },
    get cookie() { return cookie; },
    async login(email, password) {
      const r = await request('POST', '/api/auth/login', { email, password });
      if (r.status !== 200) throw new Error(`login failed ${r.status} ${JSON.stringify(r.body)}`);
      return r.body.user;
    },
  };
}

export async function adminClient() {
  const c = client();
  await c.login('admin@test.local', 'Admin12345');
  return c;
}

let userSeq = 0;
/** Admin istemcisiyle yeni personel oluşturur ve onunla giriş yapmış bir istemci döner. */
export async function createUserClient(admin, overrides = {}) {
  userSeq += 1;
  const payload = {
    ad_soyad: `Personel ${userSeq}`,
    email: `personel${userSeq}-${Date.now()}@test.local`,
    password: 'Personel123',
    role: 'USER',
    ...overrides,
  };
  const r = await admin.post('/api/users', payload);
  if (r.status !== 201) throw new Error(`user create failed ${r.status} ${JSON.stringify(r.body)}`);
  const c = client();
  await c.login(payload.email, payload.password);
  return { client: c, user: r.body, password: payload.password };
}

export { query };
