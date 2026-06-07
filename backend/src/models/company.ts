import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompany extends Document {
  companyId: string;
  name: string;
  financialYearFrom?: Date;
  lastSyncAt?: Date;
  agentVersion?: string;
  status?: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    companyId:         { type: String, required: true, unique: true },
    name:              { type: String, required: true },
    financialYearFrom: { type: Date },
    lastSyncAt:        { type: Date },
    agentVersion:      { type: String },
    status:            { type: String, enum: ['active','inactive'], default: 'active' },
  },
  { timestamps: true, collection: 'companies' }
);

const Company: Model<ICompany> =
  mongoose.models.Company ?? mongoose.model<ICompany>('Company', CompanySchema);
export default Company;
