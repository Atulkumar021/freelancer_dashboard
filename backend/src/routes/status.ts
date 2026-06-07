/**
 * /api/tally/*
 *
 * POST /api/tally/ping       — Agent calls this on startup + every sync cycle
 * GET  /api/tally/status     — Frontend polls this to show connection status
 * GET  /api/tally/status/:companyId — Company-specific status
 */
import { Router, Request, Response } from 'express';
import Company from '../models/company';
import { requireAuth } from '../helpers';

const router = Router();

/* In-memory agent registry (survives process lifetime; no DB write needed) */
interface AgentRecord {
  companyId: string;
  agentVersion: string;
  tallyHost: string;
  lastPingAt: Date;
  ip: string;
}

const agentRegistry = new Map<string, AgentRecord>();

/* ── POST /api/tally/ping ─────────────────────────────────────────────
   Agent sends this on startup and before every flush.
   We update in-memory registry + Company.lastSyncAt.
───────────────────────────────────────────────────────────────────────── */
router.post('/ping', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { companyId, agentVersion = '1.0.0', tallyHost = 'http://localhost:9000' } = req.body;

  if (!companyId) {
    res.status(400).json({ success: false, error: 'companyId required' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  agentRegistry.set(companyId, {
    companyId,
    agentVersion,
    tallyHost,
    lastPingAt: new Date(),
    ip,
  });

  // Update company record
  await Company.findOneAndUpdate(
    { companyId },
    { $set: { lastSyncAt: new Date(), status: 'active', agentVersion } },
    { upsert: true }
  );

  res.json({
    success: true,
    message: 'Agent registered',
    companyId,
    serverTime: new Date().toISOString(),
  });
});

/* ── GET /api/tally/status/:companyId ────────────────────────────────
   Returns whether this company's agent is currently connected.
   "Connected" = pinged within the last 60 seconds.
───────────────────────────────────────────────────────────────────────── */
router.get('/status/:companyId', async (req: Request, res: Response) => {
  const companyId = req.params.companyId as string;

  const company = await Company.findOne({ companyId }).lean() as any;
  const agent   = agentRegistry.get(companyId);

  const now = Date.now();
  const CONNECTED_THRESHOLD_MS = 60_000; // 60 seconds

  let agentConnected = false;
  let secondsSinceLastPing: number | null = null;

  if (agent) {
    const elapsed = now - agent.lastPingAt.getTime();
    agentConnected = elapsed < CONNECTED_THRESHOLD_MS;
    secondsSinceLastPing = Math.floor(elapsed / 1000);
  }

  let secondsSinceLastSync: number | null = null;
  if (company?.lastSyncAt) {
    secondsSinceLastSync = Math.floor((now - new Date(company.lastSyncAt).getTime()) / 1000);
  }

  res.json({
    success: true,
    companyId,
    agentConnected,
    tallyHost: agent?.tallyHost ?? 'unknown',
    agentVersion: agent?.agentVersion ?? null,
    lastPingAt: agent?.lastPingAt?.toISOString() ?? null,
    secondsSinceLastPing,
    lastSyncAt: company?.lastSyncAt ?? null,
    secondsSinceLastSync,
    companyName: (company as any)?.name ?? null,
    syncStatus: company ? (company as any).status : 'never_connected',
  });
});

/* ── GET /api/tally/status  (all companies) ──────────────────────────── */
router.get('/status', async (_req: Request, res: Response) => {
  const now = Date.now();
  const CONNECTED_THRESHOLD_MS = 60_000;

  const companies = await Company.find({}).lean() as any[];

  const result = companies.map((c: any) => {
    const agent = agentRegistry.get(c.companyId);
    const elapsed = agent ? now - agent.lastPingAt.getTime() : Infinity;
    return {
      companyId:         c.companyId,
      companyName:       c.name,
      agentConnected:    elapsed < CONNECTED_THRESHOLD_MS,
      lastSyncAt:        c.lastSyncAt,
      secondsSinceLastSync: c.lastSyncAt
        ? Math.floor((now - new Date(c.lastSyncAt).getTime()) / 1000)
        : null,
      agentVersion: agent?.agentVersion ?? null,
    };
  });

  res.json({ success: true, companies: result, total: result.length });
});

export default router;
