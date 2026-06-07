import { Router, Request, Response } from 'express';
import Company from '../models/company';
import BankAccount from '../models/bankAccount';
import LoanEmi from '../models/loanEmi';
import FixedDeposit from '../models/fixedDeposit';
import BudgetItem from '../models/budgetItem';
import ComplianceFiling from '../models/complianceFiling';
import PayrollRecord from '../models/payrollRecord';
import Commentary from '../models/commentary';
import AdvisoryAction from '../models/advisoryAction';
import TaxPlanning from '../models/taxPlanning';
import Voucher   from '../models/voucher';
import Ledger    from '../models/ledger';
import StockItem from '../models/stock';
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

/* ── Seed ───────────────────────────────────────────────────────────────── */
router.post('/seed/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId } = req.params;

  const fy = process.env.FY_YEAR ?? '2024-25';
  const fyStartYear = parseInt(fy.split('-')[0], 10);
  await Company.findOneAndUpdate(
    { companyId },
    { $set: { companyId, name: 'Delhi Textile Industries', financialYearFrom: new Date(`${fyStartYear}-04-01`), status: 'active', lastSyncAt: new Date() } },
    { upsert: true }
  );

  const bankSeeds = [
    { bankName: 'HDFC Bank', branch: 'Mumbai', accountNumber: '****4521', accountType: 'Current', bookBalance: 14200000, statementBalance: 14600000, differenceAmt: 400000, lastReconciliationDate: new Date('2025-10-12'), isActive: true },
    { bankName: 'ICICI Bank', branch: 'Delhi', accountNumber: '****8810', accountType: 'Current', bookBalance: 6840000, statementBalance: 6840000, differenceAmt: 0, lastReconciliationDate: new Date('2025-10-14'), isActive: true },
    { bankName: 'Axis Bank', branch: 'Bengaluru', accountNumber: '****2274', accountType: 'OD', bookBalance: 5260000, statementBalance: 5260000, differenceAmt: 0, odLimit: 20000000, odUsed: 16200000, lastReconciliationDate: new Date('2025-10-14'), isActive: true },
    { bankName: 'SBI', branch: 'Treasury', accountNumber: '****9032', accountType: 'Current', bookBalance: 3840000, statementBalance: 3840000, differenceAmt: 0, lastReconciliationDate: new Date('2025-10-13'), isActive: true },
  ];
  for (const b of bankSeeds) {
    await BankAccount.findOneAndUpdate({ companyId, accountNumber: b.accountNumber }, { $set: { ...b, companyId } }, { upsert: true });
  }

  const emiSeeds = [
    { bankName: 'HDFC Bank', loanPurpose: 'Term Loan (Plant)', emiAmount: 840000, dueDate: new Date('2025-11-15'), outstandingPrincipal: 42000000, interestRate: 9.5, tenureMonths: 84, remainingEMIs: 50, principalAmount: 50000000 },
    { bankName: 'Axis Bank', loanPurpose: 'Vehicle Loan', emiAmount: 120000, dueDate: new Date('2025-11-20'), outstandingPrincipal: 2800000, interestRate: 8.5, tenureMonths: 48, remainingEMIs: 23, principalAmount: 4200000 },
    { bankName: 'SBI', loanPurpose: 'MSME Term Loan', emiAmount: 1460000, dueDate: new Date('2025-12-01'), outstandingPrincipal: 32000000, interestRate: 8.25, tenureMonths: 60, remainingEMIs: 22, principalAmount: 40000000 },
  ];
  for (const e of emiSeeds) {
    await LoanEmi.findOneAndUpdate({ companyId, bankName: e.bankName, loanPurpose: e.loanPurpose }, { $set: { ...e, companyId } }, { upsert: true });
  }

  const fdSeeds = [
    { bankName: 'Kotak Bank', principalAmount: 2500000, interestRate: 7.5, maturityDate: new Date('2025-11-12'), depositDate: new Date('2024-11-12'), tenureDays: 365, isMatured: false, isRenewed: false },
    { bankName: 'HDFC Bank', principalAmount: 5000000, interestRate: 7.25, maturityDate: new Date('2025-12-18'), depositDate: new Date('2024-12-18'), tenureDays: 365, isMatured: false, isRenewed: false },
  ];
  for (const f of fdSeeds) {
    await FixedDeposit.findOneAndUpdate({ companyId, bankName: f.bankName, maturityDate: f.maturityDate }, { $set: { ...f, companyId } }, { upsert: true });
  }

  const budgetSeeds = [
    { month: 0, lineName: 'Revenue',        lineGroup: 'Income',     budgetAmount: 420000000 },
    { month: 0, lineName: 'Direct Cost',     lineGroup: 'DirectCost', budgetAmount: 252000000 },
    { month: 0, lineName: 'Employee Costs',  lineGroup: 'OPEX',       budgetAmount: 29400000 },
    { month: 0, lineName: 'Marketing',       lineGroup: 'OPEX',       budgetAmount: 9800000 },
    { month: 0, lineName: 'Admin & OPEX',    lineGroup: 'OPEX',       budgetAmount: 43400000 },
  ];
  for (const b of budgetSeeds) {
    await BudgetItem.findOneAndUpdate({ companyId, financialYear: fy, month: b.month, lineName: b.lineName }, { $set: { ...b, companyId, financialYear: fy } }, { upsert: true });
  }

  const complianceSeeds = [
    { category: 'GST', filingName: 'GSTR-1 (Monthly)', period: `Oct ${fyStartYear}`, dueDate: new Date(`${fyStartYear}-11-11`), status: 'filed', filedDate: new Date(`${fyStartYear}-11-08`) },
    { category: 'GST', filingName: 'GSTR-3B (Monthly)', period: `Oct ${fyStartYear}`, dueDate: new Date(`${fyStartYear}-11-20`), status: 'due-soon' },
    { category: 'TDS/TCS', filingName: 'TDS Return Q2', period: `Jul–Sep ${fyStartYear}`, dueDate: new Date(`${fyStartYear}-10-31`), status: 'overdue', remarks: 'Interest accruing' },
    { category: 'Income Tax', filingName: 'Advance Tax Q3', period: `FY ${fy}`, dueDate: new Date(`${fyStartYear}-12-15`), status: 'upcoming' },
    { category: 'PF / ESI', filingName: 'PF Challan', period: `Oct ${fyStartYear}`, dueDate: new Date(`${fyStartYear}-11-15`), status: 'due-soon' },
    { category: 'ROC / MCA', filingName: 'MGT-7 (Annual Return)', period: `FY ${fy}`, dueDate: new Date(`${fyStartYear}-11-29`), status: 'due-soon' },
  ];
  for (const c of complianceSeeds) {
    await ComplianceFiling.findOneAndUpdate({ companyId, filingName: c.filingName, period: c.period }, { $set: { ...c, companyId, financialYear: fy, autoAlert: true, alertSent: false } }, { upsert: true });
  }

  await PayrollRecord.findOneAndUpdate(
    { companyId, financialYear: fy, month: 7 },
    { $set: { companyId, financialYear: fy, month: 7, totalEmployees: 42, grossSalary: 1840000, employeePF: 110400, employerPF: 110400, employeeESI: 27600, employerESI: 38000, professionalTax: 6200, tdsOnSalary: 86000, lwf: 2000, netSalaryPaid: 1610000, salaryPaidDate: new Date(`${fyStartYear}-10-31`), status: 'paid', compliance: [{ item: 'PF', dueDate: new Date(`${fyStartYear}-11-15`), amount: 220800, isPaid: true }, { item: 'ESI', dueDate: new Date(`${fyStartYear}-11-15`), amount: 38000, isPaid: false }, { item: 'PT', dueDate: new Date(`${fyStartYear}-11-15`), amount: 6200, isPaid: false }] } },
    { upsert: true }
  );

  await Commentary.findOneAndUpdate(
    { companyId, financialYear: fy, month: 7 },
    { $set: { companyId, financialYear: fy, month: 7, period: 'October FY 2025-26', executiveSummary: 'October was a strong month with net profit up 22.3% YoY. Receivables require attention. Statutory compliance has two gaps.', highlights: [{ text: 'Revenue grew 13.1% YoY', impactAmount: '+₹4.5 Cr' }, { text: 'EBITDA margin improved to 20.3%', impactAmount: '+₹1.4 Cr' }], concerns: [{ text: 'Debtor days at 62 days — above industry 38', severity: 'High' }, { text: 'TDS Return Q2 overdue', severity: 'High' }], actions: [{ action: 'Collect from Aurora Industries', owner: 'S. Mehta', dueDate: new Date('2025-11-12'), status: 'Open' }], preparedBy: 'Radhika Mehta', preparedOn: new Date('2025-11-05'), publishedOn: new Date('2025-11-06'), isPublished: true } },
    { upsert: true }
  );

  const advisorySeeds = [
    { actionId: 'ADV-001', category: 'Receivables', title: 'Recover overdue from Aurora Industries', detail: '₹22.1 L overdue. Legal notice recommended.', priority: 'High', owner: 'S. Mehta', dueDate: new Date('2025-11-20'), status: 'In Progress', expectedImpact: '₹22.1 L cash release', addedBy: 'Radhika Mehta', addedOn: new Date('2025-11-06') },
    { actionId: 'ADV-002', category: 'Compliance', title: 'File TDS Return Q2', detail: 'TDS Return overdue. Interest accruing at ₹200/day.', priority: 'High', owner: 'R. Asthana', dueDate: new Date('2025-11-10'), status: 'In Progress', expectedImpact: 'Stops daily interest', addedBy: 'Radhika Mehta', addedOn: new Date('2025-11-06') },
    { actionId: 'ADV-003', category: 'Banking', title: 'Reduce Axis OD utilisation below 75%', detail: 'Currently at 81%. Triggers higher interest rate.', priority: 'High', owner: 'R. Asthana', dueDate: new Date('2025-11-30'), status: 'Open', expectedImpact: 'Save ₹0.8 L/month', addedBy: 'Radhika Mehta', addedOn: new Date('2025-11-06') },
  ];
  for (const a of advisorySeeds) {
    await AdvisoryAction.findOneAndUpdate({ companyId, actionId: a.actionId }, { $set: { ...a, companyId } }, { upsert: true });
  }

  await TaxPlanning.findOneAndUpdate(
    { companyId, financialYear: fy },
    { $set: { companyId, financialYear: fy, estimatedTaxableIncome: 65200000, estimatedTaxLiability: 18100000, effectiveTaxRate: 24.1, advanceTax: [{ instalment: 1, dueDate: new Date('2025-06-15'), cumulativePct: 15, estimatedAmount: 4000000, paidAmount: 4000000, isPaid: true }, { instalment: 2, dueDate: new Date('2025-09-15'), cumulativePct: 45, estimatedAmount: 8000000, paidAmount: 8000000, isPaid: true }, { instalment: 3, dueDate: new Date('2025-12-15'), cumulativePct: 75, estimatedAmount: 5400000, paidAmount: 0, isPaid: false }, { instalment: 4, dueDate: new Date('2026-03-15'), cumulativePct: 100, estimatedAmount: 4000000, paidAmount: 0, isPaid: false }], taxSavingOpportunities: [{ section: 'Section 32 — Depreciation', description: 'Additional depreciation on new plant.', estimatedSaving: 144000, effort: 'Low', status: 'Identified' }], matApplicable: false, taxAuditApplicable: true, taxAuditStatus: 'In Progress', preparedBy: 'Radhika Mehta', lastUpdated: new Date() } },
    { upsert: true }
  );

  /* ── Vouchers — 12 months of sales + purchases ─────────────────────── */
  // Monthly sales amounts for FY 2024-25 (April=4 … March=3 next year)
  const monthlySales: [number, number, number][] = [
    [2024, 4,  2_500_000], [2024, 5,  3_200_000], [2024, 6,  2_800_000],
    [2024, 7,  3_500_000], [2024, 8,  2_900_000], [2024, 9,  4_100_000],
    [2024, 10, 3_600_000], [2024, 11, 2_700_000], [2024, 12, 3_300_000],
    [2025, 1,  4_500_000], [2025, 2,  3_800_000], [2025, 3,  5_100_000],
  ];
  const monthlyPurchases: [number, number, number][] = monthlySales.map(
    ([y, m, s]) => [y, m, Math.round(s * 0.65)]
  );

  for (const [year, month, amount] of monthlySales) {
    const date = new Date(year, month - 1, 15);
    await Voucher.findOneAndUpdate(
      { companyId, syncId: `${companyId}-sales-seed-${year}-${month}` },
      { $set: { companyId, voucherType: 'Sales', voucherNumber: `SALES/${year}-${month}`, date, partyName: 'Various Customers', amount, narration: 'Monthly sales', syncId: `${companyId}-sales-seed-${year}-${month}` } },
      { upsert: true }
    );
  }
  for (const [year, month, amount] of monthlyPurchases) {
    const date = new Date(year, month - 1, 10);
    await Voucher.findOneAndUpdate(
      { companyId, syncId: `${companyId}-purchase-seed-${year}-${month}` },
      { $set: { companyId, voucherType: 'Purchase', voucherNumber: `PURCH/${year}-${month}`, date, partyName: 'Various Suppliers', amount, narration: 'Monthly purchases', syncId: `${companyId}-purchase-seed-${year}-${month}` } },
      { upsert: true }
    );
  }

  /* ── Ledgers ──────────────────────────────────────────────────────────── */
  const ledgerSeeds = [
    { name: 'HDFC Bank',                group: 'Bank Accounts',    closingBalance: 850_000,   isDr: true },
    { name: 'Cash in Hand',             group: 'Cash-in-Hand',     closingBalance: 45_000,    isDr: true },
    { name: 'Knitting India',           group: 'Sundry Debtors',   closingBalance: 325_104,   isDr: true },
    { name: 'Harshil Handloom',         group: 'Sundry Debtors',   closingBalance: 248_465,   isDr: true },
    { name: 'KABIR INTERNATIONAL',      group: 'Sundry Debtors',   closingBalance: 182_431,   isDr: true },
    { name: 'Bansal Overseas',          group: 'Sundry Debtors',   closingBalance: 95_678,    isDr: true },
    { name: 'A.T. Knitting Yarns',      group: 'Sundry Debtors',   closingBalance: 165_778,   isDr: true },
    { name: 'M/s Shreeya Sales',        group: 'Sundry Creditors', closingBalance: 376_409,   isDr: false },
    { name: 'Shiv Traders',             group: 'Sundry Creditors', closingBalance: 237_998,   isDr: false },
    { name: 'SWASTIK SALES',            group: 'Sundry Creditors', closingBalance: 170_995,   isDr: false },
    { name: 'Laxmi Narayan Impex',      group: 'Sundry Creditors', closingBalance: 114_660,   isDr: false },
    { name: 'Sales Account',            group: 'Sales Accounts',   closingBalance: 42_000_000, isDr: false },
    { name: 'Purchase Account',         group: 'Purchase Accounts',closingBalance: 27_300_000, isDr: true },
    { name: 'Indirect Expenses',        group: 'Indirect Expenses',closingBalance: 2_800_000,  isDr: true },
    { name: 'Capital Account',          group: 'Capital Account',  closingBalance: 8_500_000,  isDr: false },
    { name: 'HDFC Term Loan',           group: 'Secured Loans',    closingBalance: 3_200_000,  isDr: false },
  ];
  for (const l of ledgerSeeds) {
    await Ledger.findOneAndUpdate(
      { companyId, syncId: `${companyId}-ledger-${l.name}` },
      { $set: { ...l, companyId, openingBalance: 0, syncId: `${companyId}-ledger-${l.name}` } },
      { upsert: true }
    );
  }

  /* ── Stock ────────────────────────────────────────────────────────────── */
  await StockItem.findOneAndUpdate(
    { companyId, syncId: `${companyId}-stock-seed-fabric` },
    { $set: { companyId, itemName: 'Fabric Stock', group: 'Primary', unit: 'Mtr', closingStock: { quantity: 1200, amount: 480_000 }, syncId: `${companyId}-stock-seed-fabric` } },
    { upsert: true }
  );

  res.json({ success: true, message: `Seeded demo data for ${companyId}`, seeded: ['company','vouchers(24)','ledgers(16)','stock','bankAccounts','loanEmis','fixedDeposits','budgetItems','complianceFilings','payroll','commentary','advisoryActions','taxPlanning'] });
});

export default router;
