import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayrollCompliance {
  item: string;
  dueDate: Date;
  amount: number;
  isPaid: boolean;
  paidDate?: Date;
  challanRef?: string;
}

export interface IPayrollRecord extends Document {
  companyId: string;
  financialYear: string;
  month: number;
  totalEmployees: number;
  grossSalary: number;
  employeePF: number;
  employerPF: number;
  employeeESI: number;
  employerESI: number;
  professionalTax: number;
  tdsOnSalary: number;
  lwf: number;
  netSalaryPaid: number;
  salaryPaidDate?: Date;
  status: 'pending' | 'processed' | 'paid';
  compliance: IPayrollCompliance[];
  departmentBreakup?: Array<{ department: string; headcount: number; grossSalary: number }>;
  enteredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceSchema = new Schema<IPayrollCompliance>(
  { item: String, dueDate: Date, amount: Number, isPaid: { type: Boolean, default: false }, paidDate: Date, challanRef: String },
  { _id: false }
);

const DeptSchema = new Schema(
  { department: String, headcount: Number, grossSalary: Number },
  { _id: false }
);

const PayrollRecordSchema = new Schema<IPayrollRecord>(
  {
    companyId:         { type: String, required: true, index: true },
    financialYear:     { type: String, required: true },
    month:             { type: Number, required: true, min: 1, max: 12 },
    totalEmployees:    { type: Number, required: true },
    grossSalary:       { type: Number, required: true },
    employeePF:        { type: Number, default: 0 },
    employerPF:        { type: Number, default: 0 },
    employeeESI:       { type: Number, default: 0 },
    employerESI:       { type: Number, default: 0 },
    professionalTax:   { type: Number, default: 0 },
    tdsOnSalary:       { type: Number, default: 0 },
    lwf:               { type: Number, default: 0 },
    netSalaryPaid:     { type: Number, default: 0 },
    salaryPaidDate:    { type: Date },
    status:            { type: String, enum: ['pending','processed','paid'], default: 'pending' },
    compliance:        { type: [ComplianceSchema], default: [] },
    departmentBreakup: { type: [DeptSchema], default: [] },
    enteredBy:         { type: String },
  },
  { timestamps: true, collection: 'payrollrecords' }
);

PayrollRecordSchema.index({ companyId: 1, financialYear: 1, month: 1 }, { unique: true });

const PayrollRecord: Model<IPayrollRecord> =
  mongoose.models.PayrollRecord ?? mongoose.model<IPayrollRecord>('PayrollRecord', PayrollRecordSchema);
export default PayrollRecord;
