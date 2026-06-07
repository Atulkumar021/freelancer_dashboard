import mongoose, { Schema, Document, Model } from 'mongoose';

export type AdvisoryPriority = 'High' | 'Medium' | 'Low';
export type AdvisoryStatus   = 'Open' | 'In Progress' | 'Done' | 'Deferred';
export type AdvisoryCategory = 'Cash Flow' | 'Receivables' | 'Compliance' | 'Cost Control' | 'Strategy' | 'Banking' | 'Other';

export interface IAdvisoryAction extends Document {
  companyId: string;
  actionId: string;
  category: AdvisoryCategory;
  title: string;
  detail: string;
  priority: AdvisoryPriority;
  owner: string;
  dueDate: Date;
  status: AdvisoryStatus;
  expectedImpact?: string;
  actualImpact?: string;
  addedBy: string;
  addedOn: Date;
  closedDate?: Date;
  closureNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdvisoryActionSchema = new Schema<IAdvisoryAction>(
  {
    companyId:      { type: String, required: true, index: true },
    actionId:       { type: String, required: true },
    category:       { type: String, required: true, enum: ['Cash Flow','Receivables','Compliance','Cost Control','Strategy','Banking','Other'] },
    title:          { type: String, required: true },
    detail:         { type: String, required: true },
    priority:       { type: String, required: true, enum: ['High','Medium','Low'] },
    owner:          { type: String, required: true },
    dueDate:        { type: Date,   required: true },
    status:         { type: String, required: true, enum: ['Open','In Progress','Done','Deferred'], default: 'Open' },
    expectedImpact: { type: String },
    actualImpact:   { type: String },
    addedBy:        { type: String, required: true },
    addedOn:        { type: Date,   required: true, default: Date.now },
    closedDate:     { type: Date },
    closureNote:    { type: String },
  },
  { timestamps: true, collection: 'advisoryactions' }
);

AdvisoryActionSchema.index({ companyId: 1, status: 1 });
AdvisoryActionSchema.index({ companyId: 1, actionId: 1 }, { unique: true });

const AdvisoryAction: Model<IAdvisoryAction> =
  mongoose.models.AdvisoryAction ?? mongoose.model<IAdvisoryAction>('AdvisoryAction', AdvisoryActionSchema);
export default AdvisoryAction;
