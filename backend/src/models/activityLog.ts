import mongoose, { Schema, Document, Model } from 'mongoose';

export type ActivityAction =
  | 'login'
  | 'create_user'
  | 'update_user'
  | 'delete_user'
  | 'create_company'
  | 'update_company'
  | 'delete_company';

export interface IActivityLog extends Document {
  userId: string;
  userEmail: string;
  userName: string;
  companyId?: string;
  action: ActivityAction;
  details?: string;
  ip?: string;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId:    { type: String, required: true },
    userEmail: { type: String, required: true },
    userName:  { type: String, required: true },
    companyId: { type: String },
    action:    { type: String, required: true },
    details:   { type: String },
    ip:        { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'activityLogs' },
);

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ?? mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
export default ActivityLog;
