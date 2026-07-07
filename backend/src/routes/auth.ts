import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/user';
import ActivityLog from '../models/activityLog';
import { requireJwt, requireRole } from '../middleware/authMiddleware';

const router = Router();

function signToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET ?? 'fallback', {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions);
}

function safeUser(u: any) {
  return {
    id:        u._id,
    email:     u.email,
    name:      u.name,
    role:      u.role,
    companyId: u.companyId ?? null,
    isActive:  u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

/* ── POST /api/auth/login ──────────────────────────────────────────────── */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password required' });
    return;
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ success: false, error: 'Account is disabled' });
    return;
  }
  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

  ActivityLog.create({
    userId: user._id.toString(),
    userEmail: user.email,
    userName: user.name,
    companyId: user.companyId ?? undefined,
    action: 'login',
    details: `Login`,
    ip: req.ip,
  }).catch(() => {});

  const token = signToken({
    userId: user._id, email: user.email, name: user.name,
    role: user.role, companyId: user.companyId,
  });

  res.json({ success: true, token, user: safeUser(user) });
});

/* ── GET /api/auth/me ──────────────────────────────────────────────────── */
router.get('/me', requireJwt, async (req: Request, res: Response) => {
  const user = await User.findById(req.jwtUser!.userId).lean();
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  res.json({ success: true, user: safeUser(user) });
});

/* ── GET /api/auth/users ─── list users (admin+ only) ─────────────────── */
router.get('/users', requireJwt, requireRole('superadmin', 'admin', 'owner'), async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.jwtUser!.role !== 'superadmin') {
    filter.companyId = req.jwtUser!.companyId; // admins only see their company's users
  }
  const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();
  res.json({ success: true, users: users.map(safeUser) });
});

/* ── POST /api/auth/users ─── create user (admin+ only) ───────────────── */
router.post('/users', requireJwt, requireRole('superadmin', 'admin', 'owner'), async (req: Request, res: Response) => {
  const { email, password, name, role, companyId } = req.body;
  if (!email || !password || !name || !role) {
    res.status(400).json({ success: false, error: 'email, password, name, role required' });
    return;
  }
  // Company admins/owners cannot create superadmin
  if (req.jwtUser!.role !== 'superadmin' && role === 'superadmin') {
    res.status(403).json({ success: false, error: 'Cannot create superadmin' });
    return;
  }
  // Company admins/owners can only create users for their own company
  const targetCompanyId = req.jwtUser!.role !== 'superadmin' ? req.jwtUser!.companyId : companyId;

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    res.status(409).json({ success: false, error: 'Email already registered' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email: email.toLowerCase().trim(), passwordHash, name, role,
    companyId: targetCompanyId ?? undefined, isActive: true,
  });
  res.status(201).json({ success: true, user: safeUser(user) });
});

/* ── PATCH /api/auth/users/:id ─── update user ────────────────────────── */
router.patch('/users/:id', requireJwt, requireRole('superadmin', 'admin', 'owner'), async (req: Request, res: Response) => {
  const { name, role, isActive, password, companyId } = req.body;
  const update: any = {};
  if (name)     update.name     = name;
  if (role && req.jwtUser!.role === 'superadmin') update.role = role;
  if (isActive !== undefined) update.isActive = isActive;
  if (companyId && req.jwtUser!.role === 'superadmin') update.companyId = companyId;
  if (password) update.passwordHash = await bcrypt.hash(password, 12);

  const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  res.json({ success: true, user: safeUser(user) });
});

/* ── DELETE /api/auth/users/:id ─── delete (superadmin only) ──────────── */
router.delete('/users/:id', requireJwt, requireRole('superadmin'), async (req: Request, res: Response) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted' });
});

/* ── POST /api/auth/init ─── create first superadmin (only if no users) ─ */
router.post('/init', async (req: Request, res: Response) => {
  const count = await User.countDocuments();
  if (count > 0) {
    res.status(409).json({ success: false, error: 'System already initialised' });
    return;
  }
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ success: false, error: 'email, password, name required' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email: email.toLowerCase().trim(), passwordHash, name, role: 'superadmin', isActive: true });
  const token = signToken({ userId: user._id, email: user.email, name: user.name, role: user.role });
  res.status(201).json({ success: true, token, user: safeUser(user) });
});

export default router;
