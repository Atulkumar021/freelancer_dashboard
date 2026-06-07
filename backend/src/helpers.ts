import { Request, Response } from 'express';

export function getCurrentFYRange(): { start: Date; end: Date; label: string } {
  // Use FY_YEAR env var (e.g. "2024-25") when data doesn't match the current system year
  const envFY = process.env.FY_YEAR;
  let fyStart: number;
  if (envFY) {
    fyStart = parseInt(envFY.split('-')[0], 10);
  } else {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth(); // 0-indexed; April = 3
    fyStart = month >= 3 ? year : year - 1;
  }
  return {
    start: new Date(fyStart, 3, 1),
    end:   new Date(fyStart + 1, 2, 31, 23, 59, 59, 999),
    label: `${fyStart}-${String(fyStart + 1).slice(2)}`,
  };
}

export function getFYRange(label: string): { start: Date; end: Date } {
  const startYear = parseInt(label.split('-')[0], 10);
  return {
    start: new Date(startYear, 3, 1),
    end:   new Date(startYear + 1, 2, 31, 23, 59, 59, 999),
  };
}

export function scoreBand(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Moderate';
  if (score >= 40) return 'Needs Attention';
  return 'Critical';
}

export function requireAuth(req: Request, res: Response): boolean {
  const auth  = req.headers['authorization'] ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token !== process.env.API_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

export function badRequest(res: Response, msg: string): void {
  res.status(400).json({ success: false, error: msg });
}
