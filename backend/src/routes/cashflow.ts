import { Router, Request, Response } from 'express';
import Voucher from '../models/voucher';
import Ledger from '../models/ledger';
import BankAccount from '../models/bankAccount';
import LoanEmi from '../models/loanEmi';
import FixedDeposit from '../models/fixedDeposit';
import { getCurrentFYRange } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { start: fyStart, end: fyEnd } = getCurrentFYRange();
  const today   = new Date();
  const in30    = new Date(today.getTime() + 30  * 86_400_000);
  const in90    = new Date(today.getTime() + 90  * 86_400_000);

  const [cashBankLedgers, monthlyReceipts, monthlyPayments, bankAccounts, upcomingEMIs, maturingFDs, inflows, outflows] = await Promise.all([
    Ledger.find({ companyId, group: { $in: ['Cash-in-Hand','Bank Accounts'] } }).select('name group closingBalance isDr').lean(),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Receipt', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Payment', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    BankAccount.find({ companyId, isActive: true }).lean(),
    LoanEmi.find({ companyId, isPaid: false, dueDate: { $lte: in30 } }).sort({ dueDate: 1 }).lean(),
    FixedDeposit.find({ companyId, isMatured: false, maturityDate: { $lte: in90 } }).sort({ maturityDate: 1 }).lean(),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Receipt', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Payment', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  const totalCash      = (cashBankLedgers as any[]).reduce((s, l) => s + (l.closingBalance ?? 0), 0);
  const totalReceipts  = (inflows[0] as any)?.total  ?? 0;
  const totalPayments  = (outflows[0] as any)?.total ?? 0;
  const odSummary      = (bankAccounts as any[]).filter((b) => ['OD','CC'].includes(b.accountType)).map((od) => ({
    bankName: od.bankName, accountType: od.accountType,
    limit: od.odLimit ?? 0, used: od.odUsed ?? 0,
    available: (od.odLimit ?? 0) - (od.odUsed ?? 0),
    utilPct: od.odLimit ? Math.round(((od.odUsed ?? 0) / od.odLimit) * 100) : 0,
  }));

  res.json({ success: true, companyId, summary: { totalCash, netOperatingCF: totalReceipts - totalPayments, totalReceipts, totalPayments }, cashBankLedgers, bankAccounts, odSummary, monthlyReceipts, monthlyPayments, upcomingEMIs, maturingFDs });
});

export default router;
