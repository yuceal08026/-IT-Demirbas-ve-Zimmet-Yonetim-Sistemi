// Veritabanı gerektirmez: cihaz kodundaki yılın kurum saat dilimine göre alındığını doğrular.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yearInTimezone } from '../src/utils/time.js';

test('yılbaşı gecesi: UTC hâlâ eski yıldayken İstanbul yeni yıldadır', () => {
  // 31 Aralık 2026 22:30 UTC = 1 Ocak 2027 01:30 İstanbul (UTC+3)
  const now = new Date('2026-12-31T22:30:00Z');
  assert.equal(now.getUTCFullYear(), 2026);
  assert.equal(yearInTimezone(now, 'Europe/Istanbul'), 2027);
  assert.equal(yearInTimezone(now, 'UTC'), 2026);
});

test('yıl ortasında tüm saat dilimleri aynı yılı verir', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  for (const tz of ['Europe/Istanbul', 'UTC', 'America/New_York', 'Asia/Tokyo']) {
    assert.equal(yearInTimezone(now, tz), 2026);
  }
});

test('İstanbul yılbaşı sınırı tam olarak 21:00 UTC', () => {
  assert.equal(yearInTimezone(new Date('2026-12-31T20:59:59Z'), 'Europe/Istanbul'), 2026);
  assert.equal(yearInTimezone(new Date('2026-12-31T21:00:00Z'), 'Europe/Istanbul'), 2027);
});
