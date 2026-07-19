import { Router, Request, Response } from 'express';
import Voucher from '../models/voucher';
import Ledger from '../models/ledger';
import { getActiveFYRange } from '../helpers';

const router = Router();

const CURR_LIAB_GROUPS = ['Sundry Creditors','Current Liabilities','Duties & Taxes','Bank OD Account','Provisions'];

router.get('/:companyId', async (req: Request, res: Response) => {
  const companyId = req.params.companyId as string;
  const fyParam   = typeof req.query.fy === 'string' ? req.query.fy : undefined;
  const { start: fyStart, end: fyEnd } = await getActiveFYRange(companyId, fyParam);

  const [salesA, purchasesA, debtorsA, creditorsA, cashA, stockA, equityA, debtA, totalLedgers, finCostA, depA, totalCLAgg] = await Promise.all([
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Sales',    date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Debtors',   isDr: true  } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Creditors', isDr: false } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: { $in: ['Cash-in-Hand','Bank Accounts'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: 'Stock-in-Hand' } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: { $in: ['Capital Account','Reserves & Surplus'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: { $in: ['Secured Loans','Unsecured Loans','Bank OD Account'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: { $in: ['Finance Charges','Interest Paid'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, name: { $regex: /depreciation/i } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: { $in: CURR_LIAB_GROUPS } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
  ]);

  const rev      = (salesA[0] as any)?.t     ?? 1;
  const cogs     = (purchasesA[0] as any)?.t ?? 0;
  const gp       = rev - cogs;
  const deb      = (debtorsA[0] as any)?.t   ?? 0;
  const cred     = (creditorsA[0] as any)?.t ?? 0;
  const cash     = (cashA[0] as any)?.t      ?? 0;
  const stock    = (stockA[0] as any)?.t     ?? 0;
  const eq       = (equityA[0] as any)?.t    ?? 1;
  const debt     = (debtA[0] as any)?.t      ?? 0;
  const ta       = (totalLedgers[0] as any)?.t ?? 1;
  const fin      = (finCostA[0] as any)?.t   ?? 0;
  const dep      = (depA[0] as any)?.t       ?? 0;
  const totalCL  = (totalCLAgg[0] as any)?.t ?? cred;  // fall back to cred if no data

  const netIncome = gp - fin - dep;     // approximate net income
  const ca        = deb + cash + stock;

  // DSO/DPO/DSI: standard formula = (metric / annualRevenue|COGS) * 360
  const dso = rev  > 0 ? Math.round((deb   / rev)  * 360) : 0;
  const dpo = cogs > 0 ? Math.round((cred  / cogs) * 360) : 0;
  const dsi = cogs > 0 ? Math.round((stock / cogs) * 360) : 0;

  res.json({
    success: true, companyId,
    ratios: {
      grossMarginPct:   rev > 0 ? +((gp / rev) * 100).toFixed(2) : 0,
      netMarginPct:     rev > 0 ? +((netIncome / rev) * 100).toFixed(2) : 0,
      roa:              ta  > 0 ? +((netIncome / ta)  * 100).toFixed(2) : 0,
      roe:              eq  > 0 ? +((netIncome / eq)  * 100).toFixed(2) : 0,
      currentRatio:     totalCL > 0 ? +(ca / totalCL).toFixed(2) : 0,
      quickRatio:       totalCL > 0 ? +((deb + cash) / totalCL).toFixed(2) : 0,
      cashRatio:        totalCL > 0 ? +(cash / totalCL).toFixed(2) : 0,
      debtEquity:       eq > 0 ? +(debt / eq).toFixed(2) : 0,
      interestCoverage: fin > 0 ? +((gp - dep) / fin).toFixed(2) : 0,
      debtToAssets:     ta > 0 ? +(debt / ta).toFixed(2) : 0,
      dso, dpo, dsi,
      assetTurnover:    ta > 0 ? +(rev / ta).toFixed(2) : 0,
      ytdRevenue: rev, ytdCOGS: cogs, ytdGrossProfit: gp,
    },
  });
});

export default router;
