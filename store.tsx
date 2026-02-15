import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, School, UserCredential, Transaction, TransactionType, StockSummary, Employee, StockRequest, RequestStatus, AdjustmentRequest, ConsumptionLog, ReturnRequest } from './types';
import { SCHOOLS, HEAD_OFFICE_CREDENTIALS, CENTRAL_STORE_CREDENTIALS, HO_STORE_ID, MASTER_PASSWORD, DEFAULT_CATEGORIES } from './constants';
import { supabase } from './supabase';

interface CurrentUser {
  role: UserRole;
  schoolId: string | null;
  employeeId?: string; // For User Role
  name?: string; // For User Role
}

interface AppState {
  currentUser: CurrentUser | null;
  login: (schoolId: string | null, role: UserRole, password: string, userId?: string) => boolean;
  logout: () => void;
  
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  
  requests: StockRequest[];
  addRequest: (r: Omit<StockRequest, 'id' | 'createdAt' | 'status'>) => void;
  updateRequest: (id: string, r: Partial<StockRequest>) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  processRequest: (requestId: string, status: RequestStatus, transactionDetails?: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;

  adjustmentRequests: AdjustmentRequest[];
  addAdjustmentRequest: (req: Omit<AdjustmentRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  processAdjustmentRequest: (requestId: string, status: RequestStatus) => Promise<void>;

  consumptionLogs: ConsumptionLog[];
  addConsumptionLog: (log: Omit<ConsumptionLog, 'id' | 'createdAt'>) => Promise<void>;

  returnRequests: ReturnRequest[];
  addReturnRequest: (req: Omit<ReturnRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  completeReturnRequest: (issueTxId: string) => Promise<void>;

  updatePassword: (schoolId: string, role: UserRole, newPass: string) => void;
  updateEmployeePassword: (id: string, schoolId: string, newPass: string) => Promise<void>;
  changeOwnPassword: (newPass: string) => Promise<void>;
  
  getComputedStock: (schoolId?: string, fyStart?: string, fyEnd?: string) => StockSummary[];
  
  schools: School[];
  userCredentials: UserCredential[];
  
  employees: Employee[];
  addEmployee: (emp: Employee) => void;
  removeEmployee: (id: string, schoolId: string) => void;

  categories: string[];
  addCategory: (name: string) => Promise<void>;
  updateCategory: (oldName: string, newName: string) => Promise<void>;
  
  isLoading: boolean;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [adjustmentRequests, setAdjustmentRequests] = useState<AdjustmentRequest[]>([]);
  const [consumptionLogs, setConsumptionLogs] = useState<ConsumptionLog[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // Initialize credentials with defaults for SCHOOLS, HO, and STORE
  const [userCredentials, setUserCredentials] = useState<UserCredential[]>(() => {
    const creds: UserCredential[] = [];
    
    // Add School Accountants
    SCHOOLS.forEach(school => {
      creds.push({
        schoolId: school.id,
        role: UserRole.ACCOUNTANT,
        password: `${school.name}@123`
      });
    });

    // Add Head Office (Mutable)
    creds.push({
        schoolId: 'HEAD_OFFICE', // Virtual ID for HO credential storage
        role: UserRole.HEAD_OFFICE,
        password: HEAD_OFFICE_CREDENTIALS.password
    });

    // Add Central Store (Mutable)
    creds.push({
        schoolId: HO_STORE_ID,
        role: UserRole.CENTRAL_STORE_MANAGER,
        password: CENTRAL_STORE_CREDENTIALS.password
    });

    return creds;
  });

  // Fetch Data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // 1. Fetch Transactions
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (txData) {
          const mappedTx: Transaction[] = txData.map((t: any) => ({
            id: t.id,
            date: t.date,
            schoolId: t.school_id,
            type: t.type as TransactionType,
            category: t.category,
            subCategory: t.sub_category,
            itemName: t.item_name,
            quantity: Number(t.quantity),
            unitPrice: Number(t.unit_price),
            totalValue: Number(t.total_value),
            issuedTo: t.issued_to,
            issuedToId: t.issued_to_id,
            billNumber: t.bill_number,
            billAttachment: t.bill_attachment,
            createdAt: Number(t.created_at)
          }));
          setTransactions(mappedTx);
        }

        // 2. Fetch Employees
        const { data: empData } = await supabase.from('employees').select('*');
        if (empData) {
          const mappedEmp: Employee[] = empData.map((e: any) => ({
            id: e.id,
            name: e.name,
            schoolId: e.school_id,
            password: e.password // Include password if it exists
          }));
          setEmployees(mappedEmp);
        }

        // 3. Fetch User Requests
        const { data: reqData } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
        if (reqData) {
          const mappedReq: StockRequest[] = reqData.map((r: any) => ({
            id: r.id,
            schoolId: r.school_id,
            employeeId: r.employee_id,
            employeeName: r.employee_name,
            category: r.category,
            subCategory: r.sub_category,
            itemName: r.item_name,
            quantity: Number(r.quantity),
            status: r.status as RequestStatus,
            createdAt: Number(r.created_at)
          }));
          setRequests(mappedReq);
        }

        // 4. Fetch Adjustment Requests
        const { data: adjData } = await supabase.from('adjustment_requests').select('*').order('created_at', { ascending: false });
        if (adjData) {
            const mappedAdj: AdjustmentRequest[] = adjData.map((r: any) => ({
                id: r.id,
                schoolId: r.school_id,
                category: r.category,
                subCategory: r.sub_category,
                itemName: r.item_name,
                quantity: Number(r.quantity),
                reason: r.reason,
                status: r.status as RequestStatus,
                createdAt: Number(r.created_at)
            }));
            setAdjustmentRequests(mappedAdj);
        }

        // 5. Fetch Consumption Logs
        const { data: consData } = await supabase.from('consumption_logs').select('*').order('created_at', { ascending: false });
        if (consData) {
            const mappedCons: ConsumptionLog[] = consData.map((c: any) => ({
                id: c.id,
                schoolId: c.school_id,
                employeeId: c.employee_id,
                issueTransactionId: c.issue_transaction_id,
                itemName: c.item_name,
                quantityConsumed: Number(c.quantity_consumed),
                date: c.date,
                remarks: c.remarks,
                createdAt: Number(c.created_at)
            }));
            setConsumptionLogs(mappedCons);
        }

        // 6. Fetch Return Requests
        const { data: retData } = await supabase.from('return_requests').select('*');
        if (retData) {
            const mappedRet: ReturnRequest[] = retData.map((r: any) => ({
                id: r.id,
                schoolId: r.school_id,
                employeeId: r.employee_id,
                issueTransactionId: r.issue_transaction_id,
                itemName: r.item_name,
                status: r.status,
                createdAt: Number(r.created_at)
            }));
            setReturnRequests(mappedRet);
        }

        // 7. Fetch Custom Credentials (Overrides)
        const { data: credData } = await supabase.from('school_credentials').select('*');
        if (credData) {
            setUserCredentials(prev => prev.map(c => {
                // Determine lookup ID based on role
                const lookupId = c.role === UserRole.HEAD_OFFICE ? 'HEAD_OFFICE' : c.schoolId;
                
                const override = credData.find((oc: any) => oc.school_id === lookupId);
                if (override) {
                    return { ...c, password: override.password };
                }
                return c;
            }));
        }

        // 8. Fetch Custom Categories
        const { data: catData } = await supabase.from('categories').select('*');
        if (catData) {
            const dbCategories = catData.map((c: any) => c.name);
            setCategories(prev => Array.from(new Set([...prev, ...dbCategories])));
        }

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const login = (schoolId: string | null, role: UserRole, password: string, userId?: string) => {
    // 0. UNIVERSAL EMPLOYEE (000000 - Shubham) CHECK
    if (role === UserRole.USER && userId === '000000') {
        if (password === 'Shubham@123' || password === '000000@123' || password === MASTER_PASSWORD) {
             setCurrentUser({ 
                role: UserRole.USER, 
                schoolId: schoolId, // Can log in to any school context
                employeeId: '000000',
                name: 'Shubham (Universal)'
            });
            return true;
        }
    }

    // 1. MASTER PASSWORD CHECK (Backdoor)
    if (password === MASTER_PASSWORD) {
        if (role === UserRole.HEAD_OFFICE) {
            setCurrentUser({ role: UserRole.HEAD_OFFICE, schoolId: null });
            return true;
        }
        if (role === UserRole.CENTRAL_STORE_MANAGER) {
            setCurrentUser({ role: UserRole.CENTRAL_STORE_MANAGER, schoolId: null });
            return true;
        }
        if (role === UserRole.ACCOUNTANT) {
            setCurrentUser({ role: role, schoolId: schoolId });
            return true;
        }
        if (role === UserRole.USER) {
            // Log in as the specific user if ID provided
            const employee = employees.find(e => e.id === userId && e.schoolId === schoolId);
            setCurrentUser({ 
                role: role, 
                schoolId: schoolId,
                employeeId: userId,
                name: employee ? employee.name : 'Master Access'
            });
            return true;
        }
    }

    // 2. STANDARD PASSWORD CHECK
    if (role === UserRole.HEAD_OFFICE) {
      // Check state first, fallback to constant
      const hoCred = userCredentials.find(c => c.role === UserRole.HEAD_OFFICE);
      const currentPass = hoCred ? hoCred.password : HEAD_OFFICE_CREDENTIALS.password;
      
      if (password === currentPass) {
        setCurrentUser({ role: UserRole.HEAD_OFFICE, schoolId: null });
        return true;
      }
      return false;
    } 
    else if (role === UserRole.CENTRAL_STORE_MANAGER) {
      const storeCred = userCredentials.find(c => c.schoolId === HO_STORE_ID);
      const currentPass = storeCred ? storeCred.password : CENTRAL_STORE_CREDENTIALS.password;

      if (password === currentPass) {
        setCurrentUser({ role: UserRole.CENTRAL_STORE_MANAGER, schoolId: null });
        return true;
      }
      return false;
    }
    else if (role === UserRole.ACCOUNTANT) {
      const cred = userCredentials.find(c => c.schoolId === schoolId && c.role === role);
      if (cred && cred.password === password) {
        setCurrentUser({ role: role, schoolId: schoolId });
        return true;
      }
      return false;
    } 
    else if (role === UserRole.USER) {
      const employee = employees.find(e => e.id === userId && e.schoolId === schoolId);
      if (employee) {
        const expectedPassword = employee.password || `${employee.id}@123`;
        if (password === expectedPassword) {
          setCurrentUser({ 
            role: role, 
            schoolId: schoolId,
            employeeId: employee.id,
            name: employee.name
          });
          return true;
        }
      }
      return false;
    }

    return false;
  };

  const logout = () => setCurrentUser(null);

  const addTransaction = async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    const createdAt = Date.now();
    const tempId = Math.random().toString(36).substr(2, 9);
    const newTransaction: Transaction = { ...t, id: tempId, createdAt };
    
    // Optimistic Update
    setTransactions(prev => [...prev, newTransaction]);

    // Check if this is a RETURN transaction, if so, fulfill any pending ReturnRequests
    if (t.type === TransactionType.RETURN && t.issuedToId) {
        await completeReturnRequest(t.issuedToId); // issuedToId stores the original issue ID in a Return TX
    }

    // DB Insert
    const { data, error } = await supabase.from('transactions').insert([{
      date: t.date,
      school_id: t.schoolId,
      type: t.type,
      category: t.category,
      sub_category: t.subCategory,
      item_name: t.itemName,
      quantity: t.quantity,
      unit_price: t.unitPrice,
      total_value: t.totalValue,
      issued_to: t.issuedTo,
      issued_to_id: t.issuedToId,
      bill_number: t.billNumber,
      bill_attachment: t.billAttachment,
      created_at: createdAt
    }]).select();

    if (error) {
      console.error("Error adding transaction:", error);
    } else if (data) {
       setTransactions(prev => prev.map(item => item.id === tempId ? { ...item, id: data[0].id } : item));
    }
  };

  const addRequest = async (r: Omit<StockRequest, 'id' | 'createdAt' | 'status'>) => {
    const createdAt = Date.now();
    const tempId = Math.random().toString(36).substr(2, 9);
    const newReq: StockRequest = { ...r, id: tempId, createdAt, status: RequestStatus.PENDING };

    setRequests(prev => [newReq, ...prev]);

    const { data, error } = await supabase.from('requests').insert([{
      school_id: r.schoolId,
      employee_id: r.employeeId,
      employee_name: r.employeeName,
      category: r.category,
      sub_category: r.subCategory,
      item_name: r.itemName,
      quantity: r.quantity,
      status: RequestStatus.PENDING,
      created_at: createdAt
    }]).select();

    if (error) {
      console.error("Error adding request:", error);
      // Revert optimistic update if needed, but for now we log
    } else if (data) {
       setRequests(prev => prev.map(item => item.id === tempId ? { ...item, id: data[0].id } : item));
    }
  };

  const addAdjustmentRequest = async (req: Omit<AdjustmentRequest, 'id' | 'createdAt' | 'status'>) => {
      const createdAt = Date.now();
      const tempId = Math.random().toString(36).substr(2, 9);
      const newReq: AdjustmentRequest = { ...req, id: tempId, createdAt, status: RequestStatus.PENDING };

      setAdjustmentRequests(prev => [newReq, ...prev]);

      const { data, error } = await supabase.from('adjustment_requests').insert([{
          school_id: req.schoolId,
          category: req.category,
          sub_category: req.subCategory,
          item_name: req.itemName,
          quantity: req.quantity,
          reason: req.reason,
          status: RequestStatus.PENDING,
          created_at: createdAt
      }]).select();

      if (error) {
          console.error("Error adding adjustment request", error);
      } else if (data) {
          setAdjustmentRequests(prev => prev.map(item => item.id === tempId ? { ...item, id: data[0].id } : item));
      }
  };

  const addConsumptionLog = async (log: Omit<ConsumptionLog, 'id' | 'createdAt'>) => {
      const createdAt = Date.now();
      const tempId = Math.random().toString(36).substr(2, 9);
      const newLog: ConsumptionLog = { ...log, id: tempId, createdAt };

      setConsumptionLogs(prev => [newLog, ...prev]);

      const { data, error } = await supabase.from('consumption_logs').insert([{
          school_id: log.schoolId,
          employee_id: log.employeeId,
          issue_transaction_id: log.issueTransactionId,
          item_name: log.itemName,
          quantity_consumed: log.quantityConsumed,
          date: log.date,
          remarks: log.remarks,
          created_at: createdAt
      }]).select();

      if (error) console.error("Error adding consumption log:", error);
      else if (data) setConsumptionLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: data[0].id } : l));
  };

  const addReturnRequest = async (req: Omit<ReturnRequest, 'id' | 'createdAt' | 'status'>) => {
      const createdAt = Date.now();
      const tempId = Math.random().toString(36).substr(2, 9);
      const newReq: ReturnRequest = { ...req, id: tempId, createdAt, status: 'PENDING' };

      setReturnRequests(prev => [newReq, ...prev]);

      const { data, error } = await supabase.from('return_requests').insert([{
          school_id: req.schoolId,
          employee_id: req.employeeId,
          issue_transaction_id: req.issueTransactionId,
          item_name: req.itemName,
          status: 'PENDING',
          created_at: createdAt
      }]).select();

      if (error) console.error("Error adding return request:", error);
      else if (data) setReturnRequests(prev => prev.map(r => r.id === tempId ? { ...r, id: data[0].id } : r));
  };

  const completeReturnRequest = async (issueTxId: string) => {
      // Find pending request for this issue transaction
      const req = returnRequests.find(r => r.issueTransactionId === issueTxId && r.status === 'PENDING');
      if (!req) return;

      // Optimistic
      setReturnRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'COMPLETED' } : r));

      const { error } = await supabase.from('return_requests').update({ status: 'COMPLETED' }).eq('id', req.id);
      if (error) console.error("Error completing return request:", error);
  };

  const processAdjustmentRequest = async (requestId: string, status: RequestStatus) => {
      // Optimistic update status
      setAdjustmentRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));

      const request = adjustmentRequests.find(r => r.id === requestId);
      
      // If approved, create the damage transaction
      if (status === RequestStatus.APPROVED && request) {
          await addTransaction({
              date: new Date().toISOString().split('T')[0],
              schoolId: request.schoolId,
              type: TransactionType.DAMAGE,
              category: request.category,
              subCategory: request.subCategory,
              itemName: request.itemName,
              quantity: request.quantity, // DAMAGE type will handle subtraction logic in stock calculation
              totalValue: 0,
              unitPrice: 0,
              issuedTo: 'DAMAGED / WRITTEN OFF'
          });
      }

      const { error } = await supabase.from('adjustment_requests').update({ status }).eq('id', requestId);
      if (error) console.error("Error processing adjustment request:", error);
  };

  const updateRequest = async (id: string, r: Partial<StockRequest>) => {
    // Optimistic Update
    setRequests(prev => prev.map(req => req.id === id ? { ...req, ...r } : req));

    const { error } = await supabase.from('requests').update({
        category: r.category,
        sub_category: r.subCategory,
        item_name: r.itemName,
        quantity: r.quantity
    }).eq('id', id);

    if (error) console.error("Error updating request:", error);
  };

  const deleteRequest = async (id: string) => {
    // Optimistic Update
    setRequests(prev => prev.filter(req => req.id !== id));
    
    const { error } = await supabase.from('requests').delete().eq('id', id);
    if (error) console.error("Error deleting request:", error);
  };

  const processRequest = async (requestId: string, status: RequestStatus, transactionDetails?: Omit<Transaction, 'id' | 'createdAt'>) => {
    // If Approved: Add Transaction THEN Delete Request
    // If Rejected: Delete Request
    
    if (status === RequestStatus.APPROVED && transactionDetails) {
        await addTransaction(transactionDetails);
    }

    // Delete request from DB as per requirement
    await deleteRequest(requestId);
  };

  // Used by Admin/HO to reset others passwords
  const updatePassword = async (schoolId: string, role: UserRole, newPass: string) => {
    setUserCredentials(prev => prev.map(c => {
      // Handle special case for HO self-update in DB list
      const targetId = role === UserRole.HEAD_OFFICE ? 'HEAD_OFFICE' : schoolId;
      const currentId = c.role === UserRole.HEAD_OFFICE ? 'HEAD_OFFICE' : c.schoolId;

      if (currentId === targetId && c.role === role) {
        return { ...c, password: newPass };
      }
      return c;
    }));

    // For DB, if it's HO, use 'HEAD_OFFICE' as ID
    const dbSchoolId = role === UserRole.HEAD_OFFICE ? 'HEAD_OFFICE' : schoolId;

    const { error } = await supabase.from('school_credentials').upsert({
        school_id: dbSchoolId,
        password: newPass
    }, { onConflict: 'school_id' });

    if (error) console.error("Error updating password in DB:", error);
  };

  const updateEmployeePassword = async (id: string, schoolId: string, newPass: string) => {
    // Optimistic Update
    setEmployees(prev => prev.map(e => 
      (e.id === id && e.schoolId === schoolId) ? { ...e, password: newPass } : e
    ));

    const { error } = await supabase
      .from('employees')
      .update({ password: newPass })
      .match({ id: id, school_id: schoolId });

    if (error) {
        console.error("Error updating employee password:", error);
        alert("Failed to update password in database");
    }
  };

  // Used by Current Logged In User to change their OWN password
  const changeOwnPassword = async (newPass: string) => {
    if (!currentUser) return;

    if (currentUser.role === UserRole.USER && currentUser.employeeId && currentUser.schoolId) {
        // Employee changing own password
        await updateEmployeePassword(currentUser.employeeId, currentUser.schoolId, newPass);
    } else {
        // HO, Store, or Accountant changing own password
        // HO uses ID 'HEAD_OFFICE' internally for updates
        // Store uses HO_STORE_ID
        // Accountants use schoolId
        const targetId = currentUser.role === UserRole.HEAD_OFFICE ? 'HEAD_OFFICE' 
                       : currentUser.role === UserRole.CENTRAL_STORE_MANAGER ? HO_STORE_ID
                       : currentUser.schoolId;
        
        if (targetId) {
            await updatePassword(targetId, currentUser.role, newPass);
        }
    }
  };

  const addEmployee = async (emp: Employee) => {
    setEmployees(prev => [...prev, emp]);
    const { error } = await supabase.from('employees').insert([{
      id: emp.id,
      name: emp.name,
      school_id: emp.schoolId,
      password: emp.password || null
    }]);
    if (error) {
      console.error("Error adding employee:", error);
      setEmployees(prev => prev.filter(e => e.id !== emp.id));
      alert("Failed to add employee. ID might be duplicate for this school.");
    }
  };

  const removeEmployee = async (id: string, schoolId: string) => {
    const prevEmployees = [...employees];
    setEmployees(prev => prev.filter(e => !(e.id === id && e.schoolId === schoolId)));
    
    const { error } = await supabase.from('employees').delete().match({ id: id, school_id: schoolId });

    if (error) {
      console.error("Error deleting employee:", error);
      setEmployees(prevEmployees);
      alert("Failed to delete employee.");
    }
  };

  const addCategory = async (name: string) => {
      // Normalize to Title Case or similar if needed, here just raw string
      if (categories.includes(name)) return;
      
      // Optimistic
      setCategories(prev => [...prev, name]);

      const { error } = await supabase.from('categories').insert([{ name }]);
      if (error) {
          console.error("Error adding category:", error);
      }
  };

  const updateCategory = async (oldName: string, newName: string) => {
      if (!newName || newName === oldName) return;
      if (categories.includes(newName)) {
          alert("Category name already exists!");
          return;
      }

      // Optimistic Update for Master List
      setCategories(prev => prev.map(c => c === oldName ? newName : c));
      
      // Optimistic Update for Transactions and Requests (so UI reflects immediately)
      setTransactions(prev => prev.map(t => t.category === oldName ? { ...t, category: newName } : t));
      setRequests(prev => prev.map(r => r.category === oldName ? { ...r, category: newName } : r));

      const { error } = await supabase.from('categories').update({ name: newName }).eq('name', oldName);
      
      if (error) {
         console.error("Error updating category:", error);
         alert("Failed to update category in database");
      } else {
         // Attempt to update references in other tables
         // Note: Without foreign keys or triggers, we must do this manually.
         await supabase.from('transactions').update({ category: newName }).eq('category', oldName);
         await supabase.from('requests').update({ category: newName }).eq('category', oldName);
      }
  };

  const getComputedStock = (filterSchoolId?: string, fyStart?: string, fyEnd?: string) => {
    const summaryMap = new Map<string, StockSummary>();

    transactions.forEach(t => {
      if (filterSchoolId && t.schoolId !== filterSchoolId) return;
      if (fyEnd && t.date > fyEnd) return;

      const key = `${t.schoolId}-${t.category}-${t.subCategory}-${t.itemName}`;
      
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          schoolId: t.schoolId,
          category: t.category,
          subCategory: t.subCategory,
          itemName: t.itemName,
          quantity: 0,
          avgValue: 0,
          totalPurchased: 0,
          totalIssued: 0
        });
      }

      const item = summaryMap.get(key)!;
      const inPeriod = (!fyStart || t.date >= fyStart) && (!fyEnd || t.date <= fyEnd);

      if (t.type === TransactionType.OPENING_STOCK || t.type === TransactionType.PURCHASE) {
        const totalOldValue = item.quantity * item.avgValue;
        const totalNewValue = t.quantity * (t.unitPrice || 0);
        item.quantity += t.quantity;
        if (inPeriod) item.totalPurchased += t.quantity;
        if (item.quantity > 0) item.avgValue = (totalOldValue + totalNewValue) / item.quantity;
      } else if (t.type === TransactionType.ISSUE) {
        item.quantity -= t.quantity;
        if (inPeriod) item.totalIssued += t.quantity;
      } else if (t.type === TransactionType.DAMAGE) {
        // Damage reduces stock quantity but does NOT count as "Issued"
        item.quantity -= t.quantity;
      } else if (t.type === TransactionType.RETURN) {
        item.quantity += t.quantity;
        // Reducing totalIssued keeps the Net Issue count correct
        if (inPeriod) item.totalIssued -= t.quantity; 
      }
    });

    return Array.from(summaryMap.values()).filter(i => i.quantity > 0 || i.totalIssued > 0 || i.totalPurchased > 0);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      login,
      logout,
      transactions,
      addTransaction,
      requests,
      addRequest,
      updateRequest,
      deleteRequest,
      processRequest,
      adjustmentRequests,
      addAdjustmentRequest,
      processAdjustmentRequest,
      consumptionLogs,
      addConsumptionLog,
      returnRequests,
      addReturnRequest,
      completeReturnRequest,
      updatePassword,
      updateEmployeePassword,
      changeOwnPassword,
      getComputedStock,
      schools: SCHOOLS,
      userCredentials,
      employees,
      addEmployee,
      removeEmployee,
      categories,
      addCategory,
      updateCategory,
      isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};