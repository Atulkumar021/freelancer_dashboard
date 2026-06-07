import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITaxPlanning extends Document {
  companyId: string;
  financialYear: string;
  estimatedTaxableIncome: number;
  estimatedTaxLiability: number;
  effectiveTaxRate: number;
  advanceTax: Array<{
    instalment: number; dueDate: Date; cumulativePct: number;
    estimatedAmount: number; paidAmount: number; isPaid: boolean;
    paidDate?: Date; challanNumber?: string;
  }>;
  taxSavingOpportunities: Array<{
    section: string; description: string; estimatedSaving: number;
    effort: 'Low' | 'Medium' | 'High';
    status: 'Identified' | 'Under Review' | 'Action Required' | 'Implemented' | 'Not Applicable';
    addedBy?: string;
  }>;
  matApplicable: boolean;
  matAmount?: number;
  taxAuditApplicable: boolean;
  taxAuditStatus?: string;
  itrStatus?: string;
  preparedBy?: string;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InstalmentSchema = new Schema(
  { instalment: Number, dueDate: Date, cumulativePct: Number, estimatedAmount: Number, paidAmount: { type: Number, default: 0 }, isPaid: { type: Boolean, default: false }, paidDate: Date, challanNumber: String },
  { _id: false }
);

const OpportunitySchema = new Schema(
  { section: String, description: String, estimatedSaving: Number, effort: { type: String, enum: ['Low','Medium','High'] }, status: { type: String, enum: ['Identified','Under Review','Action Required','Implemented','Not Applicable'], default: 'Identified' }, addedBy: String },
  { _id: true }
);

const TaxPlanningSchema = new Schema<ITaxPlanning>(
  {
    companyId:              { type: String, required: true, index: true },
    financialYear:          { type: String, required: true },
    estimatedTaxableIncome: { type: Number, required: true },
    estimatedTaxLiability:  { type: Number, required: true },
    effectiveTaxRate:       { type: Number, required: true },
    advanceTax:             { type: [InstalmentSchema], default: [] },
    taxSavingOpportunities: { type: [OpportunitySchema], default: [] },
    matApplicable:          { type: Boolean, default: false },
    matAmount:              { type: Number },
    taxAuditApplicable:     { type: Boolean, default: false },
    taxAuditStatus:         { type: String },
    itrStatus:              { type: String },
    preparedBy:             { type: String },
    lastUpdated:            { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'taxplannings' }
);

TaxPlanningSchema.index({ companyId: 1, financialYear: 1 }, { unique: true });

const TaxPlanning: Model<ITaxPlanning> =
  mongoose.models.TaxPlanning ?? mongoose.model<ITaxPlanning>('TaxPlanning', TaxPlanningSchema);
export default TaxPlanning;
