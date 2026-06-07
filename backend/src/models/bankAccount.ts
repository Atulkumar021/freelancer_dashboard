import mongoose, { Schema, Document, Model } from 'mongoose';

export type AccountType = 'Current' | 'OD' | 'CC' | 'Savings' | 'FD';

export interface IBankAccount extends Document {
  companyId: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  accountType: AccountType;
  bookBalance: number;
  statementBalance?: number;
  differenceAmt?: number;
  lastReconciliationDate?: Date;
  unreconciledReceipts?: number;
  unreconciledPayments?: number;
  odLimit?: number;
  odUsed?: number;
  isActive: boolean;
  syncId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    companyId:               { type: String, required: true, index: true },
    bankName:                { type: String, required: true },
    branch:                  { type: String, default: '' },
    accountNumber:           { type: String, required: true },
    accountType:             { type: String, required: true, enum: ['Current','OD','CC','Savings','FD'], default: 'Current' },
    bookBalance:             { type: Number, required: true, default: 0 },
    statementBalance:        { type: Number },
    differenceAmt:           { type: Number },
    lastReconciliationDate:  { type: Date },
    unreconciledReceipts:    { type: Number, default: 0 },
    unreconciledPayments:    { type: Number, default: 0 },
    odLimit:                 { type: Number },
    odUsed:                  { type: Number },
    isActive:                { type: Boolean, default: true },
    syncId:                  { type: String, index: true },
  },
  { timestamps: true, collection: 'bankaccounts' }
);

BankAccountSchema.index({ companyId: 1, accountType: 1 });

const BankAccount: Model<IBankAccount> =
  mongoose.models.BankAccount ?? mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);
export default BankAccount;
