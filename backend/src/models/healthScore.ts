import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHealthScore extends Document {
  companyId: string;
  financialYear: string;
  month: number;
  totalScore: number;
  bandLabel: string;
  dimensions: Array<{ name: string; score: number; maxScore: number; detail: string; metrics: Record<string, unknown> }>;
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DimensionSchema = new Schema(
  { name: String, score: Number, maxScore: Number, detail: { type: String, default: '' }, metrics: { type: Schema.Types.Mixed, default: {} } },
  { _id: false }
);

const HealthScoreSchema = new Schema<IHealthScore>(
  {
    companyId:     { type: String, required: true, index: true },
    financialYear: { type: String, required: true },
    month:         { type: Number, required: true, min: 1, max: 12 },
    totalScore:    { type: Number, required: true },
    bandLabel:     { type: String, required: true },
    dimensions:    { type: [DimensionSchema], default: [] },
    computedAt:    { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'healthscores' }
);

HealthScoreSchema.index({ companyId: 1, financialYear: 1, month: 1 }, { unique: true });

const HealthScore: Model<IHealthScore> =
  mongoose.models.HealthScore ?? mongoose.model<IHealthScore>('HealthScore', HealthScoreSchema);
export default HealthScore;
