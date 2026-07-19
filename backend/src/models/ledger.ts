import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILedger extends Document {
  companyId: string;
  name: string;
  group: string;
  openingBalance?: number;
  closingBalance?: number;
  isDr?: boolean;
  gstRegistrationType?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  rawData?: mongoose.Schema.Types.Mixed;
  syncId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerSchema = new Schema<ILedger>(
  {
    companyId:            { type: String, required: true, index: true },
    name:                 { type: String, required: true },
    group:                { type: String, required: true },
    openingBalance:       { type: Number },
    closingBalance:       { type: Number },
    isDr:                 { type: Boolean },
    gstRegistrationType:  { type: String },
    gstin:                { type: String },
    phone:                { type: String },
    email:                { type: String },
    rawData:              { type: Schema.Types.Mixed },
    syncId:               { type: String, index: true, unique: true, sparse: true },
  },
  { timestamps: true, collection: 'ledgers' }
);

LedgerSchema.index({ companyId: 1, group: 1, isDr: 1 });
LedgerSchema.index({ companyId: 1, name: 1 });

const Ledger: Model<ILedger> =
  mongoose.models.Ledger ?? mongoose.model<ILedger>('Ledger', LedgerSchema);
export default Ledger;
