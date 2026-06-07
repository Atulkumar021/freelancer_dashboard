import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFixedDeposit extends Document {
  companyId: string;
  bankName: string;
  fdNumber?: string;
  principalAmount: number;
  interestRate: number;
  maturityDate: Date;
  maturityAmount?: number;
  depositDate: Date;
  tenureDays: number;
  isMatured: boolean;
  isRenewed: boolean;
  renewedFdId?: string;
  syncId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FixedDepositSchema = new Schema<IFixedDeposit>(
  {
    companyId:       { type: String, required: true, index: true },
    bankName:        { type: String, required: true },
    fdNumber:        { type: String },
    principalAmount: { type: Number, required: true },
    interestRate:    { type: Number, required: true },
    maturityDate:    { type: Date,   required: true, index: true },
    maturityAmount:  { type: Number },
    depositDate:     { type: Date,   required: true },
    tenureDays:      { type: Number, required: true },
    isMatured:       { type: Boolean, default: false },
    isRenewed:       { type: Boolean, default: false },
    renewedFdId:     { type: String },
    syncId:          { type: String, index: true },
  },
  { timestamps: true, collection: 'fixeddeposits' }
);

FixedDepositSchema.index({ companyId: 1, maturityDate: 1 });

const FixedDeposit: Model<IFixedDeposit> =
  mongoose.models.FixedDeposit ?? mongoose.model<IFixedDeposit>('FixedDeposit', FixedDepositSchema);
export default FixedDeposit;
