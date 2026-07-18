import { Router, Request, Response } from 'express';
import BankAccount from '../models/bankAccount';
import LoanEmi from '../models/loanEmi';
import FixedDeposit from '../models/fixedDeposit';
import BudgetItem from '../models/budgetItem';
import ComplianceFiling from '../models/complianceFiling';
import PayrollRecord from '../models/payrollRecord';
import Commentary from '../models/commentary';
import AdvisoryAction from '../models/advisoryAction';
import TaxPlanning from '../models/taxPlanning';
import Voucher from '../models/voucher';
import Ledger from '../models/ledger';
import StockItem from '../models/stock';
import Company from '../models/company';
import { requireAuth, badRequest } from '../helpers';

const router = Router();

/* ── Bank Accounts ──────────────────────────────────────────────────────── */
router.get('/bank-accounts/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accounts = await BankAccount.find({ companyId: req.params.companyId }).sort({ bankName: 1 }).lean();
  res.json({ success: true, accounts });
});

router.post('/bank-accounts/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const account = await BankAccount.create({ ...req.body, companyId: req.params.companyId });
  res.status(201).json({ success: true, account });
});

router.patch('/bank-accounts/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId, ...update } = req.body;
  if (!accountId) { badRequest(res, 'accountId required'); return; }
  const account = await BankAccount.findOneAndUpdate({ _id: accountId, companyId: req.params.companyId }, { $set: update }, { new: true }).lean();
  if (!account) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, account });
});

router.delete('/bank-accounts/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.query as { accountId?: string };
  if (!accountId) { badRequest(res, 'accountId required'); return; }
  await BankAccount.findOneAndDelete({ _id: accountId, companyId: req.params.companyId });
  res.json({ success: true, message: 'Deleted' });
});

/* ── Loan EMIs ──────────────────────────────────────────────────────────── */
router.get('/loans/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const emis = await LoanEmi.find({ companyId: req.params.companyId }).sort({ dueDate: 1 }).lean();
  res.json({ success: true, emis });
});

router.post('/loans/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const emi = await LoanEmi.create({ ...req.body, companyId: req.params.companyId });
  res.status(201).json({ success: true, emi });
});

router.patch('/loans/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { emiId, isPaid, paidDate } = req.body;
  if (!emiId) { badRequest(res, 'emiId required'); return; }
  const emi = await LoanEmi.findOneAndUpdate({ _id: emiId, companyId: req.params.companyId }, { $set: { isPaid: isPaid ?? true, paidDate: paidDate ? new Date(paidDate) : new Date() } }, { new: true }).lean();
  if (!emi) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, emi });
});

/* ── Fixed Deposits ─────────────────────────────────────────────────────── */
router.get('/fds/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const filter: Record<string, unknown> = { companyId: req.params.companyId };
  if (req.query.includeMatured !== 'true') filter.isMatured = false;
  const fds = await FixedDeposit.find(filter).sort({ maturityDate: 1 }).lean();
  res.json({ success: true, fds });
});

router.post('/fds/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const fd = await FixedDeposit.create({ ...req.body, companyId: req.params.companyId });
  res.status(201).json({ success: true, fd });
});

router.patch('/fds/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { fdId, isMatured, isRenewed, renewedFdId } = req.body;
  if (!fdId) { badRequest(res, 'fdId required'); return; }
  const fd = await FixedDeposit.findOneAndUpdate({ _id: fdId, companyId: req.params.companyId }, { $set: { isMatured: isMatured ?? true, isRenewed: isRenewed ?? false, renewedFdId } }, { new: true }).lean();
  if (!fd) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, fd });
});

/* ── Seed (disabled) ────────────────────────────────────────────────────── */
router.post('/seed/:companyId', (_req: Request, res: Response) => {
  res.status(410).json({ success: false, error: 'Demo seed endpoint has been disabled. All data must come from Tally sync.' });
});

/* ── Purge fake/seeded data ─────────────────────────────────────────────── */
router.post('/purge-demo/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId } = req.params;

  const [v1, v2, l1, s1, b1, e1, f1, bu1, cf1, pr1, cm1, aa1, tp1] = await Promise.all([
    Voucher.deleteMany({ companyId, syncId: { $regex: '-seed-' } }),
    Voucher.deleteMany({ companyId, partyName: { $in: ['Various Customers', 'Various Suppliers'] } }),
    Ledger.deleteMany({ companyId, syncId: { $regex: `-ledger-` } }),
    StockItem.deleteMany({ companyId, syncId: { $regex: '-stock-seed-' } }),
    BankAccount.deleteMany({ companyId, accountNumber: { $in: ['****4521', '****8810', '****2274', '****9032'] } }),
    LoanEmi.deleteMany({ companyId, loanPurpose: { $in: ['Term Loan (Plant)', 'Vehicle Loan', 'MSME Term Loan'] } }),
    FixedDeposit.deleteMany({ companyId, bankName: 'Kotak Bank' }),
    BudgetItem.deleteMany({ companyId }),
    ComplianceFiling.deleteMany({ companyId, filingName: { $in: ['GSTR-1 (Monthly)', 'GSTR-3B (Monthly)', 'TDS Return Q2', 'Advance Tax Q3', 'PF Challan', 'MGT-7 (Annual Return)'] } }),
    PayrollRecord.deleteMany({ companyId, totalEmployees: 42 }),
    Commentary.deleteMany({ companyId, preparedBy: 'Radhika Mehta' }),
    AdvisoryAction.deleteMany({ companyId, actionId: { $in: ['ADV-001', 'ADV-002', 'ADV-003'] } }),
    TaxPlanning.deleteMany({ companyId }),
  ]);

  await Company.updateOne({ companyId, name: 'Delhi Textile Industries' }, { $unset: { name: '' } });

  res.json({
    success: true,
    message: `Purged all demo/seeded data for ${companyId}`,
    deleted: {
      vouchersBySyncId: v1.deletedCount,
      vouchersByFakeParty: v2.deletedCount,
      ledgers: l1.deletedCount,
      stock: s1.deletedCount,
      bankAccounts: b1.deletedCount,
      loanEmis: e1.deletedCount,
      fixedDeposits: f1.deletedCount,
      budgetItems: bu1.deletedCount,
      complianceFilings: cf1.deletedCount,
      payrollRecords: pr1.deletedCount,
      commentary: cm1.deletedCount,
      advisoryActions: aa1.deletedCount,
      taxPlanning: tp1.deletedCount,
    },
  });
});

export default router;
