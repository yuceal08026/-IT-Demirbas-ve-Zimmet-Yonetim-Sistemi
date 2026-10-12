import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { pool, withTransaction } from '../db.js';
import { nextAssetCode } from '../services/assetCode.js';

/**
 * İlk kurulum verisi.
 * 1) Hiç aktif yönetici yoksa SEED_ADMIN_* ile bir yönetici oluşturur.
 * 2) SEED_DEMO_DATA=true ise ve veritabanı boşsa örnek departman/personel/cihaz/zimmet ekler.
 * Tekrar çalıştırmak güvenlidir (idempotent): var olan veriye dokunmaz.
 */

const env = process.env;

async function seedAdmin(client, log) {
  const { rows } = await client.query("SELECT count(*) AS n FROM users WHERE role = 'ADMIN' AND is_active");
  if (rows[0].n > 0) {
    log('[seed] Aktif yönetici zaten var, atlandı.');
    return null;
  }

  const email = (env.SEED_ADMIN_EMAIL || 'admin@kurum.local').trim().toLowerCase();
  const name = env.SEED_ADMIN_NAME || 'Sistem Yöneticisi';
  let password = env.SEED_ADMIN_PASSWORD;
  if (!password) {
    if (config.isProduction) {
      throw new Error('[seed] Üretim ortamında SEED_ADMIN_PASSWORD tanımlanmalıdır.');
    }
    password = crypto.randomBytes(9).toString('base64url') + '7';
    log(`[seed] SEED_ADMIN_PASSWORD tanımlı değil; geçici parola üretildi (yalnızca bir kez gösterilir): ${password}`);
  }

  const hash = await bcrypt.hash(password, config.bcryptRounds);
  const { rows: inserted } = await client.query(
    `INSERT INTO users (ad_soyad, email, password_hash, role)
     VALUES ($1, $2, $3, 'ADMIN')
     ON CONFLICT ((lower(email))) DO UPDATE SET role = 'ADMIN', is_active = TRUE
     RETURNING id`,
    [name, email, hash],
  );
  log(`[seed] Yönetici hesabı hazır: ${email}`);
  return inserted[0].id;
}

const DEPARTMENTS = ['Bilgi İşlem', 'İnsan Kaynakları', 'Muhasebe', 'Satın Alma', 'Hukuk Müşavirliği'];

const PEOPLE = [
  ['Ayşe Yılmaz', 'ayse.yilmaz', 'İnsan Kaynakları'],
  ['Mehmet Kaya', 'mehmet.kaya', 'Muhasebe'],
  ['Zeynep Demir', 'zeynep.demir', 'Satın Alma'],
  ['Emre Çelik', 'emre.celik', 'Bilgi İşlem'],
  ['Elif Şahin', 'elif.sahin', 'Hukuk Müşavirliği'],
  ['Burak Öztürk', 'burak.ozturk', 'Muhasebe'],
  ['Selin Arslan', 'selin.arslan', 'İnsan Kaynakları'],
];

// [kategori, marka, model, seri ön eki, alım (gün önce), garanti (yıl)]
const ASSETS = [
  ['Dizüstü Bilgisayar', 'Dell', 'Latitude 5440', 'DL5440', 420, 3],
  ['Dizüstü Bilgisayar', 'Lenovo', 'ThinkPad T14 Gen 4', 'LNT14', 380, 3],
  ['Dizüstü Bilgisayar', 'HP', 'EliteBook 840 G10', 'HP840', 1080, 3],
  ['Dizüstü Bilgisayar', 'Apple', 'MacBook Air M3', 'MBA3', 200, 1],
  ['Masaüstü Bilgisayar', 'Dell', 'OptiPlex 7010', 'DO7010', 700, 3],
  ['Masaüstü Bilgisayar', 'HP', 'ProDesk 400 G9', 'HPD400', 1450, 3],
  ['Masaüstü Bilgisayar', 'Lenovo', 'ThinkCentre M70q', 'LNM70', 90, 3],
  ['Monitör', 'Dell', 'P2723D', 'DMP27', 500, 3],
  ['Monitör', 'LG', '27UP850', 'LG27', 640, 2],
  ['Monitör', 'Samsung', 'ViewFinity S6', 'SMS6', 1090, 3],
  ['Monitör', 'Dell', 'U2424H', 'DMU24', 60, 3],
  ['Sunucu', 'HPE', 'ProLiant DL380 Gen11', 'HPEDL', 900, 5],
  ['Sunucu', 'Dell', 'PowerEdge R760', 'DPR760', 300, 5],
  ['Yazıcı', 'HP', 'LaserJet Pro M404dn', 'HPLJ', 1800, 2],
  ['Yazıcı', 'Brother', 'HL-L6410DN', 'BRHL', 340, 2],
  ['Tablet', 'Apple', 'iPad 10. Nesil', 'IPAD10', 260, 1],
  ['Tablet', 'Samsung', 'Galaxy Tab S9', 'SGTS9', 700, 2],
  ['Ağ Cihazı', 'Cisco', 'Catalyst 9200L', 'CS9200', 1200, 5],
  ['Projeksiyon', 'Epson', 'EB-L210W', 'EPEB', 1500, 2],
  ['Dizüstü Bilgisayar', 'Lenovo', 'ThinkPad E14', 'LNE14', 1110, 3],
];

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
const isoDay = (d) => d.toISOString().slice(0, 10);

async function seedDemo(client, adminId, log) {
  const { rows } = await client.query('SELECT count(*) AS n FROM departments');
  if (rows[0].n > 0) {
    log('[seed] Örnek veri zaten yüklü (departman tablosu dolu), atlandı.');
    return;
  }
  const demoPassword = env.SEED_DEMO_PASSWORD || 'Personel123';
  const hash = await bcrypt.hash(demoPassword, config.bcryptRounds);

  const deptIds = {};
  for (const name of DEPARTMENTS) {
    const r = await client.query('INSERT INTO departments (name) VALUES ($1) RETURNING id', [name]);
    deptIds[name] = r.rows[0].id;
  }
  if (adminId) await client.query('UPDATE users SET department_id = $1 WHERE id = $2', [deptIds['Bilgi İşlem'], adminId]);

  const userIds = [];
  for (const [name, mail, dept] of PEOPLE) {
    const r = await client.query(
      `INSERT INTO users (ad_soyad, email, password_hash, role, department_id)
       VALUES ($1, $2, $3, 'USER', $4) ON CONFLICT DO NOTHING RETURNING id`,
      [name, `${mail}@kurum.local`, hash, deptIds[dept]],
    );
    if (r.rows[0]) userIds.push(r.rows[0].id);
  }

  const assetIds = [];
  for (const [i, [category, brand, model, prefix, ageDays, warrantyYears]] of ASSETS.entries()) {
    const code = await nextAssetCode(client);
    const purchase = daysAgo(ageDays);
    const warranty = new Date(purchase);
    warranty.setUTCFullYear(warranty.getUTCFullYear() + warrantyYears);
    const createdAt = daysAgo(Math.min(ageDays, 400) - 1);
    const r = await client.query(
      `INSERT INTO assets (asset_code, category, brand, model, serial_number, purchase_date, warranty_end_date,
                           status, status_changed_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'IN_STOCK',$8,$8,$8) RETURNING id`,
      [code, category, brand, model, `${prefix}-${String(48211 + i * 37).padStart(6, '0')}`,
        isoDay(purchase), isoDay(warranty), createdAt],
    );
    assetIds.push(r.rows[0].id);
    if (adminId) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, "timestamp", details)
         VALUES ($1, 'ASSET_CREATE', 'ASSET', $2, $3, $4)`,
        [adminId, r.rows[0].id, createdAt, { asset_code: code, brand, model, seed: true }],
      );
    }
  }

  if (!adminId || userIds.length === 0) return;

  // Bazı cihazlar personelde (aktif zimmet), biri geçmişte iade edilmiş, bazıları arızalı.
  const plan = [
    [0, 0, 120], [1, 1, 95], [2, 2, 300], [4, 3, 45], [7, 0, 120], [8, 4, 30],
    [11, 3, 200], [15, 5, 12], [12, 3, 80], [3, 6, 20],
  ];
  for (const [assetIdx, userIdx, days] of plan) {
    const at = daysAgo(days);
    await client.query(
      `INSERT INTO assignments (asset_id, user_id, assigned_by, assigned_at, note) VALUES ($1,$2,$3,$4,$5)`,
      [assetIds[assetIdx], userIds[userIdx % userIds.length], adminId, at, 'Örnek veri'],
    );
    await client.query(`UPDATE assets SET status = 'ACTIVE', status_changed_at = $2 WHERE id = $1`, [assetIds[assetIdx], at]);
    await client.query(
      `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, "timestamp", details)
       VALUES ($1, 'ASSIGN', 'ASSET', $2, $3, $4)`,
      [adminId, assetIds[assetIdx], at, { user_id: userIds[userIdx % userIds.length], seed: true }],
    );
  }

  // Geçmiş (iade edilmiş) bir zimmet: cihaz 9 → 2. personel, sonra iade.
  const out = daysAgo(260);
  const back = daysAgo(190);
  await client.query(
    `INSERT INTO assignments (asset_id, user_id, assigned_by, assigned_at, note) VALUES ($1,$2,$3,$4,'Örnek veri')`,
    [assetIds[9], userIds[1], adminId, out],
  );
  await client.query(
    `UPDATE assignments SET returned_at = $1, returned_by = $2, return_note = 'Personel değişikliği'
      WHERE asset_id = $3 AND returned_at IS NULL`,
    [back, adminId, assetIds[9]],
  );
  await client.query(`UPDATE assets SET status_changed_at = $2 WHERE id = $1`, [assetIds[9], back]);

  for (const idx of [5, 13]) {
    await client.query(`UPDATE assets SET status = 'DEFECTIVE', status_changed_at = $2 WHERE id = $1`, [assetIds[idx], daysAgo(15)]);
  }

  log(`[seed] Örnek veri yüklendi: ${DEPARTMENTS.length} departman, ${userIds.length} personel (parola: ${demoPassword}), ${assetIds.length} cihaz.`);
}

export async function runSeed({ log = console.log } = {}) {
  await withTransaction(async (client) => {
    const adminId = await seedAdmin(client, log);
    if (env.SEED_DEMO_DATA === 'true') {
      const { rows } = await client.query("SELECT id FROM users WHERE role = 'ADMIN' AND is_active ORDER BY id LIMIT 1");
      await seedDemo(client, adminId ?? rows[0]?.id, log);
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
      return pool.end();
    });
}
