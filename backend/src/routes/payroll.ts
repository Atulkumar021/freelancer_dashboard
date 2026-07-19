import { Router, Request, Response } from 'express';
import PayrollRecord from '../models/payrollRecord';
import { getCurrentFYRange, badRequest } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { label: fyLabel } = getCurrentFYRange();
  const fy = (req.query.fy as string) ?? fyLabel;

  const [records, ytdAgg] = await Promise.all([
    PayrollRecord.find({ companyId, financialYear: fy }).sort({ month: 1 }).lean(),
    PayrollRecord.aggregate([
      { $match: { companyId, financialYear: fy } },
      { $group: { _id: null, totalGross: { $sum: '$grossSalary' }, totalNetPaid: { $sum: '$netSalaryPaid' }, totalPF: { $sum: { $add: ['$employeePF','$employerPF'] } }, totalESI: { $sum: { $add: ['$employeeESI','$employerESI'] } }, totalTDS: { $sum: '$tdsOnSalary' }, avgEmployees: { $avg: '$totalEmployees' } } },
    ]),
  ]);

  res.json({ success: true, companyId, financialYear: fy, ytd: (ytdAgg[0] as any) ?? {}, records });
});

router.post('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { financialYear, month } = req.body;
  if (!financialYear || !month) { badRequest(res, 'financialYear and month required'); return; }
  const record = await PayrollRecord.findOneAndUpdate({ companyId, financialYear, month }, { $set: { ...req.body, companyId } }, { upsert: true, new: true }).lean();
  res.status(201).json({ success: true, record });
});

router.patch('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { recordId, complianceItem, isPaid, paidDate, challanRef } = req.body;
  if (!recordId || !complianceItem) { badRequest(res, 'recordId and complianceItem required'); return; }
  const record = await PayrollRecord.findOneAndUpdate(
    { _id: recordId, companyId, 'compliance.item': complianceItem },
    { $set: { 'compliance.$.isPaid': isPaid ?? true, 'compliance.$.paidDate': paidDate ? new Date(paidDate) : new Date(), 'compliance.$.challanRef': challanRef ?? '' } },
    { new: true }
  ).lean();
  if (!record) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, record });
});

export default router;
