import { Router, Request, Response } from 'express';
import Ledger from '../models/ledger';
import Voucher from '../models/voucher';
import ComplianceFiling from '../models/complianceFiling';
import HealthScore from '../models/healthScore';
import { getActiveFYRange, scoreBand } from '../helpers';

const router = Router();

async function computeScore(companyId: string, fyParam?: string) {
  const { start: fyStart, end: fyEnd, label: fyLabel } = await getActiveFYRange(companyId, fyParam);
  const now = new Date();
  const month = now.getMonth() < 3 ? now.getMonth() + 10 : now.getMonth() - 2;

  const [debtorsA, creditorsA, cashA, salesA, purchasesA, netProfitA, filings, equityA, debtA] = await Promise.all([
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Debtors', isDr: true } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Creditors', isDr: false } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: { $in: ['Cash-in-Hand','Bank Accounts'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Sales', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: { $in: ['Sales','Purchase'] }, date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: '$voucherType', total: { $sum: '$amount' } } }]),
    ComplianceFiling.find({ companyId }).lean(),
    Ledger.aggregate([{ $match: { companyId, group: { $in: ['Capital Account','Reserves & Surplus'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: { $in: ['Secured Loans','Unsecured Loans','Bank OD Account'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
  ]);

  const debtors   = (debtorsA[0] as any)?.t   ?? 0;
  const creditors = (creditorsA[0] as any)?.t  ?? 0;
  const cash      = (cashA[0] as any)?.t       ?? 0;
  const sales     = (salesA[0] as any)?.t      ?? 1;
  const purchases = (purchasesA[0] as any)?.t  ?? 0;
  const equity    = (equityA[0] as any)?.t     ?? 1;
  const debt      = (debtA[0] as any)?.t       ?? 0;
  const salesMap  = Object.fromEntries((netProfitA as any[]).map((r) => [r._id, r.total]));
  const gp        = (salesMap['Sales'] ?? 0) - (salesMap['Purchase'] ?? 0);
  const gpPct     = sales > 0 ? (gp / sales) * 100 : 0;
  const monthSales = sales / 7;
  const dso = Math.round((debtors / monthSales) * 30);
  const de  = equity > 0 ? debt / equity : 99;
  const cr  = creditors > 0 ? (debtors + cash) / creditors : 2;
  const totalF   = filings.length || 1;
  const overdueF = (filings as any[]).filter((f) => f.status === 'overdue').length;

  const profScore = Math.min(20, gpPct >= 35 ? 16 : gpPct >= 25 ? 13 : gpPct >= 15 ? 10 : 6);
  const liqScore  = Math.min(20, cr >= 2 ? 20 : cr >= 1.5 ? 15 : cr >= 1 ? 10 : 5);
  const effScore  = Math.min(15, dso <= 38 ? 15 : dso <= 50 ? 12 : dso <= 65 ? 8 : dso <= 90 ? 5 : 2);
  const solvScore = Math.min(15, de <= 0.5 ? 15 : de <= 1 ? 12 : de <= 1.5 ? 9 : de <= 2 ? 6 : 3);
  const compScore = Math.min(15, Math.round(((totalF - overdueF) / totalF) * 15));
  const growScore = sales > 0 ? 8 : 4;
  const cfScore   = cash > monthSales * 1.5 ? 5 : cash > monthSales ? 3 : 1;
  const totalScore = profScore + liqScore + effScore + solvScore + compScore + growScore + cfScore;

  const dimensions = [
    { name: 'Profitability',     score: profScore, maxScore: 20, detail: `Gross margin ${gpPct.toFixed(1)}%`,          metrics: { gpPct, gp } },
    { name: 'Liquidity',         score: liqScore,  maxScore: 20, detail: `Current ratio ${cr.toFixed(2)}x`,            metrics: { cr, cash } },
    { name: 'Efficiency',        score: effScore,  maxScore: 15, detail: `DSO ${dso} days vs benchmark 38`,            metrics: { dso, debtors } },
    { name: 'Solvency',          score: solvScore, maxScore: 15, detail: `D/E ${de.toFixed(2)}x`,                      metrics: { de, debt, equity } },
    { name: 'Compliance',        score: compScore, maxScore: 15, detail: `${totalF - overdueF}/${totalF} current`,     metrics: { totalF, overdueF } },
    { name: 'Growth',            score: growScore, maxScore: 10, detail: 'Revenue trajectory',                         metrics: { sales } },
    { name: 'Cash Flow Quality', score: cfScore,   maxScore: 5,  detail: `Cash ${(cash / 100000).toFixed(1)} L`,       metrics: { cash } },
  ];

  return HealthScore.findOneAndUpdate(
    { companyId, financialYear: fyLabel, month },
    { $set: { totalScore, bandLabel: scoreBand(totalScore), dimensions, computedAt: new Date() } },
    { upsert: true, new: true }
  ).lean();
}

router.get('/:companyId', async (req: Request, res: Response) => {
  const companyId = req.params.companyId as string;
  const fyParam   = typeof req.query.fy === 'string' ? req.query.fy : undefined;
  const [current, trend] = await Promise.all([
    computeScore(companyId, fyParam),
    HealthScore.find({ companyId }).sort({ financialYear: 1, month: 1 }).lean(),
  ]);
  res.json({ success: true, current, trend });
});

export default router;
