import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICommentary extends Document {
  companyId: string;
  financialYear: string;
  month: number;
  period: string;
  executiveSummary: string;
  highlights: Array<{ text: string; impactAmount?: string }>;
  concerns: Array<{ text: string; severity: 'High' | 'Medium' | 'Low' }>;
  actions: Array<{ action: string; owner: string; dueDate: Date; status: 'Open' | 'In Progress' | 'Done' | 'Escalated'; closedDate?: Date }>;
  preparedBy: string;
  preparedOn: Date;
  publishedOn?: Date;
  isPublished: boolean;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActionSchema = new Schema(
  { action: String, owner: String, dueDate: Date, status: { type: String, enum: ['Open','In Progress','Done','Escalated'], default: 'Open' }, closedDate: Date },
  { _id: true }
);

const CommentarySchema = new Schema<ICommentary>(
  {
    companyId:        { type: String, required: true, index: true },
    financialYear:    { type: String, required: true },
    month:            { type: Number, required: true, min: 1, max: 12 },
    period:           { type: String, required: true },
    executiveSummary: { type: String, required: true },
    highlights:       [{ text: String, impactAmount: String }],
    concerns:         [{ text: String, severity: { type: String, enum: ['High','Medium','Low'] } }],
    actions:          { type: [ActionSchema], default: [] },
    preparedBy:       { type: String, required: true },
    preparedOn:       { type: Date,   required: true },
    publishedOn:      { type: Date },
    isPublished:      { type: Boolean, default: false },
    pdfUrl:           { type: String },
  },
  { timestamps: true, collection: 'commentaries' }
);

CommentarySchema.index({ companyId: 1, financialYear: 1, month: 1 }, { unique: true });

const Commentary: Model<ICommentary> =
  mongoose.models.Commentary ?? mongoose.model<ICommentary>('Commentary', CommentarySchema);
export default Commentary;
