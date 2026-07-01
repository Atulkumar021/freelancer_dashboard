import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'owner'
  | 'ceo'
  | 'cfo'
  | 'accountant'
  | 'dept_head'
  | 'branch'
  | 'auditor'
  | 'read_only'
  | 'user';

export const USER_ROLES: UserRole[] = [
  'superadmin',
  'admin',
  'owner',
  'ceo',
  'cfo',
  'accountant',
  'dept_head',
  'branch',
  'auditor',
  'read_only',
  'user',
];

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  companyId?: string;   // null for superadmin; set for admin/user
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name:         { type: String, required: true, trim: true },
    role:         { type: String, enum: USER_ROLES, required: true, default: 'read_only' },
    companyId:    { type: String, index: true },
    isActive:     { type: Boolean, default: true },
    lastLoginAt:  { type: Date },
  },
  { timestamps: true, collection: 'users' }
);

UserSchema.methods.comparePassword = function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);

export default User;
