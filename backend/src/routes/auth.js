import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { authenticate, loginRateLimit, signToken } from '../middleware/auth.js';
import { validate, email } from '../middleware/validate.js';
import { AppError } from '../utils/errors.js';
import { writeAudit } from '../utils/audit.js';
import { parseDurationMs } from '../utils/time.js';

const router = Router();

const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Parola zorunludur' }).min(1, 'Parola zorunludur').max(200),
  // Mobil/API istemcileri token'ı gövdede ister; web istemcisi yalnızca httpOnly cookie kullanır.
  issueToken: z.boolean().optional(),
});

// Kullanıcı bulunamasa bile bcrypt karşılaştırması yapılır → yanıt süresi e-postanın varlığını ele vermez.
let dummyHashPromise;
const dummyHash = () => (dummyHashPromise ??= bcrypt.hash('dummy-password-for-timing', config.bcryptRounds));

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'E-posta veya parola hatalı');

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.cookieSecure,
    path: '/',
  };
}

export function publicUser(u) {
  return {
    id: u.id,
    ad_soyad: u.ad_soyad,
    email: u.email,
    role: u.role,
    department: u.department_id ? { id: u.department_id, name: u.department_name } : null,
  };
}

// POST /api/auth/login
router.post('/login', loginRateLimit, validate({ body: loginSchema }), async (req, res) => {
  const { email: mail, password, issueToken } = req.valid.body;

  const { rows } = await query(
    `SELECT u.id, u.ad_soyad, u.email, u.password_hash, u.role, u.is_active, u.token_version,
            u.department_id, d.name AS department_name
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
      WHERE lower(u.email) = $1`,
    [mail],
  );
  const user = rows[0];
  const passwordOk = await bcrypt.compare(password, user ? user.password_hash : await dummyHash());

  if (!user || !passwordOk || !user.is_active) {
    await writeAudit({
      userId: user?.id ?? null,
      action: 'LOGIN_FAILED',
      entityType: 'USER',
      entityId: user?.id ?? null,
      details: { email: mail, reason: !user ? 'unknown_email' : !passwordOk ? 'wrong_password' : 'inactive', ip: req.ip },
    });
    throw invalidCredentials();
  }

  const token = signToken(user);
  res.cookie(config.cookieName, token, { ...cookieOptions(), maxAge: parseDurationMs(config.jwt.expiresIn) });
  await writeAudit({ userId: user.id, action: 'LOGIN', entityType: 'USER', entityId: user.id, details: { ip: req.ip } });

  const body = { user: publicUser(user), expiresIn: config.jwt.expiresIn };
  if (issueToken) body.token = token;
  res.json(body);
});

// POST /api/auth/logout — idempotent; oturum olmasa da cookie temizlenir.
router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, cookieOptions());
  res.status(204).end();
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
