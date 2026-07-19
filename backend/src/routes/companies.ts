import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Company from '../models/company';
import User from '../models/user';
import Voucher from '../models/voucher';
import Ledger from '../models/ledger';
import StockItem from '../models/stock';
import ActivityLog from '../models/activityLog';
import { requireJwt, requireRole } from '../middleware/authMiddleware';

const router = Router();

/* ── GET /api/companies ─────────────────────────────────────────────────── */
router.get('/', requireJwt, requireRole('superadmin'), async (req: Request, res: Response) => {
  const companies = await Company.find().sort({ createdAt: -1 }).lean();
  const companyIds = companies.map((c) => c.companyId);
  const admins = await User
    .find({ companyId: { $in: companyIds }, role: { $in: ['admin', 'owner'] } })
    .select('-passwordHash')
    .sort({ createdAt: 1 })
    .lean();

  const result = companies.map((c) => ({
    ...c,
    adminUser: admins.find((u) => u.companyId === c.companyId) ?? null,
  }));
  res.json({ success: true, companies: result });
});

/* ── POST /api/companies/register ─── create org + admin user atomically ── */
router.post('/register', requireJwt, requireRole('superadmin'), async (req: Request, res: Response) => {
  const { orgName, companyId, adminName, adminEmail, adminPassword } = req.body;
  if (!orgName || !companyId || !adminName || !adminEmail || !adminPassword) {
    res.status(400).json({ success: false, error: 'All fields are required' });
    return;
  }

  const [existingCompany, existingUser] = await Promise.all([
    Company.findOne({ companyId }),
    User.findOne({ email: adminEmail.toLowerCase().trim() }),
  ]);
  if (existingCompany) {
    res.status(409).json({ success: false, error: 'Company ID already exists' });
    return;
  }
  if (existingUser) {
    res.status(409).json({ success: false, error: 'Admin email already registered' });
    return;
  }

  const company      = await Company.create({ companyId, name: orgName, status: 'active' });
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const adminUser    = await User.create({
    email: adminEmail.toLowerCase().trim(),
    passwordHash, name: adminName, role: 'admin', companyId, isActive: true,
  });

  await ActivityLog.create({
    userId: req.jwtUser!.userId,
    userEmail: req.jwtUser!.email,
    userName: req.jwtUser!.name,
    action: 'create_company',
    details: `Registered organisation: ${orgName} (${companyId})`,
    ip: req.ip,
  }).catch(() => {});

  res.status(201).json({
    success: true,
    company:   { companyId: company.companyId, name: company.name, status: company.status, createdAt: company.createdAt },
    adminUser: { id: (adminUser as any)._id, name: adminUser.name, email: adminUser.email, role: adminUser.role, companyId: adminUser.companyId },
  });
});

/* ── PATCH /api/companies/:companyId ──────────────────────────────────────── */
router.patch('/:companyId', requireJwt, requireRole('superadmin'), async (req: Request, res: Response) => {
  const { name, status } = req.body;
  const update: any = {};
  if (name)   update.name   = name;
  if (status) update.status = status;

  const company = await Company.findOneAndUpdate(
    { companyId: req.params.companyId },
    { $set: update },
    { new: true },
  ).lean();
  if (!company) { res.status(404).json({ success: false, error: 'Company not found' }); return; }

  await ActivityLog.create({
    userId: req.jwtUser!.userId,
    userEmail: req.jwtUser!.email,
    userName: req.jwtUser!.name,
    action: 'update_company',
    details: `Updated organisation: ${req.params.companyId}`,
    ip: req.ip,
  }).catch(() => {});

  res.json({ success: true, company });
});

/* ── DELETE /api/companies/:companyId ─────────────────────────────────────── */
router.delete('/:companyId', requireJwt, requireRole('superadmin'), async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const company = await Company.findOneAndDelete({ companyId }).lean();
  if (!company) { res.status(404).json({ success: false, error: 'Company not found' }); return; }

  // Cascade: delete all data belonging to this company
  await Promise.all([
    Voucher.deleteMany({ companyId }),
    Ledger.deleteMany({ companyId }),
    StockItem.deleteMany({ companyId }),
    User.deleteMany({ companyId, role: { $ne: 'superadmin' } }),
  ]);

  await ActivityLog.create({
    userId: req.jwtUser!.userId,
    userEmail: req.jwtUser!.email,
    userName: req.jwtUser!.name,
    action: 'delete_company',
    details: `Deleted organisation: ${companyId}`,
    ip: req.ip,
  }).catch(() => {});

  res.json({ success: true, message: 'Company deleted' });
});

export default router;
