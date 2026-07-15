import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db';

import authRouter          from './routes/auth';
import syncRouter          from './routes/sync';
import dashboardRouter     from './routes/dashboard';
import healthScoreRouter   from './routes/healthScore';
import budgetRouter        from './routes/budget';
import cashflowRouter      from './routes/cashflow';
import salesRouter         from './routes/sales';
import purchasesRouter     from './routes/purchases';
import pnlRouter           from './routes/pnl';
import balanceSheetRouter  from './routes/balanceSheet';
import workingCapitalRouter from './routes/workingCapital';
import ratiosRouter        from './routes/ratios';
import complianceRouter    from './routes/compliance';
import payrollRouter       from './routes/payroll';
import taxPlanningRouter   from './routes/taxPlanning';
import commentaryRouter    from './routes/commentary';
import advisoryRouter      from './routes/advisory';
import adminRouter         from './routes/admin';
import statusRouter        from './routes/status';
import companiesRouter     from './routes/companies';
import activityRouter      from './routes/activity';

import { requireJwt, requireCompanyAccess } from './middleware/authMiddleware';

const app  = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

/* ── Middleware ─────────────────────────────────────────────────────────── */
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
  'https://dashboard.consultara.co.in',
  'https://ai-dashboard-sigma-five.vercel.app',
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : []),
];
console.log('[CORS] Allowed origins:', allowedOrigins);

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    console.warn(`[CORS] Blocked request from: ${origin}`);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 204,
};

// Handle preflight OPTIONS for every route BEFORE any auth middleware
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Health check ───────────────────────────────────────────────────────── */
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

/* ── Auth + management routes (own auth per endpoint) ───────────────────── */
app.use('/api/auth',       authRouter);
app.use('/api/sync',       syncRouter);
app.use('/api/admin',      adminRouter);
app.use('/api/tally',      statusRouter);
app.use('/api/companies',  companiesRouter);
app.use('/api/activity',   activityRouter);

/* ── Data routes — protected by JWT + company-level access control ──────── */
app.use('/api/dashboard',       requireJwt, requireCompanyAccess, dashboardRouter);
app.use('/api/health-score',    requireJwt, requireCompanyAccess, healthScoreRouter);
app.use('/api/budget',          requireJwt, requireCompanyAccess, budgetRouter);
app.use('/api/cashflow',        requireJwt, requireCompanyAccess, cashflowRouter);
app.use('/api/sales',           requireJwt, requireCompanyAccess, salesRouter);
app.use('/api/purchases',       requireJwt, requireCompanyAccess, purchasesRouter);
app.use('/api/pnl',             requireJwt, requireCompanyAccess, pnlRouter);
app.use('/api/balance-sheet',   requireJwt, requireCompanyAccess, balanceSheetRouter);
app.use('/api/working-capital', requireJwt, requireCompanyAccess, workingCapitalRouter);
app.use('/api/ratios',          requireJwt, requireCompanyAccess, ratiosRouter);
app.use('/api/compliance',      requireJwt, requireCompanyAccess, complianceRouter);
app.use('/api/payroll',         requireJwt, requireCompanyAccess, payrollRouter);
app.use('/api/tax-planning',    requireJwt, requireCompanyAccess, taxPlanningRouter);
app.use('/api/commentary',      requireJwt, requireCompanyAccess, commentaryRouter);
app.use('/api/advisory',        requireJwt, requireCompanyAccess, advisoryRouter);

/* ── 404 catch-all ──────────────────────────────────────────────────────── */
app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

/* ── Start ──────────────────────────────────────────────────────────────── */
async function start() {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Consultara Backend running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] API routes mounted at /api/*`);
  });
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
