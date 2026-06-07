import { Router, Request, Response } from 'express';
import Voucher from '../models/voucher';
import Ledger from '../models/ledger';
import { getCurrentFYRange } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { start: fyStart, end: fyEnd } = getCurrentFYRange();

  const [salesA, purchasesA, debtorsA, creditorsA, cashA, stockA, equityA, debtA, totalLedgers, finCostA, depA] = await Promise.all([
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Sales',    date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Debtors',   isDr: true  } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Creditors', isDr: false } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: { $in: ['Cash-in-Hand','Bank Accounts'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: 'Stock-in-Hand' } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: { $in: ['Capital Account','Reserves & Surplus'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: { $in: ['Secured Loans','Unsecured Loans','Bank OD Account'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.find({ companyId }).select('closingBalance').lean(),
    Ledger.aggregate([{ $match: { companyId, group: 'Finance Charges' } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, name: { $regex: /depreciation/i } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
  ]);

  const rev   = (salesA[0] as any)?.t     ?? 1;
  const cogs  = (purchasesA[0] as any)?.t ?? 0;
  const gp    = rev - cogs;
  const deb   = (debtorsA[0] as any)?.t   ?? 0;
  const cred  = (creditorsA[0] as any)?.t ?? 0;
  const cash  = (cashA[0] as any)?.t      ?? 0;
  const stock = (stockA[0] as any)?.t     ?? 0;
  const eq    = (equityA[0] as any)?.t    ?? 1;
  const debt  = (debtA[0] as any)?.t      ?? 0;
  const ta    = (totalLedgers as any[]).reduce((s, l) => s + (l.closingBalance ?? 0), 0) || 1;
  const fin   = (finCostA[0] as any)?.t   ?? 0;
  const dep   = (depA[0] as any)?.t       ?? 0;
  const ebit  = gp - dep;
  const ca = deb + cash + stock;
  const ms = rev / 7;

  res.json({
    success: true, companyId,
    ratios: {
      grossMarginPct:   rev > 0 ? +((gp / rev) * 100).toFixed(2) : 0,
      netMarginPct:     rev > 0 ? +(((gp - fin - dep) / rev) * 100).toFixed(2) : 0,
      roa:              +((gp / ta) * 100).toFixed(2),
      roe:              eq > 0 ? +((gp / eq) * 100).toFixed(2) : 0,
      currentRatio:     cred > 0 ? +(ca / cred).toFixed(2) : 0,
      quickRatio:       cred > 0 ? +((deb + cash) / cred).toFixed(2) : 0,
      cashRatio:        cred > 0 ? +(cash / cred).toFixed(2) : 0,
      debtEquity:       eq > 0 ? +(debt / eq).toFixed(2) : 0,
      interestCoverage: fin > 0 ? +(ebit / fin).toFixed(2) : 0,
      debtToAssets:     +(debt / ta).toFixed(2),
      dso:              Math.round((deb / ms) * 30),
      dpo:              cred > 0 && cogs > 0 ? Math.round((cred / (cogs / 7)) * 30) : 0,
      dsi:              stock > 0 && cogs > 0 ? Math.round((stock / (cogs / 7)) * 30) : 0,
      assetTurnover:    +(rev / ta).toFixed(2),
      ytdRevenue: rev, ytdCOGS: cogs, ytdGrossProfit: gp,
    },
  });
});

export default router;
