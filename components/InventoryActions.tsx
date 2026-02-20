import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { Transaction, TransactionType, UserRole } from '../types';
import { PlusCircle, ArrowUpRight, Save, History, FileText, Search, RotateCcw, X, UploadCloud, AlertCircle, Filter, RefreshCcw, AlertTriangle } from 'lucide-react';

interface ActionProps {
    filterStartDate?: string;
    filterEndDate?: string;
}

const inputClass = "mt-1 block w-full rounded-md border-slate-600 bg-slate-800 text-white shadow-sm p-2 border placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

const UNIT_OPTIONS = ['Pcs', 'Kg', 'Ltr', 'Mtr', 'Box', 'Set', 'Pkt', 'Doz'];

export const AddStockForm: React.FC<ActionProps> = ({ filterStartDate, filterEndDate }) => {
  const { addTransaction, currentUser, transactions, categories } = useAppStore();
  
  // Using strings for numeric inputs to avoid leading zero issues and handle empty state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: categories[0] || '',
    subCategory: '',
    itemName: '',
    quantity: '', 
    unit: 'Pcs',
    unitPrice: '',
    type: TransactionType.PURCHASE,
    billNumber: '',
    billAttachment: ''
  });

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);

  // Update default category if categories load later
  useEffect(() => {
    if (!formData.category && categories.length > 0) {
        setFormData(prev => ({...prev, category: categories[0]}));
    }
  }, [categories, formData.category]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("File size should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, billAttachment: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.schoolId) return;

    if (formData.type === TransactionType.PURCHASE && !formData.billNumber) {
        alert("Bill Number is mandatory for New Purchases");
        return;
    }

    if (!formData.quantity || Number(formData.quantity) <= 0) {
        alert("Please enter a valid quantity");
        return;
    }

    setPendingFormData({
      date: formData.date,
      schoolId: currentUser.schoolId,
      type: formData.type,
      category: formData.category,
      subCategory: formData.subCategory,
      itemName: formData.itemName,
      quantity: Number(formData.quantity),
      unit: formData.unit,
      unitPrice: Number(formData.unitPrice || 0),
      totalValue: Number(formData.quantity) * Number(formData.unitPrice || 0),
      billNumber: formData.type === TransactionType.PURCHASE ? formData.billNumber : undefined,
      billAttachment: formData.type === TransactionType.PURCHASE ? formData.billAttachment : undefined
    });
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
      if (pendingFormData) {
          addTransaction(pendingFormData);
          alert("Stock Added Successfully!");
          setFormData({ 
              ...formData, 
              itemName: '', 
              quantity: '', 
              unitPrice: '', 
              subCategory: '', 
              billNumber: '',
              billAttachment: ''
          });
          setShowConfirmation(false);
          setPendingFormData(null);
      }
  };

  const handleCancelConfirmation = () => {
      setShowConfirmation(false);
      setPendingFormData(null);
  };

  const recentHistory = transactions
    .filter(t => {
        if (t.schoolId !== currentUser?.schoolId) return false;
        if (t.type !== TransactionType.PURCHASE && t.type !== TransactionType.OPENING_STOCK) return false;
        
        if (filterStartDate && t.date < filterStartDate) return false;
        if (filterEndDate && t.date > filterEndDate) return false;
        
        return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6 text-brand-700">
          <PlusCircle size={24} />
          <h2 className="text-xl font-bold">Add / Opening Stock</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Transaction Type</label>
              <select 
                className={inputClass}
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as TransactionType})}
              >
                <option value={TransactionType.PURCHASE}>New Purchase (Bill)</option>
                <option value={TransactionType.OPENING_STOCK}>Opening Stock</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input 
                type="date" 
                className={inputClass}
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
          </div>

          {/* Conditional Fields for New Purchase */}
          {formData.type === TransactionType.PURCHASE && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Bill Number <span className="text-red-500">*</span></label>
                      <input 
                          type="text" 
                          placeholder="Invoice No."
                          className={inputClass}
                          value={formData.billNumber}
                          onChange={(e) => setFormData({...formData, billNumber: e.target.value})}
                          required
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Upload Bill <span className="text-xs text-gray-400">(Optional)</span></label>
                      <div className="relative">
                          <input 
                              type="file" 
                              className="hidden"
                              id="bill-upload"
                              accept="image/*,.pdf"
                              onChange={handleFileChange}
                              key={formData.billAttachment ? 'loaded' : 'empty'}
                          />
                          <label 
                              htmlFor="bill-upload"
                              className={`${inputClass} cursor-pointer flex items-center gap-2 truncate text-sm`}
                          >
                              <UploadCloud size={16} />
                              {formData.billAttachment ? 'File Selected' : 'Choose File...'}
                          </label>
                      </div>
                  </div>
              </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select 
                className={inputClass}
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sub Category (Manual)</label>
              <input 
                type="text" 
                placeholder="e.g. Paints, Brushes, Chemicals"
                className={inputClass}
                value={formData.subCategory}
                onChange={(e) => setFormData({...formData, subCategory: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Item Name</label>
            <input 
              type="text" 
              placeholder="e.g. A4 Paper Rim, Bunsen Burner"
              className={inputClass}
              value={formData.itemName}
              onChange={(e) => setFormData({...formData, itemName: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <label className="block text-sm font-medium text-gray-700">Quantity</label>
              <input 
                type="number" 
                step="any"
                min="0.0001"
                placeholder="0.00"
                className={inputClass}
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                required
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <select 
                className={inputClass}
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              >
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700">Unit Cost (₹)</label>
              <input 
                type="number" 
                step="any"
                min="0"
                placeholder="0.00"
                className={inputClass}
                value={formData.unitPrice}
                onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2">
              <Save size={18} /> Save to Inventory
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && pendingFormData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-brand-600 px-6 py-4 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <AlertTriangle size={20} className="text-yellow-300" /> Confirm Stock Entry
                      </h3>
                      <button onClick={handleCancelConfirmation} className="text-white/80 hover:text-white transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm">Please review the details before adding to inventory.</p>
                      
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100 text-sm">
                          <div className="flex justify-between">
                              <span className="text-gray-500">Date:</span>
                              <span className="font-medium text-gray-900">{pendingFormData.date}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500">Type:</span>
                              <span className="font-medium text-gray-900">{pendingFormData.type}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500">Item:</span>
                              <span className="font-medium text-gray-900 text-right">{pendingFormData.itemName}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500">Category:</span>
                              <span className="font-medium text-gray-900">{pendingFormData.category} • {pendingFormData.subCategory}</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                              <span className="text-gray-500">Quantity:</span>
                              <span className="font-bold text-green-600 text-lg">+{pendingFormData.quantity} {pendingFormData.unit}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500">Unit Cost:</span>
                              <span className="font-medium text-gray-900">₹{pendingFormData.unitPrice}</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-900 pt-1">
                              <span>Total Value:</span>
                              <span>₹{pendingFormData.totalValue.toLocaleString()}</span>
                          </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                              onClick={handleCancelConfirmation}
                              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                          >
                              Edit
                          </button>
                          <button 
                              onClick={handleConfirm}
                              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold shadow-lg shadow-brand-200 transition-all transform active:scale-95"
                          >
                              Confirm & Add
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-6 text-gray-700 border-b pb-4">
          <History size={24} />
          <h2 className="text-xl font-bold">Additions in Selected FY</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {recentHistory.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No history for this period</td></tr>
              ) : (
                recentHistory.map(t => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{t.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {t.itemName} 
                      <span className="text-xs text-gray-400 block mt-0.5">
                        {t.category} {t.subCategory && `• ${t.subCategory}`}
                      </span>
                      {t.billNumber && <span className="text-[10px] text-indigo-600 font-mono block mt-0.5">Inv: {t.billNumber}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">+{t.quantity} <span className="text-[10px] text-gray-500">{t.unit}</span></td>
                    <td className="px-4 py-3 text-right">₹{t.unitPrice}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const IssueStockForm: React.FC<ActionProps> = ({ filterStartDate, filterEndDate }) => {
  const { addTransaction, getComputedStock, currentUser, transactions, employees } = useAppStore();
  const currentStock = getComputedStock(currentUser?.schoolId || '');
  
  // State for Employee Search
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{id: string, name: string} | null>(null);

  // Using string for quantity to allow decimals and empty initial state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    subCategory: '',
    itemName: '',
    quantity: '', 
    unit: '', // Auto-fetched from stock item
  });

  // Derived state for cascading dropdowns
  const availableCategories = useMemo(() => {
    return Array.from(new Set(currentStock.map(item => item.category))).sort();
  }, [currentStock]);

  const availableItems = useMemo(() => {
    if (!formData.category) return [];
    // Filter by Category only
    return currentStock
        .filter(item => item.category === formData.category)
        .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [currentStock, formData.category]);


  // Filter employees based on search, including the Universal Employee
  const filteredEmployees = useMemo(() => {
      // Current school employees
      const schoolEmps = employees.filter(e => e.schoolId === currentUser?.schoolId);
      
      // Universal Employee (ID: 000000) - Always available
      const universalEmp = { 
          id: '000000', 
          name: 'Shubham (Universal)', 
          schoolId: currentUser?.schoolId || '' 
      };
      
      // Combine and filter
      return [universalEmp, ...schoolEmps]
        .filter(e => 
          e.id.toLowerCase().includes(employeeSearch.toLowerCase()) || 
          e.name.toLowerCase().includes(employeeSearch.toLowerCase())
        )
        .slice(0, 8); // Limit suggestions
  }, [employees, currentUser?.schoolId, employeeSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.schoolId) return;

    if (!formData.category || !formData.itemName) {
        alert("Please select an item");
        return;
    }

    if (!selectedEmployee) {
        alert("Please select a valid employee from the list");
        return;
    }

    const qty = Number(formData.quantity);
    if (!qty || qty <= 0) {
        alert("Invalid Quantity");
        return;
    }

    const currentItem = currentStock.find(s => 
        s.category === formData.category && 
        s.subCategory === formData.subCategory && 
        s.itemName === formData.itemName
    );

    if (!currentItem || currentItem.quantity < qty) {
        alert("Insufficient stock available!");
        return;
    }

    addTransaction({
      date: formData.date,
      schoolId: currentUser.schoolId,
      type: TransactionType.ISSUE,
      category: formData.category,
      subCategory: formData.subCategory,
      itemName: formData.itemName,
      quantity: qty,
      unit: currentItem.unit || 'Pcs',
      issuedTo: `${selectedEmployee.id} (${selectedEmployee.name})`,
      issuedToId: selectedEmployee.id
    });

    alert("Stock Issued Successfully!");
    setFormData({ ...formData, quantity: '', itemName: '', subCategory: '', unit: '' }); 
    // Reset employee selection
    setSelectedEmployee(null);
    setEmployeeSearch('');
  };

  const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (!val) {
          setFormData({...formData, itemName: '', subCategory: '', unit: ''});
      } else {
          const [sub, name, unit] = val.split('|||');
          setFormData({...formData, subCategory: sub, itemName: name, unit: unit || 'Pcs'});
      }
  };

  const issueHistory = transactions
    .filter(t => {
        if (t.schoolId !== currentUser?.schoolId) return false;
        if (t.type !== TransactionType.ISSUE) return false;

        if (filterStartDate && t.date < filterStartDate) return false;
        if (filterEndDate && t.date > filterEndDate) return false;

        return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6 text-amber-600">
          <ArrowUpRight size={24} />
          <h2 className="text-xl font-bold">Issue Stock</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
             <label className="block text-sm font-medium text-gray-700">Date of Issue</label>
             <input 
                type="date" 
                className={inputClass}
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select 
                      className={inputClass}
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value, subCategory: '', itemName: ''})}
                      required
                  >
                      <option value="">-- Select Category --</option>
                      {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700">Select Item</label>
                  <select 
                      className={inputClass}
                      value={formData.itemName ? `${formData.subCategory}|||${formData.itemName}|||${formData.unit}` : ''}
                      onChange={handleItemChange}
                      disabled={!formData.category}
                      required
                  >
                      <option value="">-- Select Item --</option>
                      {availableItems.map((item, idx) => (
                          <option key={idx} value={`${item.subCategory}|||${item.itemName}|||${item.unit}`}>
                              {item.itemName} ({item.subCategory}) [Avail: {item.quantity} {item.unit}]
                          </option>
                      ))}
                  </select>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity to Issue {formData.unit ? `(${formData.unit})` : ''}</label>
                  <input 
                      type="number" 
                      step="any"
                      min="0.0001"
                      placeholder="0.00"
                      className={inputClass}
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      required
                  />
              </div>
              <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">Issued To (Employee Search)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        className="mt-1 block w-full rounded-md border-slate-600 bg-slate-800 text-white shadow-sm pl-10 p-2 border placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                        value={employeeSearch}
                        onChange={(e) => {
                            setEmployeeSearch(e.target.value);
                            setShowEmpDropdown(true);
                            if (selectedEmployee) setSelectedEmployee(null); // Reset selection on type
                        }}
                        onFocus={() => setShowEmpDropdown(true)}
                        placeholder="Type ID or Name (e.g. 367 or Shubham)"
                        required={!selectedEmployee}
                    />
                  </div>
                  
                  {/* Dropdown Suggestions */}
                  {showEmpDropdown && employeeSearch && !selectedEmployee && (
                      <div className="absolute z-10 w-full bg-slate-800 border border-slate-600 rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
                          {filteredEmployees.length === 0 ? (
                              <div className="p-3 text-sm text-slate-400">No employees found</div>
                          ) : (
                              filteredEmployees.map(emp => (
                                  <div 
                                      key={emp.id}
                                      className="px-4 py-2 hover:bg-slate-700 cursor-pointer text-sm text-white flex justify-between border-b border-slate-700 last:border-0"
                                      onClick={() => {
                                          setSelectedEmployee(emp);
                                          setEmployeeSearch(`${emp.id} (${emp.name})`);
                                          setShowEmpDropdown(false);
                                      }}
                                  >
                                      <span className="font-bold text-brand-400">{emp.id}</span>
                                      <span>{emp.name}</span>
                                  </div>
                              ))
                          )}
                      </div>
                  )}
              </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button type="submit" className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2">
              <ArrowUpRight size={18} /> Issue Item
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6 text-gray-700 border-b pb-4">
          <FileText size={24} />
          <h2 className="text-xl font-bold">Issues in Selected FY</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Issued To</th>
                <th className="px-6 py-3">Item Details</th>
                <th className="px-6 py-3 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {issueHistory.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No items issued in this period</td></tr>
              ) : (
                issueHistory.map(t => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{t.date}</td>
                    <td className="px-6 py-4 font-bold text-gray-800">{t.issuedTo}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{t.itemName}</div>
                      <div className="text-xs text-gray-400">{t.category} • {t.subCategory}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-amber-600">
                      -{t.quantity} <span className="text-[10px] text-gray-500">{t.unit}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const ReturnStockManager: React.FC = () => {
    const { transactions, currentUser, addTransaction, returnRequests, consumptionLogs, refreshData } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [returnModalIssue, setReturnModalIssue] = useState<Transaction | null>(null);
    const [returnQty, setReturnQty] = useState('');
    const [showRequestedOnly, setShowRequestedOnly] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Refresh Data on Mount to ensure we have latest consumption logs
    useEffect(() => {
        const load = async () => {
            setIsRefreshing(true);
            await refreshData();
            setIsRefreshing(false);
        };
        load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const issues = transactions
        .filter(t => t.schoolId === currentUser?.schoolId && t.type === TransactionType.ISSUE)
        .sort((a, b) => b.createdAt - a.createdAt);

    const returns = transactions.filter(t => t.schoolId === currentUser?.schoolId && t.type === TransactionType.RETURN);

    // Filter by search and requested status
    const filteredIssues = issues.filter(t => {
        const matchesSearch = t.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            t.issuedTo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.category.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (showRequestedOnly) {
            const hasPendingRequest = returnRequests.some(r => r.issueTransactionId === t.id && r.status === 'PENDING');
            return matchesSearch && hasPendingRequest;
        }
        return matchesSearch;
    });

    const getReturnedQty = (issueId: string) => {
        return returns
            .filter(r => r.issuedToId === issueId)
            .reduce((sum, r) => sum + r.quantity, 0);
    };

    const getConsumedQty = (issueId: string) => {
        return consumptionLogs
            .filter(c => c.issueTransactionId === issueId)
            .reduce((sum, c) => sum + c.quantityConsumed, 0);
    };

    const handleReturnClick = (issue: Transaction) => {
        setReturnModalIssue(issue);
        // Calculate max returnable based on actual In Hand quantity
        const returned = getReturnedQty(issue.id);
        const consumed = getConsumedQty(issue.id);
        const inHand = issue.quantity - returned - consumed;

        // Pre-fill quantity if request exists
        const req = returnRequests.find(r => r.issueTransactionId === issue.id && r.status === 'PENDING');
        if (req) {
            // If requested qty > inHand, cap it at inHand
            setReturnQty(String(Math.min(req.quantity, inHand)));
        } else {
            setReturnQty('');
        }
    };

    const confirmReturn = () => {
        if (!returnModalIssue) return;
        const alreadyReturned = getReturnedQty(returnModalIssue.id);
        const consumed = getConsumedQty(returnModalIssue.id);
        const inHand = returnModalIssue.quantity - alreadyReturned - consumed;
        
        const qty = Number(returnQty);
        if (!qty || qty <= 0) {
            alert("Please enter a valid quantity");
            return;
        }

        if (qty > inHand) {
            alert(`Cannot return more than In Hand quantity (${inHand}).\nIssued: ${returnModalIssue.quantity}\nReturned: ${alreadyReturned}\nConsumed: ${consumed}`);
            return;
        }

        addTransaction({
            date: new Date().toISOString().split('T')[0],
            schoolId: returnModalIssue.schoolId,
            type: TransactionType.RETURN,
            category: returnModalIssue.category,
            subCategory: returnModalIssue.subCategory,
            itemName: returnModalIssue.itemName,
            quantity: qty,
            unit: returnModalIssue.unit || 'Pcs',
            issuedTo: `Returned by ${returnModalIssue.issuedTo?.split('(')[0] || 'Unknown'}`,
            issuedToId: returnModalIssue.id
        });

        alert("Stock Returned Successfully");
        setReturnModalIssue(null);
        setReturnQty('');
    };

    // Helper variables for Modal logic
    const modalInHand = returnModalIssue ? (returnModalIssue.quantity - getReturnedQty(returnModalIssue.id) - getConsumedQty(returnModalIssue.id)) : 0;
    const modalPendingRequest = returnModalIssue ? returnRequests.find(r => r.issueTransactionId === returnModalIssue.id && r.status === 'PENDING') : null;
    const modalIsRequestExceeding = modalPendingRequest && modalPendingRequest.quantity > modalInHand;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        <RotateCcw className="text-indigo-600" /> Return Issued Items
                    </h2>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleManualRefresh}
                            className={`p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                            title="Refresh Data"
                        >
                            <RefreshCcw size={18} />
                        </button>
                        <button 
                            onClick={() => setShowRequestedOnly(!showRequestedOnly)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-all ${
                                showRequestedOnly 
                                ? 'bg-orange-100 border-orange-200 text-orange-700' 
                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Filter size={16} /> {showRequestedOnly ? 'Showing Requests' : 'Filter Requests'}
                        </button>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                className="pl-10 w-full rounded-md border border-slate-300 p-2 text-sm bg-white text-gray-900 placeholder-gray-400"
                                placeholder="Search item or employee..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Issued To</th>
                                <th className="px-6 py-3">Item</th>
                                <th className="px-6 py-3 text-center">Issued</th>
                                <th className="px-6 py-3 text-center">Consumed</th>
                                <th className="px-6 py-3 text-center">In Hand</th>
                                <th className="px-6 py-3 text-center">Returned</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredIssues.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No matching issues found.</td></tr>
                            ) : (
                                filteredIssues.map(issue => {
                                    const returned = getReturnedQty(issue.id);
                                    const consumed = getConsumedQty(issue.id);
                                    const inHand = issue.quantity - returned - consumed;
                                    const isFullyReturnedOrConsumed = inHand <= 0;
                                    
                                    const pendingRequest = returnRequests.find(r => r.issueTransactionId === issue.id && r.status === 'PENDING');

                                    return (
                                        <tr key={issue.id} className={`hover:bg-gray-50 ${pendingRequest ? 'bg-orange-50/50' : ''}`}>
                                            <td className="px-6 py-4 text-gray-900">{issue.date}</td>
                                            <td className="px-6 py-4 font-medium text-gray-800">{issue.issuedTo}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{issue.itemName}</div>
                                                <div className="text-xs text-gray-400">{issue.category}</div>
                                                {pendingRequest && (
                                                    <div className="text-xs text-orange-600 font-bold flex items-center gap-1 mt-1">
                                                        <AlertCircle size={12} /> Requested: {pendingRequest.quantity}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-900">{issue.quantity}</td>
                                            <td className="px-6 py-4 text-center text-gray-500">{consumed}</td>
                                            <td className="px-6 py-4 text-center font-bold text-brand-600">{inHand} <span className="text-[10px] text-gray-400 font-normal">{issue.unit}</span></td>
                                            <td className="px-6 py-4 text-center text-indigo-600 font-semibold">{returned > 0 ? returned : '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                {!isFullyReturnedOrConsumed ? (
                                                    <button 
                                                        onClick={() => handleReturnClick(issue)}
                                                        className={`text-xs px-3 py-1 rounded-full font-medium border transition-colors ${
                                                            pendingRequest 
                                                            ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700 animate-pulse' 
                                                            : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                                                        }`}
                                                    >
                                                        {pendingRequest ? 'Accept Return' : 'Return'}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded">Closed</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Return Modal */}
            {returnModalIssue && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50 rounded-t-xl">
                            <h3 className="font-bold text-indigo-900">Return Item</h3>
                            <button onClick={() => setReturnModalIssue(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4 text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p><strong>Item:</strong> {returnModalIssue.itemName}</p>
                                <p><strong>Issued To:</strong> {returnModalIssue.issuedTo}</p>
                                <div className="border-t border-gray-200 my-2 pt-2 grid grid-cols-2 gap-2 text-xs">
                                    <span>Total Issued: <span className="font-bold">{returnModalIssue.quantity}</span></span>
                                    <span>Already Returned: <span className="font-bold">{getReturnedQty(returnModalIssue.id)}</span></span>
                                    <span>Consumed: <span className="font-bold text-orange-600">{getConsumedQty(returnModalIssue.id)}</span></span>
                                </div>
                                
                                {modalIsRequestExceeding && (
                                     <div className="bg-red-50 border border-red-200 p-2 rounded text-xs text-red-700 font-medium mt-2 flex items-start gap-2">
                                        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5"/>
                                        <div>
                                            Requested: {modalPendingRequest?.quantity}, but only {modalInHand} available in hand.
                                            <br/><span className="font-bold">Return capped at {modalInHand}.</span>
                                        </div>
                                     </div>
                                )}

                                <p className="text-center font-bold text-lg text-brand-700 pt-1 mt-2">
                                    In Hand (Max Return): {modalInHand} {returnModalIssue.unit}
                                </p>
                            </div>
                            
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Return</label>
                            <input 
                                type="number" 
                                step="any"
                                min="0.0001" 
                                max={modalInHand}
                                className={inputClass}
                                value={returnQty}
                                onChange={(e) => setReturnQty(e.target.value)}
                            />

                            <div className="mt-6 flex justify-end gap-3">
                                <button 
                                    onClick={() => setReturnModalIssue(null)}
                                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmReturn}
                                    className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 text-sm font-medium"
                                >
                                    Confirm Return
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}