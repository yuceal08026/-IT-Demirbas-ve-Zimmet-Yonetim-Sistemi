// Frontend yardımcı fonksiyon testleri. Ek bağımlılık gerektirmez: npm test (node:test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysFromToday, durationLabel, formatDate, formatDateTime, todayLocalIso, STATUS_LABELS } from '../src/lib/format.js';

test('formatDate: boş ve geçersiz değerlerde tire döner', () => {
  assert.equal(formatDate(null), '—');
  assert.equal(formatDate(''), '—');
  assert.equal(formatDate('gecersiz-tarih'), '—');
  assert.equal(formatDateTime(undefined), '—');
});

test('formatDate: YYYY-MM-DD yerel gün olarak okunur (UTC kayması yok)', () => {
  const out = formatDate('2026-03-14');
  assert.match(out, /14/);
  assert.match(out, /2026/);
});

test('todayLocalIso: yerel tarihi YYYY-AA-GG biçiminde verir', () => {
  const iso = todayLocalIso();
  assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);
  const d = new Date();
  assert.equal(iso, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
});

test('daysFromToday: bugün 0, yarın 1, dün -1', () => {
  assert.equal(daysFromToday(null), null);
  assert.equal(daysFromToday(todayLocalIso()), 0);
  const t = new Date();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
  const yesterday = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
  assert.equal(daysFromToday(iso(tomorrow)), 1);
  assert.equal(daysFromToday(iso(yesterday)), -1);
});

test('durationLabel: gün, ay ve yıl eşikleri', () => {
  assert.equal(durationLabel(null), '');
  assert.equal(durationLabel(0), 'bugün');
  assert.equal(durationLabel(12), '12 gün');
  assert.equal(durationLabel(-12), '12 gün');
  assert.equal(durationLabel(90), '3 ay');
  assert.equal(durationLabel(800), '2,2 yıl');
});

test('durum etiketleri üç cihaz durumunu da kapsar', () => {
  assert.deepEqual(Object.keys(STATUS_LABELS).sort(), ['ACTIVE', 'DEFECTIVE', 'IN_STOCK']);
});
