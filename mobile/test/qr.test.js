// Saf yardımcıların testleri (React Native veya cihaz gerekmez): npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractAssetCode, normalizeServerUrl, formatDate } from '../src/qr.js';

test('QR adresinden cihaz kodu çıkarılır', () => {
  assert.equal(extractAssetCode('http://localhost:8080/assets/code/IT-2026-000042'), 'IT-2026-000042');
  assert.equal(extractAssetCode('https://zimmet.kurum.gov.tr/assets/code/it-2026-000007?x=1'), 'IT-2026-000007');
  assert.equal(extractAssetCode('  IT-2026-000001  '), 'IT-2026-000001');
});

test('cihaz etiketi olmayan QR içerikleri reddedilir', () => {
  assert.equal(extractAssetCode(''), null);
  assert.equal(extractAssetCode(null), null);
  assert.equal(extractAssetCode('https://ornek.com/baska/sayfa'), null);
  assert.equal(extractAssetCode('WIFI:S:ag;T:WPA;P:parola;;'), null);
  assert.equal(extractAssetCode('../../etc/passwd'), null);
});

test('sunucu adresi normalleştirilir', () => {
  assert.equal(normalizeServerUrl('192.168.1.20:8080'), 'http://192.168.1.20:8080');
  assert.equal(normalizeServerUrl('http://192.168.1.20:8080/'), 'http://192.168.1.20:8080');
  assert.equal(normalizeServerUrl('https://zimmet.kurum.gov.tr/api/'), 'https://zimmet.kurum.gov.tr');
  assert.equal(normalizeServerUrl(''), '');
  assert.equal(normalizeServerUrl('http://'), '');
});

test('tarih biçimi', () => {
  assert.equal(formatDate('2026-03-14'), '14.03.2026');
  assert.equal(formatDate(null), '—');
  assert.equal(formatDate('bozuk'), '—');
});
