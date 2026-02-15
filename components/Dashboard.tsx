import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { UserRole, Employee, RequestStatus } from '../types';
import { InventoryTable } from './InventoryTable';
import { AddStockForm, IssueStockForm, ReturnStockManager } from './InventoryActions';
import { UserRequestForm, AccountantRequestManager } from './RequestComponents';
import { AccountantAdjustmentForm, HOAdjustmentManager } from './AdjustmentComponents';
import { EmployeeConsumptionModule, AccountantConsumptionManager } from './ConsumptionComponents';
import { ReportsModule } from './ReportsModule';
import { HOStoreModule } from './HOStoreModule';
import { FINANCIAL_YEARS, getCurrentFinancialYear, HO_STORE_ID } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { LogOut, LayoutDashboard, Shield, Package, School as SchoolIcon, KeyRound, ArrowDownToLine, ArrowUpFromLine, Calendar, Users, Trash2, Building, Bell, Send, FileSpreadsheet, X, ChevronRight, Layers, Lock, RotateCcw, Store, FolderInput, FolderOutput, LayoutGrid, Menu, Settings, Tags, Plus, Pencil, Check, AlertTriangle, ClipboardList } from 'lucide-react';

const inputClass = "mt-1 block w-full rounded-md border-slate-600 bg-slate-800 text-white shadow-sm p-2 border placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

export const Dashboard: React.FC = () => {
  const { currentUser, logout, getComputedStock, schools, updatePassword, updateEmployeePassword, changeOwnPassword, employees, addEmployee, removeEmployee, transactions, requests, adjustmentRequests, categories, addCategory, updateCategory } = useAppStore();
  const [activeView, setActiveView] = useState<'DASH' | 'STOCK' | 'ISSUE' | 'RETURN' | 'ADMIN' | 'EMPLOYEES' | 'REQUESTS' | 'REPORTS' | 'HO_STORE_DASH' | 'HO_STORE_ADD' | 'HO_STORE_ISSUE' | 'SETTINGS' | 'DAMAGE_REPORT' | 'DAMAGE_ADMIN' | 'MY_CONSUMPTION' | 'TRACK_CONSUMPTION'>('DASH');
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // HO View State
  const [hoViewMode, setHoViewMode] = useState<'HOLISTIC' | 'SCHOOL'>('HOLISTIC');
  const [hoFilterSchool, setHoFilterSchool] = useState<string>('');
  
  // Financial Year State
  const [financialYear, setFinancialYear] = useState<string>(getCurrentFinancialYear());

  // Admin Password Management State
  const [adminSchoolId, setAdminSchoolId] = useState('');
  const [adminRole, setAdminRole] = useState(UserRole.ACCOUNTANT);
  const [newPass, setNewPass] = useState('');

  // Admin Category Management State
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Self Password Change State
  const [myNewPassword, setMyNewPassword] = useState('');

  // Employee Management State
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpSchool, setNewEmpSchool] = useState('');
  
  // Employee Password Reset State
  const [resetEmpData, setResetEmpData] = useState<{id: string, name: string, schoolId: string} | null>(null);
  const [newEmpPassword, setNewEmpPassword] = useState('');

  // Sub-category Modal State
  const [viewCategoryDetails, setViewCategoryDetails] = useState<string | null>(null);

  // Calculate Dates from Financial Year string (e.g., "2023-2024")
  const [startYear, endYear] = financialYear.split('-').map(Number);
  const fyStartDate = `${startYear}-04-01`;
  const fyEndDate = `${endYear}-03-31`;

  const isHO = currentUser?.role === UserRole.HEAD_OFFICE;
  const isAccountant = currentUser?.role === UserRole.ACCOUNTANT;
  const isUser = currentUser?.role === UserRole.USER;
  const isStoreManager = currentUser?.role === UserRole.CENTRAL_STORE_MANAGER;

  // Set default view for Store Manager
  useEffect(() => {
    if (isStoreManager && activeView === 'DASH') {
        setActiveView('HO_STORE_DASH');
    }
  }, [isStoreManager, activeView]);

  // Notification count for Accountant (User Requests)
  const pendingRequestCount = isAccountant 
    ? requests.filter(r => r.schoolId === currentUser?.schoolId && r.status === RequestStatus.PENDING).length
    : 0;

  // Notification count for HO (Damage Requests)
  const pendingDamageCount = isHO
    ? adjustmentRequests.filter(r => r.status === RequestStatus.PENDING).length
    : 0;

  // Pre-fill school for Accountant in Employee View
  useEffect(() => {
    if (isAccountant && currentUser?.schoolId) {
        setNewEmpSchool(currentUser.schoolId);
    } else if (isHO && activeView === 'EMPLOYEES') {
        // Optional: clear or keep previous selection for HO
    }
  }, [currentUser, isAccountant, isHO, activeView]);

  // Reset filter when switching to Holistic
  useEffect(() => {
    if (hoViewMode === 'HOLISTIC') {
        setHoFilterSchool('');
    }
  }, [hoViewMode]);

  
  // Determine data source filtered by FY
  const rawStockData = (isHO || isStoreManager)
    ? getComputedStock(hoViewMode === 'SCHOOL' ? hoFilterSchool : undefined, fyStartDate, fyEndDate)
    : getComputedStock(currentUser?.schoolId || '', fyStartDate, fyEndDate);
  
  const stockData = useMemo(() => {
      // Filter out HO Store Items from the main dashboard views
      return rawStockData.filter(s => s.schoolId !== HO_STORE_ID);
  }, [rawStockData]);

  // Filtered Transactions for Reports/Stats
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
       const dateMatch = t.date >= fyStartDate && t.date <= fyEndDate;
       if (!dateMatch) return false;
       
       // Exclude HO Store Transactions from main dashboard
       if (t.schoolId === HO_STORE_ID) return false;

       if (isHO) {
           if (hoViewMode === 'SCHOOL' && hoFilterSchool) {
               return t.schoolId === hoFilterSchool;
           }
           return true; // Holistic
       } else {
           return t.schoolId === currentUser?.schoolId;
       }
    });
  }, [transactions, isHO, hoViewMode, hoFilterSchool, currentUser, fyStartDate, fyEndDate]);


  // Aggregates for Dashboard
  const totalPurchased = stockData.reduce((acc, curr) => acc + curr.totalPurchased, 0);
  const totalIssued = stockData.reduce((acc, curr) => acc + curr.totalIssued, 0);

  // --- NEW: Calculate Category Breakdown ---
  const categoryStats = useMemo(() => {
    type SubCatStats = { qty: number; value: number; count: number };
    type CatStats = { qty: number; value: number; count: number; subCats: Record<string, SubCatStats> };
    
    const stats: Record<string, CatStats> = {};
    
    stockData.forEach(item => {
        if (!stats[item.category]) {
            stats[item.category] = { qty: 0, value: 0, count: 0, subCats: {} };
        }
        
        // Main Category Stats
        stats[item.category].qty += item.quantity;
        stats[item.category].value += (item.quantity * item.avgValue);
        stats[item.category].count += 1;

        // Sub Category Stats
        if (!stats[item.category].subCats[item.subCategory]) {
            stats[item.category].subCats[item.subCategory] = { qty: 0, value: 0, count: 0 };
        }
        stats[item.category].subCats[item.subCategory].qty += item.quantity;
        stats[item.category].subCats[item.subCategory].value += (item.quantity * item.avgValue);
        stats[item.category].subCats[item.subCategory].count += 1;
    });
    return stats;
  }, [stockData]);

  // Chart Data Preparation (Existing logic, just reused)
  const categoryData = Object.keys(categoryStats).map(cat => ({
      name: cat,
      value: categoryStats[cat].value
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ef4444', '#6366f1'];

  const handlePasswordChange = () => {
    if (!adminSchoolId || !newPass) return;
    
    let targetRole = adminRole;
    if (adminSchoolId === HO_STORE_ID) targetRole = UserRole.CENTRAL_STORE_MANAGER;

    updatePassword(adminSchoolId, targetRole, newPass);
    alert(`Password for ${adminSchoolId} updated successfully!`);
    setNewPass('');
  };

  const handleSelfPasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!myNewPassword) return;
      await changeOwnPassword(myNewPassword);
      alert("Your password has been updated.");
      setMyNewPassword('');
  };
  
  const handleEmployeePasswordReset = async () => {
    if (!resetEmpData || !newEmpPassword) return;
    await updateEmployeePassword(resetEmpData.id, resetEmpData.schoolId, newEmpPassword);
    alert(`Password for Employee ${resetEmpData.id} updated!`);
    setResetEmpData(null);
    setNewEmpPassword('');
  };

  const handleAddEmployee = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newEmpId || !newEmpName || !newEmpSchool) return;
      
      if (employees.some(e => e.id === newEmpId && e.schoolId === newEmpSchool)) {
          alert("Employee ID already exists in this school!");
          return;
      }

      addEmployee({
          id: newEmpId,
          name: newEmpName,
          schoolId: newEmpSchool
      });
      alert("Employee added successfully!");
      setNewEmpId('');
      setNewEmpName('');
      // Only reset school if HO. Accountants stay on their school.
      if (isHO) setNewEmpSchool('');
  };

  const handleAddCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategory) return;
      await addCategory(newCategory);
      setNewCategory('');
      alert("Category Added!");
  };

  const startEditingCategory = (cat: string) => {
    setEditingCategory(cat);
    setEditCategoryName(cat);
  };

  const saveCategoryName = async () => {
    if (editingCategory && editCategoryName) {
        await updateCategory(editingCategory, editCategoryName);
        setEditingCategory(null);
        setEditCategoryName('');
    }
  };

  // User Specific Data
  const myIssuedItems = isUser 
    ? transactions.filter(t => t.type === 'ISSUE' && t.issuedToId === currentUser.employeeId)
    : [];

  const handleNavClick = (view: typeof activeView) => {
      setActiveView(view);
      setIsMobileMenuOpen(false); // Close menu on mobile
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold tracking-tight">Darshan<span className="text-brand-500">Inv</span></h2>
                <p className="text-xs text-slate-400 mt-1">
                    {isHO ? 'Head Office Access' : isStoreManager ? 'Central Store Manager' : `${currentUser?.schoolId} Branch`}
                </p>
                <div className="mt-2 inline-block px-2 py-0.5 rounded bg-brand-900 text-brand-200 text-xs border border-brand-700">
                    {currentUser?.role} {isUser && `(ID: ${currentUser.employeeId})`}
                </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
                <X size={24} />
            </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {isHO && (
                <div className="mb-6 space-y-2">
                    <div className="px-4 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">School Network</div>
                    <button 
                        onClick={() => handleNavClick('DASH')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeView === 'DASH' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <LayoutDashboard size={20} /> Dashboard
                    </button>
                    <button 
                        onClick={() => handleNavClick('STOCK')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeView === 'STOCK' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <Package size={20} /> Inventory View
                    </button>
                    <button 
                        onClick={() => handleNavClick('DAMAGE_ADMIN')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors justify-between ${activeView === 'DAMAGE_ADMIN' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <div className="flex items-center gap-3"><AlertTriangle size={20} /> Damage Requests</div>
                        {pendingDamageCount > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingDamageCount}</span>}
                    </button>
                    <button 
                        onClick={() => handleNavClick('EMPLOYEES')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeView === 'EMPLOYEES' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <Users size={20} /> Employees
                    </button>
                    <button 
                        onClick={() => handleNavClick('REPORTS')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeView === 'REPORTS' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <FileSpreadsheet size={20} /> Reports
                    </button>
                    <button 
                        onClick={() => handleNavClick('ADMIN')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeView === 'ADMIN' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <Shield size={20} /> Admin & Security
                    </button>
                </div>
            )}
            
            {/* HEAD OFFICE CENTRAL STORE SECTION */}
            {(isHO || isStoreManager) && (
                <div className="mb-6 space-y-2">
                    {isHO && <div className="border-t border-slate-700 my-4"></div>}
                    <div className="px-4 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Central Store</div>
                    <button 
                        onClick={() => handleNavClick('HO_STORE_DASH')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeView === 'HO_STORE_DASH' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <LayoutGrid size={20} /> Store Dashboard
                    </button>
                    <button 
                        onClick={() => handleNavClick('HO_STORE_ADD')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeView === 'HO_STORE_ADD' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <FolderInput size={20} /> Add Stock
                    </button>
                    <button 
                        onClick={() => handleNavClick('HO_STORE_ISSUE')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeView === 'HO_STORE_ISSUE' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <FolderOutput size={20} /> Issue Stock
                    </button>
                </div>
            )}

            {isUser && (
                 <div className="space-y-2">
                    <button 
                        onClick={() => handleNavClick('DASH')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'DASH' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <Package size={20} /> My Items
                    </button>
                    <button 
                        onClick={() => handleNavClick('MY_CONSUMPTION')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'MY_CONSUMPTION' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <ClipboardList size={20} /> My Consumption
                    </button>
                    <button 
                        onClick={() => handleNavClick('REQUESTS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'REQUESTS' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <Send size={20} /> Request Item
                    </button>
                 </div>
            )}
            
            {isAccountant && (
                <div className="space-y-2">
                    <button 
                        onClick={() => handleNavClick('DASH')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'DASH' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <LayoutDashboard size={20} /> Dashboard
                    </button>
                    <button 
                        onClick={() => handleNavClick('STOCK')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'STOCK' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <Package size={20} /> Add Stock
                    </button>
                    <button 
                        onClick={() => handleNavClick('ISSUE')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'ISSUE' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <LogOut size={20} /> Issue Stock
                    </button>
                    <button 
                        onClick={() => handleNavClick('RETURN')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'RETURN' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <RotateCcw size={20} /> Return Issue
                    </button>
                    <button 
                        onClick={() => handleNavClick('TRACK_CONSUMPTION')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'TRACK_CONSUMPTION' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <ClipboardList size={20} /> Track Usage
                    </button>
                    <button 
                        onClick={() => handleNavClick('DAMAGE_REPORT')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'DAMAGE_REPORT' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <AlertTriangle size={20} /> Report Damage
                    </button>
                    <button 
                        onClick={() => handleNavClick('REQUESTS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors justify-between ${activeView === 'REQUESTS' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Bell size={20} /> Requests
                        </div>
                        {pendingRequestCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {pendingRequestCount}
                            </span>
                        )}
                    </button>
                    <button 
                    onClick={() => handleNavClick('EMPLOYEES')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'EMPLOYEES' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                    <Users size={20} /> Employees
                    </button>

                    <button 
                    onClick={() => handleNavClick('REPORTS')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'REPORTS' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                    <FileSpreadsheet size={20} /> Reports
                    </button>
                </div>
            )}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
            <button 
                onClick={() => handleNavClick('SETTINGS')}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeView === 'SETTINGS' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
                <Settings size={18} /> Settings
            </button>
            <button 
                onClick={logout}
                className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
                <LogOut size={18} /> Logout
            </button>
        </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-slate-900 text-white flex-col shadow-xl flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar & Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:hidden flex flex-col shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md flex-shrink-0 z-30">
            <div className="flex items-center gap-2">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 hover:bg-slate-800 rounded">
                    <Menu size={24} />
                </button>
                <span className="font-bold text-lg tracking-tight">Darshan<span className="text-brand-500">Inv</span></span>
            </div>
            <div className="text-xs bg-slate-800 px-2 py-1 rounded border border-slate-700">
                {isHO ? 'HO' : isStoreManager ? 'Store' : currentUser?.schoolId?.substring(0, 8)}
            </div>
        </div>

        {/* Top Header & Navigation (Desktop & Mobile) */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20 flex-shrink-0">
            <div className="px-4 py-4 md:px-8 md:py-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="w-full lg:w-auto">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800 truncate">
                            {activeView === 'SETTINGS' ? 'Account Settings' : isHO ? 'Head Office Console' : isStoreManager ? 'Central Store Manager' : `Branch: ${currentUser?.schoolId}`}
                        </h1>
                        {isHO && (activeView === 'DASH' || activeView === 'STOCK') && (
                            <div className="flex items-center gap-1 mt-2 bg-slate-100 p-1 rounded-lg inline-flex w-full md:w-auto overflow-x-auto no-scrollbar">
                                <button
                                    onClick={() => setHoViewMode('HOLISTIC')}
                                    className={`flex-1 md:flex-none px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${hoViewMode === 'HOLISTIC' ? 'bg-white text-brand-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Holistic View
                                </button>
                                <button
                                    onClick={() => setHoViewMode('SCHOOL')}
                                    className={`flex-1 md:flex-none px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${hoViewMode === 'SCHOOL' ? 'bg-white text-brand-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    School Level View
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {!isUser && !isStoreManager && activeView !== 'SETTINGS' && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                         {/* Branch Filter (HO Only - School Level) */}
                        {isHO && hoViewMode === 'SCHOOL' && (activeView === 'DASH' || activeView === 'STOCK') && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                                <span className="text-sm font-black text-black hidden sm:inline">Branch:</span>
                                <div className="relative w-full sm:w-auto">
                                    <Building className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                    <select 
                                        className="w-full sm:w-48 border-2 border-gray-300 rounded-md py-2 pl-9 pr-4 text-sm bg-white shadow-sm focus:border-brand-500 text-black font-semibold"
                                        value={hoFilterSchool}
                                        onChange={(e) => setHoFilterSchool(e.target.value)}
                                    >
                                        <option value="">-- Choose Branch --</option>
                                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Financial Year Selector */}
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 w-full sm:w-auto">
                            <Calendar size={16} className="text-slate-500 ml-2 flex-shrink-0" />
                            <select 
                                className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer w-full"
                                value={financialYear}
                                onChange={(e) => setFinancialYear(e.target.value)}
                            >
                                {FINANCIAL_YEARS.map(fy => (
                                    <option key={fy} value={fy}>FY {fy}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
            {/* HO STORE VIEWS */}
            {(isHO || isStoreManager) && activeView === 'HO_STORE_DASH' && (
                <HOStoreModule viewMode="DASH" />
            )}

            {(isHO || isStoreManager) && activeView === 'HO_STORE_ADD' && (
                <HOStoreModule viewMode="ADD" />
            )}

            {(isHO || isStoreManager) && activeView === 'HO_STORE_ISSUE' && (
                <HOStoreModule viewMode="ISSUE" />
            )}

            {/* EMPLOYEE CONSUMPTION VIEW */}
            {activeView === 'MY_CONSUMPTION' && isUser && (
                <EmployeeConsumptionModule />
            )}

            {/* ACCOUNTANT TRACK CONSUMPTION VIEW */}
            {activeView === 'TRACK_CONSUMPTION' && isAccountant && (
                <AccountantConsumptionManager />
            )}

            {/* ACCOUNTANT DAMAGE REPORT VIEW */}
            {activeView === 'DAMAGE_REPORT' && isAccountant && (
                <div className="max-w-6xl mx-auto space-y-8">
                    <AccountantAdjustmentForm />
                </div>
            )}

            {/* HO DAMAGE REQUEST ADMIN VIEW */}
            {activeView === 'DAMAGE_ADMIN' && isHO && (
                <div className="max-w-6xl mx-auto space-y-8">
                    <HOAdjustmentManager />
                </div>
            )}

            {/* SETTINGS VIEW (For All Users) */}
            {activeView === 'SETTINGS' && (
                 <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                        <Settings className="text-gray-600" size={28}/>
                        <div>
                            <h2 className="text-xl font-bold">Account Settings</h2>
                            <p className="text-sm text-gray-500">Manage your profile and security</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-sm font-bold text-blue-800 mb-1">User Profile</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500 block">Role</span>
                                    <span className="font-semibold text-gray-800">{currentUser.role}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Context</span>
                                    <span className="font-semibold text-gray-800">{currentUser.schoolId || 'Head Office'}</span>
                                </div>
                                {currentUser.employeeId && (
                                    <div>
                                        <span className="text-gray-500 block">Employee ID</span>
                                        <span className="font-semibold text-gray-800">{currentUser.employeeId}</span>
                                    </div>
                                )}
                                {currentUser.name && (
                                    <div>
                                        <span className="text-gray-500 block">Name</span>
                                        <span className="font-semibold text-gray-800">{currentUser.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleSelfPasswordChange} className="border-t pt-6">
                            <h3 className="text-lg font-bold mb-4">Change Password</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                                    <div className="relative mt-1">
                                        <Lock className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                        <input 
                                            type="text" 
                                            className="pl-10 block w-full rounded-md border-slate-600 bg-slate-800 text-white shadow-sm p-2 border placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                            placeholder="Enter new password"
                                            value={myNewPassword}
                                            onChange={(e) => setMyNewPassword(e.target.value)}
                                            required
                                            minLength={4}
                                        />
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 font-medium"
                                >
                                    Update My Password
                                </button>
                            </div>
                        </form>
                    </div>
                 </div>
            )}


            {/* HO: Empty State for School Level View */}
            {isHO && hoViewMode === 'SCHOOL' && !hoFilterSchool && (activeView === 'DASH' || activeView === 'STOCK') && (
                <div className="flex flex-col items-center justify-center h-64 md:h-96 bg-white rounded-xl border-2 border-dashed border-gray-300 text-gray-400 text-center p-6">
                    <Building size={48} className="mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-600">Please Select a Branch</h3>
                    <p>Choose a specific school branch from the dropdown above to view its data.</p>
                </div>
            )}

            {/* REQUEST VIEWS */}
            {activeView === 'REQUESTS' && isUser && (
                <div className="max-w-4xl mx-auto space-y-8">
                    <UserRequestForm />
                </div>
            )}

            {activeView === 'REQUESTS' && isAccountant && (
                <div className="max-w-5xl mx-auto space-y-8">
                    <AccountantRequestManager />
                </div>
            )}
            
            {/* REPORTS VIEW */}
            {activeView === 'REPORTS' && (!isHO || (isHO && (hoViewMode === 'HOLISTIC' || (hoViewMode === 'SCHOOL' && hoFilterSchool)))) && (
                <ReportsModule 
                    stockData={stockData} 
                    transactions={filteredTransactions}
                    financialYear={financialYear}
                    schoolName={isHO ? (hoViewMode === 'HOLISTIC' ? 'All_Branches' : hoFilterSchool) : currentUser?.schoolId || ''}
                    role={currentUser?.role || UserRole.USER}
                />
            )}

            {/* USER DASHBOARD VIEW */}
            {isUser && activeView === 'DASH' && (
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 mb-6">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 border-b pb-6 mb-6 text-center md:text-left">
                           <div className="h-16 w-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 text-2xl font-bold flex-shrink-0">
                               {currentUser.name?.charAt(0)}
                           </div>
                           <div>
                               <h2 className="text-xl md:text-2xl font-bold text-gray-800">Welcome, {currentUser.name}</h2>
                               <p className="text-gray-500 text-sm md:text-base">Employee ID: {currentUser.employeeId} • {currentUser.schoolId}</p>
                           </div>
                        </div>
                        
                        <h3 className="text-lg font-semibold mb-4 text-gray-700">Items Issued To Me</h3>
                        {myIssuedItems.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-400">
                                You have no items currently issued.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Item</th>
                                            <th className="px-6 py-3">Category</th>
                                            <th className="px-6 py-3 text-right">Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {myIssuedItems.map(item => (
                                            <tr key={item.id}>
                                                <td className="px-6 py-4 text-gray-900">{item.date}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{item.itemName}</td>
                                                <td className="px-6 py-4 text-gray-500">{item.category} / {item.subCategory}</td>
                                                <td className="px-6 py-4 text-right font-bold text-brand-600">{item.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* DASHBOARD VIEW */}
            {!isUser && !isStoreManager && activeView === 'DASH' && (!isHO || (isHO && (hoViewMode === 'HOLISTIC' || (hoViewMode === 'SCHOOL' && hoFilterSchool)))) && (
                <div className="space-y-6">
                    {/* Category-wise Status Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-700">
                            Status End of FY {financialYear}
                        </h3>
                        {/* Mini Aggregate Summary for Quick Reference */}
                        <div className="flex gap-4 text-sm w-full md:w-auto">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium border border-blue-100 w-full text-center md:w-auto">
                                Total Value: ₹{stockData.reduce((acc, curr) => acc + (curr.quantity * curr.avgValue), 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Object.keys(categoryStats).length === 0 ? (
                             <div className="col-span-full bg-white p-8 rounded-xl border border-dashed text-center text-gray-400">
                                No stock data available for this period.
                             </div>
                        ) : (
                            Object.entries(categoryStats).map(([catName, stats], idx) => {
                                // Explicit type casting for mapped stats
                                const typedStats = stats as { qty: number, value: number, count: number, subCats: Record<string, { qty: number, value: number, count: number }> };
                                
                                return (
                                <div key={catName} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-24 h-24 bg-brand-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
                                    <h4 className="font-bold text-gray-700 relative z-10">{catName}</h4>
                                    <div className="mt-4 relative z-10">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">Quantity</p>
                                                <p className="text-2xl font-bold text-gray-800">{typedStats.qty}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 uppercase font-semibold">Value</p>
                                                <p className="text-lg font-bold text-emerald-600">₹{typedStats.value.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">{typedStats.count} Items</span>
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => setViewCategoryDetails(catName)}
                                            className="text-xs font-semibold text-brand-600 flex items-center gap-1 hover:text-brand-800 transition-colors cursor-pointer"
                                        >
                                            View Breakdown <ChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>
                                );
                            })
                        )}
                    </div>

                    {/* Stat Cards - Row 2 Stock Flow */}
                    <h3 className="text-lg font-semibold text-gray-700 pt-2">
                        Activity during FY {financialYear}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-indigo-500 font-bold uppercase tracking-wider">Units Purchased</p>
                                <p className="text-3xl md:text-4xl font-extrabold text-indigo-700 mt-2">
                                    {totalPurchased}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">During selected FY</p>
                            </div>
                            <div className="h-12 w-12 md:h-16 md:w-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                <ArrowDownToLine size={24} className="md:w-8 md:h-8" />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-orange-500 font-bold uppercase tracking-wider">Units Issued</p>
                                <p className="text-3xl md:text-4xl font-extrabold text-orange-700 mt-2">
                                    {totalIssued}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">During selected FY</p>
                            </div>
                            <div className="h-12 w-12 md:h-16 md:w-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
                                <ArrowUpFromLine size={24} className="md:w-8 md:h-8" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                        {/* Bar Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 md:h-96 flex flex-col">
                            <h3 className="text-lg font-semibold mb-4">Stock Value by Category</h3>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                                        <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} cursor={{fill: '#f1f5f9'}} />
                                        <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pie Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 md:h-96 flex flex-col">
                            <h3 className="text-lg font-semibold mb-4">Value Distribution</h3>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-lg font-bold mb-4 text-blue-900">Stock List (Snapshot End of FY)</h3>
                        <InventoryTable data={stockData} showSchoolName={isHO && hoViewMode === 'HOLISTIC'} />
                    </div>
                </div>
            )}

            {activeView === 'STOCK' && (!isHO || (isHO && (hoViewMode === 'HOLISTIC' || (hoViewMode === 'SCHOOL' && hoFilterSchool)))) && (
                <div className="space-y-8">
                    {isHO ? (
                        <InventoryTable data={stockData} showSchoolName={hoViewMode === 'HOLISTIC'} />
                    ) : (
                        <>
                            <AddStockForm filterStartDate={fyStartDate} filterEndDate={fyEndDate} />
                            <div className="mt-8">
                                <h3 className="text-lg font-semibold mb-4">Current Inventory Snapshot</h3>
                                <InventoryTable data={stockData} showSchoolName={false} />
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeView === 'ISSUE' && isAccountant && (
                <div className="space-y-8">
                    <IssueStockForm filterStartDate={fyStartDate} filterEndDate={fyEndDate} />
                </div>
            )}

            {activeView === 'RETURN' && isAccountant && (
                <div className="space-y-8">
                    <ReturnStockManager />
                </div>
            )}

            {activeView === 'EMPLOYEES' && (isHO || isAccountant) && (
                <div className="space-y-8">
                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                           <Users className="text-brand-600"/> Add New Employee
                        </h2>
                        <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                {isHO ? (
                                    <select 
                                        className={inputClass}
                                        value={newEmpSchool}
                                        onChange={(e) => setNewEmpSchool(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Select --</option>
                                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                ) : (
                                    <input 
                                        type="text" 
                                        className={`${inputClass} bg-slate-700 cursor-not-allowed text-slate-400`}
                                        value={currentUser?.schoolId || ''}
                                        disabled
                                        title="Accountants can only add employees to their branch"
                                    />
                                )}
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                                <input 
                                    type="text" 
                                    className={inputClass}
                                    placeholder="e.g. 1045"
                                    value={newEmpId}
                                    onChange={(e) => setNewEmpId(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    className={inputClass}
                                    placeholder="e.g. Rahul Verma"
                                    value={newEmpName}
                                    onChange={(e) => setNewEmpName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="col-span-1">
                                <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-md hover:bg-brand-700 mt-1">
                                    Add Employee
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold mb-4">Employee Directory</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Branch ID</th>
                                        <th className="px-6 py-3">Employee ID</th>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {employees
                                        .filter(emp => isHO ? true : emp.schoolId === currentUser?.schoolId)
                                        .map(emp => (
                                        <tr key={`${emp.schoolId}-${emp.id}`} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-mono text-gray-500">{emp.schoolId}</td>
                                            <td className="px-6 py-4 font-bold text-gray-800">{emp.id}</td>
                                            <td className="px-6 py-4 text-gray-900">{emp.name}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {isAccountant && (
                                                        <button 
                                                            onClick={() => setResetEmpData({id: emp.id, name: emp.name, schoolId: emp.schoolId})}
                                                            className="text-amber-500 hover:text-amber-700 p-1"
                                                            title="Reset Password"
                                                        >
                                                            <KeyRound size={16} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            if(confirm(`Remove employee ${emp.name}?`)) removeEmployee(emp.id, emp.schoolId);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                        title="Remove Employee"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'ADMIN' && isHO && (
                <div className="max-w-2xl bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                        <KeyRound className="text-brand-600" size={28}/>
                        <div>
                            <h2 className="text-xl font-bold">Admin & Security</h2>
                            <p className="text-sm text-gray-500">Manage credentials and global settings</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 border-l-4 border-brand-500 pl-3">Reset Passwords</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Select Branch / Store</label>
                            <select 
                                className={inputClass}
                                value={adminSchoolId}
                                onChange={(e) => setAdminSchoolId(e.target.value)}
                            >
                                <option value="">-- Select --</option>
                                <option value={HO_STORE_ID}>** CENTRAL STORE MANAGER **</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Select Role</label>
                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center gap-2">
                                    <input 
                                        type="radio" 
                                        checked={true} 
                                        readOnly 
                                        className="text-brand-600"
                                    /> 
                                    {adminSchoolId === HO_STORE_ID ? 'Store Manager' : 'Accountant'}
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">New Password</label>
                            <input 
                                type="text" 
                                className={inputClass}
                                placeholder="Enter new password"
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                            />
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={handlePasswordChange}
                                className="w-full bg-brand-600 text-white py-2 rounded-lg hover:bg-brand-700 font-medium"
                            >
                                Update Password
                            </button>
                        </div>
                    </div>

                    {/* Category Management */}
                    <div className="mt-8 pt-8 border-t border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <Tags className="text-brand-600" size={24}/>
                            <div>
                                <h3 className="text-lg font-bold">Category Master</h3>
                                <p className="text-sm text-gray-500">Manage inventory categories available to all branches</p>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                            <form onSubmit={handleAddCategory} className="flex gap-4 items-end mb-6">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Category Name</label>
                                    <input 
                                        type="text" 
                                        className={inputClass}
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        placeholder="e.g. Electronics, Music Instruments"
                                        required
                                    />
                                </div>
                                <button type="submit" className="bg-brand-600 text-white px-6 py-2.5 rounded-lg hover:bg-brand-700 font-medium flex items-center gap-2">
                                    <Plus size={18} /> Add
                                </button>
                            </form>

                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <div key={cat} className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 group hover:border-brand-300 transition-colors">
                                        {editingCategory === cat ? (
                                            <div className="flex items-center gap-2">
                                                 <input 
                                                    type="text" 
                                                    className="border-b border-brand-500 outline-none text-brand-700 w-32 bg-transparent p-0 text-sm"
                                                    value={editCategoryName}
                                                    onChange={(e) => setEditCategoryName(e.target.value)}
                                                    autoFocus
                                                    onKeyDown={(e) => { if(e.key === 'Enter') saveCategoryName(); }}
                                                />
                                                <button onClick={saveCategoryName} className="text-green-600 hover:text-green-800 bg-green-50 p-0.5 rounded-full"><Check size={12}/></button>
                                                <button onClick={() => setEditingCategory(null)} className="text-red-500 hover:text-red-700 bg-red-50 p-0.5 rounded-full"><X size={12}/></button>
                                            </div>
                                        ) : (
                                            <>
                                                <span>{cat}</span>
                                                <button 
                                                    onClick={() => startEditingCategory(cat)}
                                                    className="text-gray-400 hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-110"
                                                    title="Edit Name"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      {/* Sub-category Breakdown Modal */}
      {viewCategoryDetails && categoryStats[viewCategoryDetails] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-100 text-brand-700 rounded-lg">
                            <Layers size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{viewCategoryDetails}</h3>
                            <p className="text-sm text-gray-500">Sub-category Breakdown</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setViewCategoryDetails(null)}
                        className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {Object.keys(categoryStats[viewCategoryDetails].subCats).length === 0 ? (
                        <div className="text-center text-gray-400 py-8">No specific sub-categories found.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {Object.entries(categoryStats[viewCategoryDetails].subCats).map(([subName, s]) => {
                                const subStats = s as { qty: number; value: number; count: number };
                                return (
                                <div key={subName} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all">
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-lg">{subName || 'General'}</h4>
                                        <span className="text-sm text-gray-500">{subStats.count} items</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-gray-800 text-lg">{subStats.qty} <span className="text-xs font-normal text-gray-500">units</span></div>
                                        <div className="font-bold text-emerald-600">₹{subStats.value.toLocaleString()}</div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                    
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl flex justify-between items-center border border-gray-200">
                        <span className="font-semibold text-gray-600">Total {viewCategoryDetails}</span>
                        <div className="text-right">
                            <span className="block text-xl font-bold text-gray-900">{categoryStats[viewCategoryDetails].qty} Units</span>
                            <span className="block text-sm font-bold text-emerald-600">₹{categoryStats[viewCategoryDetails].value.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Employee Password Reset Modal */}
      {resetEmpData && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                 <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                            <KeyRound size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Reset User Password</h3>
                            <p className="text-xs text-gray-500">{resetEmpData.name} ({resetEmpData.id})</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => { setResetEmpData(null); setNewEmpPassword(''); }}
                        className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Set a new password for this employee. They will use their Employee ID and this new password to login.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                            <input 
                                type="text" 
                                className="pl-10 w-full rounded-md border-slate-600 bg-slate-800 text-white shadow-sm p-2 border placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                placeholder="Enter new password"
                                value={newEmpPassword}
                                onChange={(e) => setNewEmpPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="mt-6">
                        <button 
                            onClick={handleEmployeePasswordReset}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg transition-colors shadow-sm"
                            disabled={!newEmpPassword}
                        >
                            Update Password
                        </button>
                    </div>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};