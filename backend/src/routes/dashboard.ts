import { Router, Request, Response } from 'express';
import Voucher from '../models/voucher';
import Ledger from '../models/ledger';
import StockItem from '../models/stock';
import Company from '../models/company';
import BankAccount from '../models/bankAccount';
import LoanEmi from '../models/loanEmi';
import ComplianceFiling from '../models/complianceFiling';
import PayrollRecord from '../models/payrollRecord';
import HealthScore from '../models/healthScore';
import BudgetItem from '../models/budgetItem';
import { getCurrentFYRange } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { start: fyStart, end: fyEnd, label: fyLabel } = getCurrentFYRange();
  const today   = new Date();
  const in14    = new Date(today.getTime() + 14 * 86_400_000);
  const in30    = new Date(today.getTime() + 30 * 86_400_000);

  const [
    salesByMonth, purchasesByMonth, receiptsByMonth, paymentsByMonth,
    cashBankLedgers, receivablesAgg, payablesAgg,
    topDebtors, topCreditors, bankAccounts, upcomingEMIs,
    complianceAlerts, latestPayroll, latestHealthScore,
    budgetYTD, companyInfo, inventoryValue,
  ] = await Promise.all([
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Sales',    date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Receipt',  date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Payment',  date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    Ledger.find({ companyId, group: { $in: ['Cash-in-Hand','Bank Accounts'] } }).select('name group closingBalance isDr').lean(),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Debtors',   isDr: true  } }, { $group: { _id: null, total: { $sum: '$closingBalance' }, count: { $sum: 1 } } }]),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Creditors', isDr: false } }, { $group: { _id: null, total: { $sum: '$closingBalance' }, count: { $sum: 1 } } }]),
    Ledger.find({ companyId, group: 'Sundry Debtors',   isDr: true  }).sort({ closingBalance: -1 }).limit(10).select('name closingBalance gstin').lean(),
    Ledger.find({ companyId, group: 'Sundry Creditors', isDr: false }).sort({ closingBalance: -1 }).limit(10).select('name closingBalance gstin').lean(),
    BankAccount.find({ companyId, isActive: true }).sort({ accountType: 1 }).lean(),
    LoanEmi.find({ companyId, isPaid: false, dueDate: { $lte: in30 } }).sort({ dueDate: 1 }).limit(5).lean(),
    ComplianceFiling.find({ companyId, $or: [{ status: 'overdue' }, { status: 'due-soon' }, { dueDate: { $lte: in14, $gte: today } }] }).sort({ dueDate: 1 }).limit(10).lean(),
    PayrollRecord.findOne({ companyId }).sort({ financialYear: -1, month: -1 }).lean(),
    HealthScore.findOne({ companyId }).sort({ financialYear: -1, month: -1 }).lean(),
    BudgetItem.find({ companyId, financialYear: fyLabel, month: 0 }).lean(),
    Company.findOne({ companyId }).lean(),
    StockItem.aggregate([{ $match: { companyId } }, { $group: { _id: null, total: { $sum: '$closingStock.amount' }, count: { $sum: 1 } } }]),
  ]);

  const totalSalesYTD     = salesByMonth.reduce((s: number, m: any) => s + m.total, 0);
  const totalPurchasesYTD = purchasesByMonth.reduce((s: number, m: any) => s + m.total, 0);
  const totalCashBank     = cashBankLedgers.reduce((s: number, l: any) => s + (l.closingBalance ?? 0), 0);
  const totalReceivables  = (receivablesAgg[0] as any)?.total ?? 0;
  const totalPayables     = (payablesAgg[0] as any)?.total    ?? 0;
  const totalInventory    = (inventoryValue[0] as any)?.total  ?? 0;
  const lastMonthSales    = (salesByMonth.at(-1) as any)?.total ?? 1;
  const dso               = Math.round((totalReceivables / lastMonthSales) * 30);

  res.json({
    success: true, companyId, company: companyInfo, lastSyncAt: (companyInfo as any)?.lastSyncAt ?? null,
    financialYear: { label: fyLabel, from: fyStart.toISOString(), to: fyEnd.toISOString() },
    summary: { totalSalesYTD, totalPurchasesYTD, totalCashBank, totalReceivables, totalPayables, totalInventory, dso, debtorCount: (receivablesAgg[0] as any)?.count ?? 0, creditorCount: (payablesAgg[0] as any)?.count ?? 0 },
    salesByMonth, purchasesByMonth, receiptsByMonth, paymentsByMonth,
    cashBankLedgers, topDebtors, topCreditors, bankAccounts,
    upcomingEMIs, complianceAlerts, latestPayroll, healthScore: latestHealthScore, budgetYTD,
  });
});

export default router;
