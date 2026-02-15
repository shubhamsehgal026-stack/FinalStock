
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
  REJECTED = 'REJECTED'
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
  reason: string;
  status: RequestStatus;
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
  avgValue: number;
  totalPurchased: number;
  totalIssued: number;
}