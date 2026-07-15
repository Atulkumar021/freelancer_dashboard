import { Router, Request, Response } from 'express';
import Voucher from '../models/voucher';
import Ledger from '../models/ledger';
import StockItem from '../models/stock';
import BankAccount from '../models/bankAccount';
import { getActiveFYRange } from '../helpers';

const router = Router();

const CURR_ASSETS = ['Sundry Debtors','Stock-in-Hand','Cash-in-Hand','Bank Accounts','Other Current Assets'];
const CURR_LIAB   = ['Sundry Creditors','Current Liabilities','Duties & Taxes','Bank OD Account','Provisions'];

router.get('/:companyId', async (req: Request, res: Response) => {
  const companyId = req.params.companyId as string;
  const fyParam   = typeof req.query.fy === 'string' ? req.query.fy : undefined;
  const { start: fyStart, end: fyEnd } = await getActiveFYRange(companyId, fyParam);

  const [currAssets, currLiab, debtors, creditors, ledgerStock, stockItems, salesA, purchaseA, odAccounts] = await Promise.all([
    Ledger.find({ companyId, group: { $in: CURR_ASSETS } }).select('closingBalance').lean(),
    Ledger.find({ companyId, group: { $in: CURR_LIAB } }).select('closingBalance').lean(),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Debtors' } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Creditors' } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    Ledger.aggregate([{ $match: { companyId, group: 'Stock-in-Hand' } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    StockItem.aggregate([{ $match: { companyId } }, { $group: { _id: null, t: { $sum: '$closingStock.amount' } } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Sales',    date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    BankAccount.find({ companyId, isActive: true, accountType: { $in: ['OD', 'CC'] } }).select('odLimit odUsed').lean(),
  ]);

  const sum = (arr: any[]) => arr.reduce((s, l) => s + (l.closingBalance ?? 0), 0);

  const currentAssets      = sum(currAssets);
  const currentLiabilities = sum(currLiab);
  const netWorkingCapital  = currentAssets - currentLiabilities;

  const receivables = (debtors[0] as any)?.t  ?? 0;
  const payables    = (creditors[0] as any)?.t ?? 0;
  const ledgerStockVal = (ledgerStock[0] as any)?.t ?? 0;
  const stockItemVal   = (stockItems[0] as any)?.t  ?? 0;
  const inventory      = ledgerStockVal > 0 ? ledgerStockVal : stockItemVal;

  const revenue  = (salesA[0] as any)?.t    ?? 0;
  const cogs     = (purchaseA[0] as any)?.t ?? 0;

  const receivableDays = revenue > 0 ? +((receivables / revenue) * 365).toFixed(1) : 0;
  const inventoryDays  = cogs    > 0 ? +((inventory   / cogs)    * 365).toFixed(1) : 0;
  const payableDays    = cogs    > 0 ? +((payables    / cogs)    * 365).toFixed(1) : 0;
  const cashConversionCycle = +(receivableDays + inventoryDays - payableDays).toFixed(1);

  const workingCapitalRequirement = inventory + receivables - payables;
  const workingCapitalGap = workingCapitalRequirement - netWorkingCapital;

  const odLimit = odAccounts.reduce((s, b: any) => s + (b.odLimit ?? 0), 0);
  const odUsed  = odAccounts.reduce((s, b: any) => s + (b.odUsed ?? 0), 0);
  const fundUtilisationPct = odLimit > 0 ? +((odUsed / odLimit) * 100).toFixed(1) : 0;

  res.json({
    success: true, companyId,
    summary: {
      currentAssets,
      currentLiabilities,
      netWorkingCapital,
      receivableDays,
      inventoryDays,
      payableDays,
      cashConversionCycle,
      workingCapitalRequirement,
      workingCapitalGap,
      fundUtilisationPct,
      receivables, payables, inventory, revenue, cogs,
    },
  });
});

export default router;
