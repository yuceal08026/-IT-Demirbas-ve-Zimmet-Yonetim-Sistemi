import { Router } from 'express';
import { query } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { presentAudit } from './auditLogs.js';
import { alertCounts } from '../services/alerts.js';

const router = Router();
router.use(authenticate, requireAdmin);

/**
 * GET /api/dashboard/stats
 * PRD §7 veri tutarlılığı: her istekte canlı COUNT sorguları; önbellek yok.
 * Tanım: "toplam" = kullanımdaki (is_active) cihazlar; pasife alınanlar ayrı sayılır.
 * Garanti: total = active + in_stock + defective.
 */
router.get('/stats', async (req, res) => {
  const [assets, users, byCategory, byDepartment, recent, alerts] = await Promise.all([
    query(`
      SELECT count(*) FILTER (WHERE is_active)                           AS total,
             count(*) FILTER (WHERE is_active AND status = 'ACTIVE')     AS active,
             count(*) FILTER (WHERE is_active AND status = 'IN_STOCK')   AS in_stock,
             count(*) FILTER (WHERE is_active AND status = 'DEFECTIVE')  AS defective,
             count(*) FILTER (WHERE NOT is_active)                       AS inactive
        FROM assets`),
    query('SELECT count(*) AS total, count(*) FILTER (WHERE is_active) AS active FROM users'),
    query(`
      SELECT category,
             count(*)                                       AS total,
             count(*) FILTER (WHERE status = 'ACTIVE')      AS active,
             count(*) FILTER (WHERE status = 'IN_STOCK')    AS in_stock,
             count(*) FILTER (WHERE status = 'DEFECTIVE')   AS defective
        FROM assets WHERE is_active
       GROUP BY category ORDER BY count(*) DESC, category`),
    query(`
      SELECT d.id AS department_id, COALESCE(d.name, 'Departmanı yok') AS name, count(*) AS count
        FROM assignments s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN departments d ON d.id = u.department_id
       WHERE s.returned_at IS NULL
       GROUP BY d.id, d.name ORDER BY count(*) DESC, name`),
    query(`
      SELECT l.id, l.action_type, l.entity_type, l.entity_id, l."timestamp", l.details,
             actor.id AS actor_id, actor.ad_soyad AS actor_name, ea.asset_code AS entity_label
        FROM audit_logs l
        LEFT JOIN users actor ON actor.id = l.user_id
        LEFT JOIN assets ea ON ea.id = l.entity_id
       WHERE l.entity_type = 'ASSET'
       ORDER BY l."timestamp" DESC, l.id DESC LIMIT 8`),
    alertCounts(),
  ]);

  res.set('Cache-Control', 'no-store');
  res.json({
    assets: assets.rows[0],
    users: users.rows[0],
    by_category: byCategory.rows,
    by_department: byDepartment.rows,
    recent_activity: recent.rows.map(presentAudit),
    alerts,
    generated_at: new Date().toISOString(),
  });
});

export default router;
