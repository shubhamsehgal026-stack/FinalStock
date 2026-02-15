
export enum UserRole {
  HEAD_OFFICE = 'HEAD_OFFICE',
  ACCOUNTANT = 'ACCOUNTANT',
  USER = 'USER',
  CENTRAL_STORE_MANAGER = 'CENTRAL_STORE_MANAGER'
}

export interface School {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  schoolId: string;
  password?: string; // Optional custom password
}

export interface UserCredential {
  schoolId: string | null; // null for Head Office
  role: UserRole;
  password: string;
}

export enum TransactionType {
  OPENING_STOCK = 'OPENING_STOCK',
  PURCHASE = 'PURCHASE',
  ISSUE = 'ISSUE',
  RETURN = 'RETURN',
  DAMAGE = 'DAMAGE'
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

export interface StockRequest {
  id: string;
  schoolId: string;
  employeeId: string;
  employeeName: string;
  category: string;
  subCategory: string;
  itemName: string;
  quantity: number;
  unit?: string;
  status: RequestStatus;
  createdAt: number;
}

export interface AdjustmentRequest {
  id: string;
  schoolId: string;
  category: string;
  subCategory: string;
  itemName: string;
  quantity: number;
  unit?: string;
  reason: string;
  status: RequestStatus;
  createdAt: number;
}

export interface ConsumptionLog {
  id: string;
  schoolId: string;
  employeeId: string;
  issueTransactionId: string; // Links to the original Issue Transaction
  itemName: string;
  quantityConsumed: number;
  date: string;
  remarks: string;
  createdAt: number;
}

export interface ReturnRequest {
  id: string;
  schoolId: string;
  employeeId: string;
  issueTransactionId: string;
  itemName: string;
  quantity: number;
  status: 'PENDING' | 'COMPLETED';
  createdAt: number;
}

export interface Transaction {
  id: string;
  date: string;
  schoolId: string;
  type: TransactionType;
  category: string;
  subCategory: string;
  itemName: string;
  quantity: number;
  unit?: string; // Added Unit
  unitPrice?: number; // Only for opening/purchase
  totalValue?: number; // Only for opening/purchase
  issuedTo?: string; // Only for issue (Display Name)
  issuedToId?: string; // Only for issue (Employee ID)
  billNumber?: string; // Only for PURCHASE
  billAttachment?: string; // Base64 or URL
  createdAt: number;
}

export interface StockSummary {
  schoolId: string;
  category: string;
  subCategory: string;
  itemName: string;
  quantity: number;
  unit: string;
  avgValue: number;
  totalPurchased: number;
  totalIssued: number;
}