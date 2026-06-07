import mongoose, { Schema, Document, Model } from 'mongoose';

interface IStockQV { quantity?: number; rate?: number; amount?: number; }
interface IStockFlow { quantity?: number; amount?: number; }

export interface IStockItem extends Document {
  companyId: string;
  itemName: string;
  group?: string;
  unit?: string;
  openingStock?: IStockQV;
  closingStock?: IStockQV;
  inwards?: IStockFlow;
  outwards?: IStockFlow;
  rawData?: mongoose.Schema.Types.Mixed;
  syncId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QVSchema = new Schema<IStockQV>({ quantity: Number, rate: Number, amount: Number }, { _id: false });
const FlowSchema = new Schema<IStockFlow>({ quantity: Number, amount: Number }, { _id: false });

const StockItemSchema = new Schema<IStockItem>(
  {
    companyId:    { type: String, required: true, index: true },
    itemName:     { type: String, required: true },
    group:        { type: String },
    unit:         { type: String },
    openingStock: { type: QVSchema },
    closingStock:  { type: QVSchema },
    inwards:      { type: FlowSchema },
    outwards:     { type: FlowSchema },
    rawData:      { type: Schema.Types.Mixed },
    syncId:       { type: String, index: true },
  },
  { timestamps: true, collection: 'stockitems' }
);

StockItemSchema.index({ companyId: 1, itemName: 1 });

const StockItem: Model<IStockItem> =
  mongoose.models.StockItem ?? mongoose.model<IStockItem>('StockItem', StockItemSchema);
export default StockItem;
