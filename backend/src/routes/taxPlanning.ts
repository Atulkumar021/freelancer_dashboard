import { Router, Request, Response } from 'express';
import TaxPlanning from '../models/taxPlanning';
import { getCurrentFYRange, requireAuth, badRequest } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { label: fyLabel } = getCurrentFYRange();
  const fy = (req.query.fy as string) ?? fyLabel;
  const record = await TaxPlanning.findOne({ companyId, financialYear: fy }).lean() as any;
  if (!record) { res.json({ success: true, companyId, financialYear: fy, record: null }); return; }
  const totalPaid  = (record.advanceTax ?? []).reduce((s: number, i: any) => s + (i.paidAmount ?? 0), 0);
  const totalSaving = (record.taxSavingOpportunities ?? []).reduce((s: number, o: any) => s + (o.estimatedSaving ?? 0), 0);
  res.json({ success: true, companyId, financialYear: fy, record, summary: { estimatedTaxLiability: record.estimatedTaxLiability, totalAdvanceTaxPaid: totalPaid, balanceTaxDue: record.estimatedTaxLiability - totalPaid, effectiveTaxRate: record.effectiveTaxRate, totalPotentialSaving: totalSaving } });
});

router.post('/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId } = req.params;
  if (!req.body.financialYear) { badRequest(res, 'financialYear required'); return; }
  const record = await TaxPlanning.findOneAndUpdate({ companyId, financialYear: req.body.financialYear }, { $set: { ...req.body, companyId, lastUpdated: new Date() } }, { upsert: true, new: true }).lean();
  res.status(201).json({ success: true, record });
});

router.patch('/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId } = req.params;
  const { financialYear, type, instalment, opportunityId, update: upd } = req.body;
  if (!financialYear || !type) { badRequest(res, 'financialYear and type required'); return; }
  let rec;
  if (type === 'instalment' && instalment !== undefined) {
    const setF: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(upd ?? {})) setF[`advanceTax.$.${k}`] = v;
    rec = await TaxPlanning.findOneAndUpdate({ companyId, financialYear, 'advanceTax.instalment': instalment }, { $set: setF }, { new: true }).lean();
  } else if (type === 'opportunity' && opportunityId) {
    const setF: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(upd ?? {})) setF[`taxSavingOpportunities.$.${k}`] = v;
    rec = await TaxPlanning.findOneAndUpdate({ companyId, financialYear, 'taxSavingOpportunities._id': opportunityId }, { $set: setF }, { new: true }).lean();
  }
  if (!rec) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, record: rec });
});

export default router;
