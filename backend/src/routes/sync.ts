import { Router, Request, Response } from 'express';
import mongoose, { Schema, Model, Document } from 'mongoose';
import Voucher from '../models/voucher';
import Ledger  from '../models/ledger';
import StockItem from '../models/stock';
import Company  from '../models/company';
import { requireAuth } from '../helpers';

const router = Router();

/* ── Inline FinancialReport model (gst / balancesheet / pnl raw data) ── */
interface IFinancialReport extends Document {
  companyId: string;
  reportType: string;
  period?: string;
  data: mongoose.Schema.Types.Mixed;
  syncId?: string;
}

const FinancialReportSchema = new Schema<IFinancialReport>(
  {
    companyId:  { type: String, required: true, index: true },
    reportType: { type: String, required: true },
    period:     { type: String },
    data:       { type: Schema.Types.Mixed },
    syncId:     { type: String, index: true },
  },
  { timestamps: true, collection: 'financialreports' }
);
FinancialReportSchema.index({ companyId: 1, reportType: 1, syncId: 1 });

const FinancialReport: Model<IFinancialReport> =
  mongoose.models.FinancialReport ??
  mongoose.model<IFinancialReport>('FinancialReport', FinancialReportSchema);

/* ── upsertMany helper ─────────────────────────────────────────────────── */
async function upsertMany(model: Model<any>, records: Record<string, unknown>[]) {
  if (!records.length) return 0;
  const ops = records.map((r) => ({
    updateOne: {
      filter: { syncId: r.syncId },
      update: { $set: r },
      upsert: true,
    },
  }));
  const result = await model.bulkWrite(ops, { ordered: false });
  return (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
}

/* ── Voucher type map ───────────────────────────────────────────────────── */
const voucherTypeMap: Record<string, string> = {
  sales:    'Sales',
  purchase: 'Purchase',
  payment:  'Payment',
  receipt:  'Receipt',
  journal:  'Journal',
};

/* ── POST /api/sync ─────────────────────────────────────────────────────── */
router.post('/', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { companyId, dataType, records, syncId, timestamp } = req.body;

  if (!companyId || !dataType) {
    res.status(400).json({ success: false, error: 'companyId and dataType are required' });
    return;
  }

  const lower = dataType.toLowerCase();
  let upserted = 0;

  /* ── Vouchers ─────────────────────────────────────────────────────── */
  if (voucherTypeMap[lower]) {
    if (!Array.isArray(records) || records.length === 0) {
      // Empty batch is fine — just acknowledge
      await Company.findOneAndUpdate(
        { companyId },
        { $set: { lastSyncAt: new Date(), status: 'active' } },
        { upsert: true }
      );
      res.json({ success: true, upserted: 0, dataType, message: 'Empty batch acknowledged' });
      return;
    }

    // Map Tally raw XML fields → our schema fields
    const stamped = records.map((r: any) => ({
      companyId,
      voucherType: voucherTypeMap[lower],
      voucherNumber: r.VOUCHERNUMBER || r.voucherNumber || r.number || '',
      date: parseDate(r.DATE || r.date) || new Date(),
      partyName: r.PARTYLEDGERNAME || r.partyName || r.party || '',
      amount: extractVoucherAmount(r),
      narration: r.NARRATION || r.narration || '',
      rawData: r,
      syncId: `${companyId}-${lower}-${r.VOUCHERNUMBER || r.DSPVCHNO || r.voucherNumber || r.number || r.$?.VCHNO || r.$?.REMOTEID || syncId || Date.now()}`,
    }));
    upserted = await upsertMany(Voucher, stamped);

  /* ── Ledgers ──────────────────────────────────────────────────────── */
  } else if (lower === 'ledgers') {
    if (!Array.isArray(records) || records.length === 0) {
      await updateLastSync(companyId);
      res.json({ success: true, upserted: 0, dataType, message: 'Empty batch acknowledged' });
      return;
    }
    const stamped = records.map((r: any) => {
      // TallyPrime puts ledger NAME as XML attribute → parsed into r.$ by xml2js
      const name = r.NAME || r.name || r.$?.NAME || r.LEDGERNAME || '';
      // Closing balance: may be pre-computed by agent (r.CLOSINGBALANCE)
      // or come as separate Dr/Cr fields (DSPCLDRAMT / DSPCLCRAMT)
      const drAmt  = parseAmount(r.CLOSINGBALANCE ?? r.DSPCLDRAMT ?? r.closingBalance ?? 0);
      const crAmt  = parseAmount(r.DSPCLCRAMT ?? 0);
      const isDr   = parseDr(r.ISDEEMEDPOSITIVE ?? r.isDr ?? (drAmt > 0 && crAmt === 0 ? 'Yes' : 'No'));
      const closing = r.CLOSINGBALANCE != null ? drAmt : isDr ? drAmt : crAmt;
      return {
        companyId,
        name,
        group: r.PARENT || r.$?.PARENT || r.group || r.parent || 'Unknown',
        openingBalance: parseAmount(r.OPENINGBALANCE || r.openingBalance || 0),
        closingBalance: closing,
        isDr,
        gstin: r.GSTIN || r.gstin || r.$?.GSTIN || '',
        gstRegistrationType: r.GSTREGISTRATIONTYPE || r.gstRegistrationType || '',
        rawData: r,
        syncId: `${companyId}-ledger-${name || Math.random()}`,
      };
    });
    upserted = await upsertMany(Ledger, stamped);

  /* ── Stock Items ──────────────────────────────────────────────────── */
  } else if (lower === 'stock') {
    if (!Array.isArray(records) || records.length === 0) {
      await updateLastSync(companyId);
      res.json({ success: true, upserted: 0, dataType, message: 'Empty batch acknowledged' });
      return;
    }
    const stamped = records.map((r: any) => ({
      companyId,
      itemName: r.NAME || r.name || r.STOCKITEMNAME || '',
      group: r.PARENT || r.group || '',
      unit: r.BASEUNITS || r.unit || '',
      closingStock: {
        quantity: parseAmount(r.CLOSINGBALANCE || r.closingQty),
        amount:   parseAmount(r.CLOSINGVALUE  || r.closingValue),
      },
      rawData: r,
      syncId: `${companyId}-stock-${r.NAME || r.name || Math.random()}`,
    }));
    upserted = await upsertMany(StockItem, stamped);

  /* ── Financial Reports (GST / Balance Sheet / P&L) ────────────────── */
  } else if (['gst', 'balancesheet', 'pnl'].includes(lower)) {
    const payload = {
      companyId,
      reportType: lower,
      period: extractPeriod(timestamp),
      data: Array.isArray(records) ? records : [records],
      syncId: `${companyId}-${lower}-${timestamp || Date.now()}`,
    };
    upserted = await upsertMany(FinancialReport, [payload]);

  /* ── Unknown type ─────────────────────────────────────────────────── */
  } else {
    res.status(400).json({ success: false, error: `Unknown dataType: "${dataType}"` });
    return;
  }

  // Update last-seen timestamp on company record
  await updateLastSync(companyId);

  res.json({ success: true, upserted, dataType, companyId });
});

/* ── Helpers ──────────────────────────────────────────────────────────── */

function extractVoucherAmount(r: any): number {
  // 1. Direct fields — standard + Day Book display format
  const directFields = [
    'AMOUNT', 'amount', 'VOUCHERAMT', 'VOUCHERAMOUNT',
    'DSPVCHAMT', 'DSPDEBITAMT', 'DSPCREDITAMT',
    'DEBITAMOUNT', 'CREDITAMOUNT',
  ];
  for (const f of directFields) {
    const v = parseAmount(r[f]);
    if (v > 0) return v;
  }
  // XML attributes (e.g. <VOUCHER VOUCHERAMT="19723">)
  if (r.$) {
    for (const f of directFields) {
      const v = parseAmount(r.$[f]);
      if (v > 0) return v;
    }
  }

  // 2. ALLLEDGERENTRIES.LIST is directly the array of ledger entries in TallyPrime
  const entryLists = [
    r['ALLLEDGERENTRIES.LIST'],
    r['ALLLEDGERENTRIES.LIST']?.['LEDGERENTRIES.LIST'],
    r['LEDGERENTRIES.LIST'],
  ];
  for (const entries of entryLists) {
    if (!entries) continue;
    const arr = Array.isArray(entries) ? entries : [entries];
    const amounts = arr.map((e: any) => parseAmount(e.AMOUNT ?? e.amount ?? 0));
    const max = Math.max(...amounts);
    if (max > 0) return max;
  }

  return 0;
}

async function updateLastSync(companyId: string) {
  await Company.findOneAndUpdate(
    { companyId },
    { $set: { lastSyncAt: new Date(), status: 'active' } },
    { upsert: true }
  );
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  // Tally format YYYYMMDD
  const s = String(val).trim();
  if (/^\d{8}$/.test(s)) {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(val: any): number {
  if (val == null) return 0;
  const n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : Math.abs(n);
}

function parseDr(val: any): boolean {
  if (val == null) return true;
  const s = String(val).toLowerCase();
  return s === 'yes' || s === 'true' || s === '1';
}

function extractPeriod(timestamp: any): string {
  if (!timestamp) return new Date().toISOString().slice(0, 7); // YYYY-MM
  return new Date(timestamp).toISOString().slice(0, 7);
}

export default router;
