import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILoanEmi extends Document {
  companyId: string;
  bankName: string;
  loanPurpose: string;
  loanAccountNumber?: string;
  principalAmount: number;
  emiAmount: number;
  dueDate: Date;
  isPaid: boolean;
  paidDate?: Date;
  outstandingPrincipal: number;
  interestRate: number;
  tenureMonths: number;
  remainingEMIs: number;
  syncId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoanEmiSchema = new Schema<ILoanEmi>(
  {
    companyId:            { type: String, required: true, index: true },
    bankName:             { type: String, required: true },
    loanPurpose:          { type: String, required: true },
    loanAccountNumber:    { type: String },
    principalAmount:      { type: Number, required: true },
    emiAmount:            { type: Number, required: true },
    dueDate:              { type: Date,   required: true, index: true },
    isPaid:               { type: Boolean, default: false },
    paidDate:             { type: Date },
    outstandingPrincipal: { type: Number, required: true },
    interestRate:         { type: Number, required: true },
    tenureMonths:         { type: Number, required: true },
    remainingEMIs:        { type: Number, required: true },
    syncId:               { type: String, index: true },
  },
  { timestamps: true, collection: 'loanemis' }
);

LoanEmiSchema.index({ companyId: 1, dueDate: 1 });

const LoanEmi: Model<ILoanEmi> =
  mongoose.models.LoanEmi ?? mongoose.model<ILoanEmi>('LoanEmi', LoanEmiSchema);
export default LoanEmi;
