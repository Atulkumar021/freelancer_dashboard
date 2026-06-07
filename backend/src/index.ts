import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db';

import authRouter        from './routes/auth';
import syncRouter        from './routes/sync';
import dashboardRouter   from './routes/dashboard';
import healthScoreRouter from './routes/healthScore';
import budgetRouter      from './routes/budget';
import cashflowRouter    from './routes/cashflow';
import salesRouter       from './routes/sales';
import purchasesRouter   from './routes/purchases';
import pnlRouter         from './routes/pnl';
import balanceSheetRouter from './routes/balanceSheet';
import ratiosRouter      from './routes/ratios';
import complianceRouter  from './routes/compliance';
import payrollRouter     from './routes/payroll';
import taxPlanningRouter from './routes/taxPlanning';
import commentaryRouter  from './routes/commentary';
import advisoryRouter    from './routes/advisory';
import adminRouter       from './routes/admin';
import statusRouter      from './routes/status';

const app  = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

/* ── Middleware ─────────────────────────────────────────────────────────── */
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:4173',
  'https://ai-dashboard-sigma-five.vercel.app',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Health check ───────────────────────────────────────────────────────── */
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

/* ── Routes ─────────────────────────────────────────────────────────────── */
app.use('/api/auth',          authRouter);
app.use('/api/sync',          syncRouter);
app.use('/api/dashboard',     dashboardRouter);
app.use('/api/health-score',  healthScoreRouter);
app.use('/api/budget',        budgetRouter);
app.use('/api/cashflow',      cashflowRouter);
app.use('/api/sales',         salesRouter);
app.use('/api/purchases',     purchasesRouter);
app.use('/api/pnl',           pnlRouter);
app.use('/api/balance-sheet', balanceSheetRouter);
app.use('/api/ratios',        ratiosRouter);
app.use('/api/compliance',    complianceRouter);
app.use('/api/payroll',       payrollRouter);
app.use('/api/tax-planning',  taxPlanningRouter);
app.use('/api/commentary',    commentaryRouter);
app.use('/api/advisory',      advisoryRouter);
app.use('/api/admin',         adminRouter);
app.use('/api/tally',         statusRouter);

/* ── 404 catch-all ──────────────────────────────────────────────────────── */
app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

/* ── Start ──────────────────────────────────────────────────────────────── */
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[Server] Consultara Backend running on http://localhost:${PORT}`);
    console.log(`[Server] API routes mounted at /api/*`);
  });
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
