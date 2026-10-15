/**
 * Saf yardımcılar (React Native'e bağımlı değil, node:test ile test edilir).
 */

/**
 * QR içeriğinden cihaz kodunu çıkarır.
 * Etiketteki QR, `${APP_BASE_URL}/assets/code/IT-2026-000042` biçiminde bir adres taşır;
 * elle girişte yalnızca kodun kendisi de yazılabilir.
 * Tanınmayan içerikte null döner.
 */
export function extractAssetCode(raw) {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text) return null;
  const fromUrl = /\/assets\/code\/([^/?#\s]+)/i.exec(text);
  const candidate = fromUrl ? decodeURIComponent(fromUrl[1]) : text;
  const code = candidate.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{0,31}$/.test(code) ? code : null;
}

/**
 * Kullanıcının yazdığı sunucu adresini normalleştirir:
 * "192.168.1.20:8080" → "http://192.168.1.20:8080", sondaki "/" ve "/api" kaldırılır.
 */
export function normalizeServerUrl(input) {
  let url = String(input || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  url = url.replace(/\/+$/, '').replace(/\/api$/i, '');
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return '';
  } catch {
    return '';
  }
  return url;
}

export const STATUS_LABELS = { ACTIVE: 'Zimmetli', IN_STOCK: 'Depoda', DEFECTIVE: 'Arızalı' };

/** ISO tarih/zaman → "14.03.2026" */
export function formatDate(value) {
  if (!value) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
