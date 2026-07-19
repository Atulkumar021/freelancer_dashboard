import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoucherItem {
  itemName?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
}

export interface IGSTDetails {
  cgst?: number;
  sgst?: number;
  igst?: number;
  taxableAmount?: number;
}

export interface IVoucher extends Document {
  companyId: string;
  voucherType: 'Sales' | 'Purchase' | 'Payment' | 'Receipt' | 'Journal';
  voucherNumber: string;
  date: Date;
  partyName?: string;
  amount: number;
  narration?: string;
  items?: IVoucherItem[];
  gstDetails?: IGSTDetails;
  rawData?: mongoose.Schema.Types.Mixed;
  syncId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherItemSchema = new Schema<IVoucherItem>(
  { itemName: String, quantity: Number, rate: Number, amount: Number },
  { _id: false }
);

const GSTDetailsSchema = new Schema<IGSTDetails>(
  { cgst: Number, sgst: Number, igst: Number, taxableAmount: Number },
  { _id: false }
);

const VoucherSchema = new Schema<IVoucher>(
  {
    companyId:     { type: String, required: true, index: true },
    voucherType:   { type: String, required: true, enum: ['Sales','Purchase','Payment','Receipt','Journal'] },
    voucherNumber: { type: String, required: true },
    date:          { type: Date,   required: true, index: true },
    partyName:     { type: String },
    amount:        { type: Number, required: true },
    narration:     { type: String },
    items:         { type: [VoucherItemSchema], default: [] },
    gstDetails:    { type: GSTDetailsSchema },
    rawData:       { type: Schema.Types.Mixed },
    syncId:        { type: String, index: true, unique: true, sparse: true },
  },
  { timestamps: true, collection: 'vouchers' }
);

VoucherSchema.index({ companyId: 1, date: -1 });
VoucherSchema.index({ companyId: 1, voucherType: 1, date: -1 });

const Voucher: Model<IVoucher> =
  mongoose.models.Voucher ?? mongoose.model<IVoucher>('Voucher', VoucherSchema);
export default Voucher;
