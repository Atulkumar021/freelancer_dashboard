import mongoose, { Schema, Document, Model } from 'mongoose';

export type FilingStatus   = 'filed' | 'paid' | 'overdue' | 'due-soon' | 'upcoming' | 'in-progress';
export type FilingCategory = 'GST' | 'TDS/TCS' | 'Income Tax' | 'PF / ESI' | 'ROC / MCA' | 'Other';

export interface IComplianceFiling extends Document {
  companyId: string;
  financialYear: string;
  category: FilingCategory;
  filingName: string;
  period: string;
  dueDate: Date;
  filedDate?: Date;
  status: FilingStatus;
  amount?: number;
  referenceNumber?: string;
  remarks?: string;
  responsible?: string;
  autoAlert: boolean;
  alertSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceFilingSchema = new Schema<IComplianceFiling>(
  {
    companyId:       { type: String, required: true, index: true },
    financialYear:   { type: String, required: true },
    category:        { type: String, required: true, enum: ['GST','TDS/TCS','Income Tax','PF / ESI','ROC / MCA','Other'] },
    filingName:      { type: String, required: true },
    period:          { type: String, required: true },
    dueDate:         { type: Date,   required: true, index: true },
    filedDate:       { type: Date },
    status:          { type: String, required: true, enum: ['filed','paid','overdue','due-soon','upcoming','in-progress'], default: 'upcoming' },
    amount:          { type: Number },
    referenceNumber: { type: String },
    remarks:         { type: String },
    responsible:     { type: String },
    autoAlert:       { type: Boolean, default: true },
    alertSent:       { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'compliancefilings' }
);

ComplianceFilingSchema.index({ companyId: 1, dueDate: 1 });
ComplianceFilingSchema.index({ companyId: 1, category: 1, financialYear: 1 });

const ComplianceFiling: Model<IComplianceFiling> =
  mongoose.models.ComplianceFiling ?? mongoose.model<IComplianceFiling>('ComplianceFiling', ComplianceFilingSchema);
export default ComplianceFiling;
