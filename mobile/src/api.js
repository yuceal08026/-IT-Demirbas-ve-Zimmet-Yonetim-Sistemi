/**
 * Mobil API istemcisi.
 * Web istemcisinden farkı: oturum cookie ile değil, girişte alınan JWT ile (Authorization: Bearer) taşınır.
 * Token cihazın güvenli deposunda (iOS Keychain / Android Keystore) saklanır — bkz. session.js.
 */

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * @param {() => {baseUrl: string, token: string|null}} getSession
 * @param {() => void} onUnauthorized  401 gelince (token süresi doldu / iptal edildi) çağrılır
 */
export function createApi(getSession, onUnauthorized) {
  async function request(method, path, { body, params } = {}) {
    const { baseUrl, token } = getSession();
    const qs = params
      ? Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
      : '';
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${baseUrl}/api${path}${qs ? `?${qs}` : ''}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'Sunucuya ulaşılamıyor. Adresi ve telefonun aynı ağda olduğunu kontrol edin.');
    }

    if (response.status === 204) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const err = data?.error || {};
      if (response.status === 401 && token) onUnauthorized?.();
      throw new ApiError(response.status, err.code || 'HTTP_ERROR', err.message || `İstek başarısız oldu (${response.status})`);
    }
    return data;
  }

  return {
    get: (path, params) => request('GET', path, { params }),
    post: (path, body) => request('POST', path, { body: body ?? {} }),
  };
}
