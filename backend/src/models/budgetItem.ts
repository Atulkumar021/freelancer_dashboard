import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBudgetItem extends Document {
  companyId: string;
  financialYear: string;
  month: number;          // 1-12; 0 = annual total
  lineName: string;
  lineGroup: 'Income' | 'DirectCost' | 'OPEX' | 'BelowLine';
  budgetAmount: number;
  actualAmount?: number;
  variance?: number;
  variancePct?: number;
  explanationNote?: string;
  enteredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetItemSchema = new Schema<IBudgetItem>(
  {
    companyId:       { type: String, required: true, index: true },
    financialYear:   { type: String, required: true },
    month:           { type: Number, required: true, min: 0, max: 12 },
    lineName:        { type: String, required: true },
    lineGroup:       { type: String, required: true, enum: ['Income','DirectCost','OPEX','BelowLine'] },
    budgetAmount:    { type: Number, required: true },
    actualAmount:    { type: Number },
    variance:        { type: Number },
    variancePct:     { type: Number },
    explanationNote: { type: String },
    enteredBy:       { type: String },
  },
  { timestamps: true, collection: 'budgetitems' }
);

BudgetItemSchema.index({ companyId: 1, financialYear: 1, month: 1, lineName: 1 }, { unique: true });

const BudgetItem: Model<IBudgetItem> =
  mongoose.models.BudgetItem ?? mongoose.model<IBudgetItem>('BudgetItem', BudgetItemSchema);
export default BudgetItem;
