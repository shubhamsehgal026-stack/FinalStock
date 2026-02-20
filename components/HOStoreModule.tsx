import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { HO_STORE_CATEGORIES, HO_STORE_ID, SCHOOLS } from '../constants';
import { TransactionType, Transaction } from '../types';
import { PlusCircle, Save, History, ArrowUpRight, Package, Store, LayoutDashboard, ChevronLeft, ChevronRight, Layers, FileSpreadsheet, Download, Pencil, Trash2, X, Check, AlertTriangle, Search, Filter, RefreshCcw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';

const inputClass = "mt-1 block w-full rounded-md border-slate-600 bg-slate-800 text-white shadow-sm p-2 border placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

// Configuration for Books Tiers, Classes, and Pre-defined Titles
const TIER_CONFIG: Record<string, { label: string; classes: string[]; books: Record<string, string[]> }> = {
    '2_TIER': {
        label: '2 TIER - DA DELHI',
        classes: ['Nursery', 'KG'],
        books: {
            'Nursery': [
                'Activity Workbook',
                'Multi Sensory NURSERY- 1 /PRACTICE WITH FUN',
                'Multi Sensory NURSERY- 1A',
                'Multi Sensory NURSERY- 1B',
                'Multi Sensory NURSERY- 1C',
                'My Math Book - Nursery',
                'My Math Book - Practice with fun - Nursery',
                'My Rhymes & Stories Book - Nur'
            ],
            'KG': [
                'Activity Workbook',
                'Multi Sensory KG - 2A',
                'Multi Sensory KG - 2B',
                'Multi Sensory KG- 2 PRACTICE WITH FUN',
                'My Hindi Book - KG - PART 1',
                'My Hindi Book - KG - PART 2',
                'My Hindi Book - Practice with fun - KG',
                'My Math Book - KG - PART 1',
                'My Math Book - KG - PART 2',
                'My Math Book - Practice with fun - KG',
                'My Rhymes & Stories Book - KG'
            ]
        }
    },
    '3_TIER': {
        label: '3 TIER - OTHER ACADEMIES',
        classes: ['Nursery', 'LKG', 'UKG'],
        books: {
            'Nursery': [
                'My Activity Book - Level - 0',
                'Multi Sensory NURSERY- LEVEL -1 /PRACTICE WITH FUN',
                'Multi Sensory NURSERY LEVEL - 1A',
                'Multi Sensory NURSERY LEVEL - 1B',
                'My Math Book - LEVEL - 1 Nursery',
                'My Math Book - Practice with fun - LEVEL - 1',
                'My Rhymes & Stories Book - Level - 1 Nursery'
            ],
            'LKG': [
                'My Activity Workbook - LKG',
                'Multi Sensory - PRACTICE WITH FUN - 2 LKG',
                'Multisensory English - 2A LKG',
                'Multisensory English - 2B LKG',
                'Multisensory English - 2C LKG',
                'My Number Book - 2 - LKG',
                'My Number Book - PRACTICE WITH FUN - 2 LKG',
                'My Rhymes & Stories Book - 2 - LKG'
            ],
            'UKG': [
                'My Activity Workbook - UKG',
                'Multisensory English- 3A UKG',
                'Multisensory English- 3B UKG',
                'Multisensory English - PRACTICE WITH FUN - 3 UKG',
                'My Hindi Book - 3A UKG',
                'My Hindi Book - PRACTICE WITH FUN - 3 UKG',
                'My Number Book - 3A - UKG',
                'My Number Book - 3B - UKG',
                'My Number Book - PRACTICE WITH FUN - 3 UKG',
                'My Rhymes & Stories Book - 3 UKG'
            ]
        }
    },
    'GRADES': {
        label: 'GRADES NURSERY - 12TH',
        classes: [
            'Level 0', 'Level 1', 'Level 2', 
            'Class I', 'Class II', 'Class III', 'Class IV', 'Class V', 
            'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X', 'Class XI', 'Class XII'
        ],
        books: {
            'Level 0': ['Spiritual Curriculum'],
            'Level 1': ['Spiritual Curriculum'],
            'Level 2': ['Spiritual Curriculum'],
            'Class I': ['Spiritual Curriculum - PART 1', 'Spiritual Curriculum - PART 2'],
            'Class II': ['Spiritual Curriculum - PART 1', 'Spiritual Curriculum - PART 2'],
            'Class III': ['Spiritual Curriculum - PART 1', 'Spiritual Curriculum - PART 2'],
            'Class IV': ['Spiritual Curriculum - PART 1', 'Spiritual Curriculum - PART 2'],
            'Class V': ['Spiritual Curriculum - PART 1', 'Spiritual Curriculum - PART 2'],
            'Class VI': ['Spiritual Curriculum'],
            'Class VII': ['Spiritual Curriculum'],
            'Class VIII': ['Spiritual Curriculum'],
            'Class IX': ['Spiritual Curriculum'],
            'Class X': ['Spiritual Curriculum'],
            'Class XI': ['Spiritual Curriculum'],
            'Class XII': ['Spiritual Curriculum']
        }
    }
};

const BOOK_TIERS = Object.keys(TIER_CONFIG).map(key => ({ id: key, label: TIER_CONFIG[key].label }));

// Helper to get current academic year (e.g. 2024-2025)
const getCurrentSession = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth(); // 0-11, April is 3
    const start = m >= 3 ? y : y - 1;
    return `${start}-${start + 1}`;
};

interface HOStoreProps {
    viewMode: 'ADD' | 'ISSUE' | 'DASH' | 'REPORTS';
}

export const HOStoreModule: React.FC<HOStoreProps> = ({ viewMode }) => {
    const { addTransaction, updateTransaction, deleteTransaction, getComputedStock, transactions } = useAppStore();
    
    // Edit State
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // Get Current Stock for HO Store
    const hoStock = getComputedStock(HO_STORE_ID);

    // Calculate Summary
    const totalItems = hoStock.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalValue = hoStock.reduce((acc, curr) => acc + (curr.quantity * curr.avgValue), 0);
    
    // Chart Data
    const categoryData = HO_STORE_CATEGORIES.map(cat => ({
        name: cat,
        value: hoStock.filter(s => s.category === cat).reduce((acc, curr) => acc + (curr.quantity * curr.avgValue), 0)
    }));

    // Filter transactions for history
    const history = transactions
        .filter(t => t.schoolId === HO_STORE_ID)
        .filter(t => viewMode === 'ADD' ? (t.type === TransactionType.PURCHASE || t.type === TransactionType.OPENING_STOCK) : viewMode === 'ISSUE' ? t.type === TransactionType.ISSUE : true)
        .sort((a, b) => b.createdAt - a.createdAt);

    // Inventory Filters
    const [invSearch, setInvSearch] = useState('');
    const [invCategory, setInvCategory] = useState('');

    // Transaction Manager Filters
    const [txSearch, setTxSearch] = useState('');
    const [txCategory, setTxCategory] = useState('');
    const [txSubCategory, setTxSubCategory] = useState('');
    const [txItemName, setTxItemName] = useState('');
    const [txBillNumber, setTxBillNumber] = useState('');
    const [txType, setTxType] = useState<string>('');
    const [txStartDate, setTxStartDate] = useState('');
    const [txEndDate, setTxEndDate] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Filtered Inventory
    const filteredInventory = useMemo(() => {
        return hoStock.filter(item => {
            const matchesSearch = item.itemName.toLowerCase().includes(invSearch.toLowerCase()) || 
                                  item.subCategory.toLowerCase().includes(invSearch.toLowerCase());
            const matchesCategory = invCategory ? item.category === invCategory : true;
            return matchesSearch && matchesCategory;
        });
    }, [hoStock, invSearch, invCategory]);

    // Filtered Transactions for Manager
    const filteredTransactions = useMemo(() => {
        return transactions
            .filter(t => t.schoolId === HO_STORE_ID)
            .filter(t => {
                const matchesSearch = t.itemName.toLowerCase().includes(txSearch.toLowerCase()) || 
                                      (t.issuedTo && t.issuedTo.toLowerCase().includes(txSearch.toLowerCase()));
                const matchesCategory = txCategory ? t.category === txCategory : true;
                const matchesSubCategory = txSubCategory ? t.subCategory.toLowerCase().includes(txSubCategory.toLowerCase()) : true;
                const matchesItemName = txItemName ? t.itemName.toLowerCase().includes(txItemName.toLowerCase()) : true;
                const matchesBillNumber = txBillNumber ? (t.billNumber && t.billNumber.toLowerCase().includes(txBillNumber.toLowerCase())) : true;
                const matchesType = txType ? t.type === txType : true;
                const matchesStart = txStartDate ? t.date >= txStartDate : true;
                const matchesEnd = txEndDate ? t.date <= txEndDate : true;
                return matchesSearch && matchesCategory && matchesSubCategory && matchesItemName && matchesBillNumber && matchesType && matchesStart && matchesEnd;
            })
            .sort((a, b) => b.createdAt - a.createdAt);
    }, [transactions, txSearch, txCategory, txSubCategory, txItemName, txBillNumber, txType, txStartDate, txEndDate]);

    const handleEditTransaction = (t: Transaction) => {
        setEditingTransaction(t);
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setEditingTransaction(null);
        setIsEditModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this transaction? This will affect stock levels.")) {
            await deleteTransaction(id);
        }
    };

    const handleEdit = (t: Transaction) => {
        // Legacy handler, redirect to new one
        handleEditTransaction(t);
    };

    const cancelEdit = () => {
        setEditingTransaction(null);
        setIsEditModalOpen(false);
    };

    const downloadExcel = (data: any[], filename: string) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        XLSX.writeFile(workbook, filename);
    };

    const handleDownloadInventory = () => {
        const reportData = hoStock.map(item => ({
            Category: item.category,
            SubCategory: item.subCategory,
            ItemName: item.itemName,
            QuantityAvailable: item.quantity,
            AverageValue: item.avgValue.toFixed(2),
            TotalAssetValue: (item.quantity * item.avgValue).toFixed(2),
            TotalPurchasedInFY: item.totalPurchased,
            TotalIssuedInFY: item.totalIssued
        }));
        
        const timestamp = new Date().toISOString().split('T')[0];
        downloadExcel(reportData, `HO_Store_Inventory_${timestamp}.xlsx`);
    };

    const handleDownloadTransactions = () => {
        const allHoTransactions = transactions
            .filter(t => t.schoolId === HO_STORE_ID)
            .sort((a, b) => b.createdAt - a.createdAt);

        const reportData = allHoTransactions.map(t => ({
            Date: t.date,
            TransactionID: t.id,
            Type: t.type,
            Category: t.category,
            SubCategory: t.subCategory,
            Item: t.itemName,
            Quantity: t.quantity,
            UnitPrice: t.unitPrice || 0,
            TotalValue: t.totalValue || 0,
            IssuedTo: t.issuedTo || '-',
            IssuedToID: t.issuedToId || '-'
        }));

        const timestamp = new Date().toISOString().split('T')[0];
        downloadExcel(reportData, `HO_Store_Transactions_${timestamp}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-slate-800 text-white rounded-xl shadow-md">
                <Store size={32} className="text-brand-400" />
                <div>
                    <h2 className="text-xl font-bold">Head Office Central Store</h2>
                    <p className="text-slate-300 text-sm">Independent Inventory Management for Books & Stationery</p>
                </div>
            </div>

            {/* DASHBOARD SUMMARY VIEW */}
            {viewMode === 'DASH' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-gray-500 font-semibold mb-2">Total Inventory Value</h3>
                            <p className="text-3xl font-bold text-emerald-600">₹{totalValue.toLocaleString()}</p>
                         </div>
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-gray-500 font-semibold mb-2">Total Items in Stock</h3>
                            <p className="text-3xl font-bold text-indigo-600">{totalItems.toLocaleString()} <span className="text-sm font-normal text-gray-400">units</span></p>
                         </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-80 flex flex-col">
                         <h3 className="text-lg font-bold text-gray-700 mb-4">Stock Value by Category</h3>
                         <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} cursor={{fill: '#f1f5f9'}} />
                                    <Bar dataKey="value" fill="#0ea5e9" barSize={60} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                         </div>
                    </div>
                </div>
            )}

            {/* REPORTS VIEW */}
            {viewMode === 'REPORTS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Inventory Report Card */}
                    <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-gray-50 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                                <Package size={24} />
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                                {hoStock.length} Items
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Current Inventory Report</h3>
                        <p className="text-sm text-gray-600 mb-6 flex-grow">
                            Download complete list of items currently in the Central Store with quantities and values.
                        </p>
                        <div className="mt-auto">
                            <button 
                                onClick={handleDownloadInventory}
                                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-blue-600 text-blue-700 py-2.5 rounded-lg hover:bg-blue-50 font-semibold transition-colors"
                            >
                                <FileSpreadsheet size={18} /> Download Excel
                            </button>
                        </div>
                    </div>

                    {/* Transaction Report Card */}
                    <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-gray-50 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className="bg-amber-100 p-3 rounded-lg text-amber-600">
                                <History size={24} />
                            </div>
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded">
                                All Records
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Transaction History Report</h3>
                        <p className="text-sm text-gray-600 mb-6 flex-grow">
                            Download detailed log of all Purchases and Issues made from the Central Store.
                        </p>
                        <div className="mt-auto">
                            <button 
                                onClick={handleDownloadTransactions}
                                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-amber-600 text-amber-700 py-2.5 rounded-lg hover:bg-amber-50 font-semibold transition-colors"
                            >
                                <FileSpreadsheet size={18} /> Download Excel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ACTION VIEWS */}
            {(viewMode === 'ADD' || viewMode === 'ISSUE') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ACTION FORM */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 order-last lg:order-first">
                        {viewMode === 'ADD' ? (
                            <HOAddStockForm 
                                addTransaction={addTransaction} 
                                updateTransaction={updateTransaction}
                                editingTransaction={editingTransaction}
                                cancelEdit={cancelEdit}
                            />
                        ) : (
                            <HOIssueStockForm 
                                addTransaction={addTransaction} 
                                updateTransaction={updateTransaction}
                                hoStock={hoStock} 
                                editingTransaction={editingTransaction}
                                cancelEdit={cancelEdit}
                            />
                        )}
                    </div>

                    {/* HISTORY TABLE */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full max-h-[800px]">
                        <div className="flex items-center gap-2 mb-6 text-gray-700 border-b pb-4">
                            <History size={24} />
                            <h2 className="text-xl font-bold">Recent {viewMode === 'ADD' ? 'Additions' : 'Issues'}</h2>
                        </div>
                        <div className="flex-1 overflow-auto min-h-0">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Item Details</th>
                                        <th className="px-4 py-3 text-right">Qty</th>
                                        {viewMode === 'ADD' && <th className="px-4 py-3 text-right">Cost</th>}
                                        {viewMode === 'ISSUE' && <th className="px-4 py-3">Issued To</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-400">No records found</td></tr>
                                    ) : (
                                        history.map(t => (
                                            <tr key={t.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{t.date}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{t.itemName}</div>
                                                    <div className="text-xs text-gray-500">{t.category} - {t.subCategory}</div>
                                                </td>
                                                <td className={`px-4 py-3 text-right font-bold ${viewMode === 'ADD' ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {viewMode === 'ADD' ? '+' : '-'}{t.quantity}
                                                </td>
                                                {viewMode === 'ADD' && <td className="px-4 py-3 text-right">₹{t.unitPrice}</td>}
                                                {viewMode === 'ISSUE' && <td className="px-4 py-3 text-gray-800">{t.issuedTo}</td>}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* CURRENT STOCK SNAPSHOT (Only for HO Store) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b pb-4">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Package size={24} />
                        <h2 className="text-xl font-bold">Current Store Inventory</h2>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <select 
                            className="p-2 rounded-md border border-gray-300 text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-brand-500"
                            value={invCategory}
                            onChange={(e) => setInvCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {HO_STORE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                className="pl-10 w-full rounded-md border border-slate-300 p-2 text-sm bg-white text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="Search item..."
                                value={invSearch}
                                onChange={(e) => setInvSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Sub Category / Class</th>
                                <th className="px-6 py-3">Title / Item</th>
                                <th className="px-6 py-3 text-right">Available Qty</th>
                                <th className="px-6 py-3 text-right">Avg Value</th>
                                <th className="px-6 py-3 text-right">Total Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                             {filteredInventory.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No items found</td></tr>
                                ) : (
                                    filteredInventory.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-bold text-gray-700">{item.category}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold border border-blue-100 whitespace-nowrap">
                                                    {item.subCategory}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium min-w-[200px]">{item.itemName}</td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-600">{item.quantity}</td>
                                            <td className="px-6 py-4 text-right">₹{item.avgValue.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-medium">₹{(item.quantity * item.avgValue).toFixed(2)}</td>
                                        </tr>
                                    ))
                                )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TRANSACTION MANAGER SECTION */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
                <div className="flex flex-col gap-4 mb-6 border-b pb-4">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Layers size={24} />
                        <h2 className="text-xl font-bold">Stock Transaction Register</h2>
                    </div>
                    
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                className="pl-10 w-full rounded-md border border-slate-300 p-2 text-sm bg-white text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="Search general..."
                                value={txSearch}
                                onChange={(e) => setTxSearch(e.target.value)}
                            />
                        </div>
                        <select 
                            className="p-2 rounded-md border border-gray-300 text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-brand-500"
                            value={txCategory}
                            onChange={(e) => setTxCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {HO_STORE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input 
                            type="text" 
                            className="p-2 rounded-md border border-gray-300 text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Sub Category / Class"
                            value={txSubCategory}
                            onChange={(e) => setTxSubCategory(e.target.value)}
                        />
                        <input 
                            type="text" 
                            className="p-2 rounded-md border border-gray-300 text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Item Name / Title"
                            value={txItemName}
                            onChange={(e) => setTxItemName(e.target.value)}
                        />
                         <input 
                            type="text" 
                            className="p-2 rounded-md border border-gray-300 text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Bill Number"
                            value={txBillNumber}
                            onChange={(e) => setTxBillNumber(e.target.value)}
                        />
                        <select 
                            className="p-2 rounded-md border border-gray-300 text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-brand-500"
                            value={txType}
                            onChange={(e) => setTxType(e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value={TransactionType.PURCHASE}>Purchase</option>
                            <option value={TransactionType.ISSUE}>Issue</option>
                            <option value={TransactionType.DAMAGE}>Damage</option>
                            <option value={TransactionType.RETURN}>Return</option>
                        </select>
                        <input 
                            type="date" 
                            className="p-2 rounded-md border border-gray-300 text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-brand-500"
                            value={txStartDate}
                            onChange={(e) => setTxStartDate(e.target.value)}
                            placeholder="Start Date"
                        />
                        <input 
                            type="date" 
                            className="p-2 rounded-md border border-gray-300 text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-brand-500"
                            value={txEndDate}
                            onChange={(e) => setTxEndDate(e.target.value)}
                            placeholder="End Date"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Item Details</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3 text-right">Unit Price</th>
                                <th className="px-4 py-3">Issued To / Remarks</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                             {filteredTransactions.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">No transactions found</td></tr>
                                ) : (
                                    filteredTransactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">{t.date}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    t.type === TransactionType.PURCHASE ? 'bg-green-100 text-green-800' :
                                                    t.type === TransactionType.ISSUE ? 'bg-amber-100 text-amber-800' :
                                                    t.type === TransactionType.DAMAGE ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{t.itemName}</div>
                                                <div className="text-xs text-gray-500">{t.category} • {t.subCategory}</div>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${
                                                t.type === TransactionType.PURCHASE || t.type === TransactionType.RETURN ? 'text-green-600' : 'text-amber-600'
                                            }`}>
                                                {t.type === TransactionType.PURCHASE || t.type === TransactionType.RETURN ? '+' : '-'}{t.quantity}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600">₹{t.unitPrice}</td>
                                            <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]" title={t.issuedTo}>
                                                {t.issuedTo || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleEditTransaction(t)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(t.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EDIT MODAL */}
            {isEditModalOpen && editingTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {editingTransaction.type === TransactionType.ISSUE ? (
                                <HOIssueStockForm 
                                    addTransaction={addTransaction} 
                                    updateTransaction={updateTransaction}
                                    hoStock={hoStock} 
                                    editingTransaction={editingTransaction}
                                    cancelEdit={closeEditModal}
                                />
                            ) : (
                                <HOAddStockForm 
                                    addTransaction={addTransaction} 
                                    updateTransaction={updateTransaction}
                                    editingTransaction={editingTransaction}
                                    cancelEdit={closeEditModal}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const HOAddStockForm = ({ 
    addTransaction, 
    updateTransaction, 
    editingTransaction, 
    cancelEdit 
}: { 
    addTransaction: any, 
    updateTransaction: any, 
    editingTransaction: Transaction | null, 
    cancelEdit: () => void 
}) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: HO_STORE_CATEGORIES[0],
        subCategory: '',
        itemName: '',
        quantity: 1,
        cost: 0
    });
    
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<any>(null);

    // Config state
    const [sessionYear, setSessionYear] = useState(getCurrentSession());
    const [selectedTier, setSelectedTier] = useState(BOOK_TIERS[2].id); 
    const [selectedClass, setSelectedClass] = useState('');

    const isBooks = formData.category === 'Books';

    // Populate form when editing
    useEffect(() => {
        if (editingTransaction) {
            setFormData({
                date: editingTransaction.date,
                category: editingTransaction.category,
                subCategory: editingTransaction.subCategory,
                itemName: editingTransaction.itemName,
                quantity: editingTransaction.quantity,
                cost: editingTransaction.unitPrice || 0
            });
            // Try to extract metadata for books if possible, or just leave as custom
            // For simplicity, we might treat edited items as custom text inputs if they don't match strict structure
            // But here we just populate the basic fields.
        } else {
            // Reset
            setFormData({
                date: new Date().toISOString().split('T')[0],
                category: HO_STORE_CATEGORIES[0],
                subCategory: '',
                itemName: '',
                quantity: 1,
                cost: 0
            });
        }
    }, [editingTransaction]);

    // Update selected class when tier changes to avoid invalid states
    useEffect(() => {
        const classes = TIER_CONFIG[selectedTier].classes;
        if (!classes.includes(selectedClass)) {
            setSelectedClass(classes[0]);
        }
    }, [selectedTier]);

    // Derived Books List for Dropdown
    const suggestedBooks = useMemo(() => {
        if (!isBooks || !selectedClass) return [];
        const config = TIER_CONFIG[selectedTier];
        let books = config.books[selectedClass] || [];
        
        // Add Diary for GRADES tier regardless of class
        if (selectedTier === 'GRADES') {
            books = [...books, 'Diary'];
        }
        return books;
    }, [selectedTier, selectedClass, isBooks]);

    const handleYearChange = (direction: number) => {
        const [start, end] = sessionYear.split('-').map(Number);
        const newStart = start + direction;
        if (newStart < 2022 || newStart > 2050) return;
        setSessionYear(`${newStart}-${newStart + 1}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalSubCategory = formData.subCategory;
        let finalItemName = formData.itemName;
        
        // Only apply special naming logic for NEW items or if user is manually changing books
        // If editing, we preserve the name unless user changes it.
        // For simplicity in this edit mode, we assume user might be correcting a mistake.
        if (isBooks && !editingTransaction) {
             finalSubCategory = selectedClass;
             // Append Tier and Year to Item Name for Uniqueness
             finalItemName = `${formData.itemName} [${selectedTier}] [${sessionYear}]`;
        } else if (isBooks && editingTransaction) {
            // If editing a book, we might want to keep the name as is if they didn't change the dropdowns
            // But if they are using the form, they might expect the generation logic.
            // For now, let's allow direct editing of the name field if it's populated.
            // But the UI shows dropdowns for books.
            // If we are in edit mode, we might want to switch to "Custom" mode or pre-fill the dropdowns if they match.
            // To keep it simple: If editing, we just take the values as is from the inputs.
            // We'll disable the complex generator for edit mode to avoid overwriting with wrong format.
        }

        const payload = {
            date: formData.date,
            schoolId: HO_STORE_ID,
            type: TransactionType.PURCHASE,
            category: formData.category,
            subCategory: finalSubCategory,
            itemName: finalItemName,
            quantity: Number(formData.quantity),
            unitPrice: Number(formData.cost),
            totalValue: Number(formData.quantity) * Number(formData.cost)
        };

        setPendingFormData(payload);
        setShowConfirmation(true);
    };

    const handleConfirm = async () => {
        if (!pendingFormData) return;

        if (editingTransaction) {
            await updateTransaction(editingTransaction.id, {
                date: pendingFormData.date,
                category: pendingFormData.category,
                subCategory: pendingFormData.subCategory,
                itemName: pendingFormData.itemName,
                quantity: pendingFormData.quantity,
                unitPrice: pendingFormData.unitPrice,
                totalValue: pendingFormData.totalValue
            });
            alert("Transaction Updated!");
            cancelEdit();
        } else {
            addTransaction(pendingFormData);
            alert("Stock Added to HO Store!");
            setFormData({ ...formData, itemName: '', quantity: 1, cost: 0, subCategory: '' });
        }
        setShowConfirmation(false);
        setPendingFormData(null);
    };

    const handleCancelConfirmation = () => {
        setShowConfirmation(false);
        setPendingFormData(null);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-brand-700">
                    {editingTransaction ? <Pencil size={24} /> : <PlusCircle size={24} />}
                    <h2 className="text-xl font-bold">{editingTransaction ? 'Edit Stock Entry' : 'Add Stock'}</h2>
                </div>
                {editingTransaction && (
                    <button onClick={cancelEdit} className="text-sm text-red-600 hover:underline flex items-center gap-1">
                        <X size={16} /> Cancel Edit
                    </button>
                )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" required className={inputClass} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                
                {/* Category Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        {HO_STORE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {isBooks && !editingTransaction ? (
                    <>
                        <div className="space-y-2">
                             <label className="block text-sm font-medium text-gray-700">Book Tier / Section</label>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {BOOK_TIERS.map(tier => (
                                    <button
                                        key={tier.id}
                                        type="button"
                                        onClick={() => setSelectedTier(tier.id)}
                                        className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-all text-left flex items-center gap-2 ${
                                            selectedTier === tier.id 
                                            ? 'bg-brand-600 text-white border-brand-600 shadow-md' 
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className={`w-3 h-3 rounded-full border ${selectedTier === tier.id ? 'bg-white border-white' : 'border-gray-400'}`}></div>
                                        <span className="truncate">{tier.label}</span>
                                    </button>
                                ))}
                             </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Session Year</label>
                            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-md border border-gray-200 mt-1 justify-between">
                                <button type="button" onClick={() => handleYearChange(-1)} className="p-1 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="font-bold text-gray-900 text-lg">{sessionYear}</span>
                                <button type="button" onClick={() => handleYearChange(1)} className="p-1 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Class</label>
                            <select className={inputClass} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                                {TIER_CONFIG[selectedTier].classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    list="book-suggestions"
                                    required 
                                    placeholder="Select or Type Title..." 
                                    className={inputClass} 
                                    value={formData.itemName} 
                                    onChange={e => setFormData({...formData, itemName: e.target.value})} 
                                />
                                <datalist id="book-suggestions">
                                    {suggestedBooks.map((book, idx) => (
                                        <option key={idx} value={book} />
                                    ))}
                                </datalist>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {suggestedBooks.length > 0 ? "Select from pre-defined list or type new." : "Type custom title."}
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Sub Category</label>
                            <input type="text" required placeholder="e.g. Pens, Markers" className={inputClass} value={formData.subCategory} onChange={e => setFormData({...formData, subCategory: e.target.value})} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Item Name</label>
                            <input type="text" required placeholder="e.g. Whiteboard Marker" className={inputClass} value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} />
                        </div>
                    </>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input type="number" required min="1" className={inputClass} value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cost per Unit (₹)</label>
                        <input type="number" required min="0" className={inputClass} value={formData.cost} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} />
                    </div>
                </div>
                <button type="submit" className={`w-full text-white py-2 rounded-lg flex items-center justify-center gap-2 mt-4 ${editingTransaction ? 'bg-blue-600 hover:bg-blue-700' : 'bg-brand-600 hover:bg-brand-700'}`}>
                    {editingTransaction ? <Check size={18} /> : <Save size={18} />} 
                    {editingTransaction ? 'Update Transaction' : 'Add to Store'}
                </button>
            </form>

            {/* Confirmation Modal */}
            {showConfirmation && pendingFormData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-brand-600 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertTriangle size={20} className="text-yellow-300" /> {editingTransaction ? 'Confirm Update' : 'Confirm Stock Entry'}
                            </h3>
                            <button onClick={handleCancelConfirmation} className="text-white/80 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-600 text-sm">Please review the details before {editingTransaction ? 'updating' : 'adding to'} inventory.</p>
                            
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Date:</span>
                                    <span className="font-medium text-gray-900">{pendingFormData.date}</span>
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
                                    <span className="font-bold text-green-600 text-lg">+{pendingFormData.quantity}</span>
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
                                    {editingTransaction ? 'Confirm Update' : 'Confirm & Add'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const HOIssueStockForm = ({ 
    addTransaction, 
    updateTransaction, 
    hoStock, 
    editingTransaction, 
    cancelEdit 
}: { 
    addTransaction: any, 
    updateTransaction: any, 
    hoStock: any[], 
    editingTransaction: Transaction | null, 
    cancelEdit: () => void 
}) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '',
        subCategory: '',
        itemName: '',
        quantity: 1,
        issuedTo: 'GBD'
    });
    
    // Config State
    const [selectedTier, setSelectedTier] = useState(BOOK_TIERS[2].id);
    const [selectedClass, setSelectedClass] = useState('');
    const [sessionYear, setSessionYear] = useState(getCurrentSession());

    // Populate form when editing
    useEffect(() => {
        if (editingTransaction) {
            setFormData({
                date: editingTransaction.date,
                category: editingTransaction.category,
                subCategory: editingTransaction.subCategory,
                itemName: editingTransaction.itemName,
                quantity: editingTransaction.quantity,
                issuedTo: editingTransaction.issuedTo || 'GBD'
            });
        } else {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                category: '',
                subCategory: '',
                itemName: '',
                quantity: 1,
                issuedTo: 'GBD'
            });
        }
    }, [editingTransaction]);

    // Initialize class when tier changes
    useEffect(() => {
        const classes = TIER_CONFIG[selectedTier].classes;
        if (!classes.includes(selectedClass)) {
            setSelectedClass(classes[0]);
        }
        // Reset item selection when filter criteria change, ONLY if not editing
        if (!editingTransaction) {
            setFormData(prev => ({...prev, itemName: '', subCategory: ''}));
        }
    }, [selectedTier]);

    // Derived dropdown options
    const availableCategories = useMemo(() => Array.from(new Set(hoStock.map(s => s.category))).sort(), [hoStock]);
    
    // Filter Items by Category AND Class (if Books)
    const availableItems = useMemo(() => {
        if (!formData.category) return [];
        
        let filtered = hoStock.filter(s => s.category === formData.category);

        if (formData.category === 'Books') {
            filtered = filtered.filter(s => {
                const isCorrectClass = s.subCategory === selectedClass;
                const isCorrectYear = s.itemName.includes(`[${sessionYear}]`);
                const isCorrectTier = s.itemName.includes(`[${selectedTier}]`);
                return isCorrectClass && isCorrectYear && isCorrectTier;
            });
        }

        return filtered.sort((a, b) => a.itemName.localeCompare(b.itemName));
    }, [hoStock, formData.category, selectedClass, sessionYear, selectedTier]);

    const handleYearChange = (direction: number) => {
        const [start, end] = sessionYear.split('-').map(Number);
        const newStart = start + direction;
        if (newStart < 2022 || newStart > 2050) return;
        setSessionYear(`${newStart}-${newStart + 1}`);
        if (!editingTransaction) {
            setFormData(prev => ({...prev, itemName: '', subCategory: ''}));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.itemName) {
            alert("Please select an item");
            return;
        }
        
        // Validation: Check stock availability (skip if editing and reducing quantity or keeping same)
        // If editing, we need to account for the original quantity being returned to stock logically before checking
        const currentItem = hoStock.find((s: any) => s.category === formData.category && s.subCategory === formData.subCategory && s.itemName === formData.itemName);
        
        let availableQty = currentItem ? currentItem.quantity : 0;
        if (editingTransaction && editingTransaction.itemName === formData.itemName) {
            availableQty += editingTransaction.quantity; // Add back original quantity for validation
        }

        if (availableQty < formData.quantity) {
            alert(`Insufficient stock! Available: ${availableQty}`);
            return;
        }

        if (editingTransaction) {
            await updateTransaction(editingTransaction.id, {
                date: formData.date,
                category: formData.category,
                subCategory: formData.subCategory,
                itemName: formData.itemName,
                quantity: Number(formData.quantity),
                issuedTo: formData.issuedTo,
                issuedToId: 'HO_EXTERNAL' 
            });
            alert("Issue Record Updated!");
            cancelEdit();
        } else {
            addTransaction({
                date: formData.date,
                schoolId: HO_STORE_ID,
                type: TransactionType.ISSUE,
                category: formData.category,
                subCategory: formData.subCategory,
                itemName: formData.itemName,
                quantity: Number(formData.quantity),
                issuedTo: formData.issuedTo,
                issuedToId: 'HO_EXTERNAL' 
            });
            alert("Stock Issued from HO Store!");
            setFormData({ ...formData, quantity: 1, issuedTo: 'GBD', itemName: '', subCategory: '' }); 
        }
    };

    const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val) {
            setFormData({...formData, itemName: '', subCategory: ''});
        } else {
            const [sub, name] = val.split('|||');
            setFormData({...formData, subCategory: sub, itemName: name});
        }
    };

    const isStationery = formData.category === 'Stationery';
    const isBooks = formData.category === 'Books';

    return (
        <div>
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-amber-600">
                    {editingTransaction ? <Pencil size={24} /> : <ArrowUpRight size={24} />}
                    <h2 className="text-xl font-bold">{editingTransaction ? 'Edit Issue Record' : 'Issue Stock'}</h2>
                </div>
                {editingTransaction && (
                    <button onClick={cancelEdit} className="text-sm text-red-600 hover:underline flex items-center gap-1">
                        <X size={16} /> Cancel Edit
                    </button>
                )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" required className={inputClass} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <select className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value, subCategory: '', itemName: ''})}>
                            <option value="">-- Select --</option>
                            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {isBooks && (
                        <>
                        <div className="col-span-1 md:col-span-2 space-y-2">
                             <label className="block text-sm font-medium text-gray-700">Filter Book Tier / Section</label>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {BOOK_TIERS.map(tier => (
                                    <button
                                        key={tier.id}
                                        type="button"
                                        onClick={() => setSelectedTier(tier.id)}
                                        className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-all text-center flex items-center justify-center gap-2 ${
                                            selectedTier === tier.id 
                                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="truncate">{tier.label}</span>
                                    </button>
                                ))}
                             </div>
                        </div>

                         <div>
                            <label className="block text-sm font-medium text-gray-700">Class</label>
                            <select 
                                className={inputClass} 
                                value={selectedClass} 
                                onChange={e => setSelectedClass(e.target.value)}
                            >
                                {TIER_CONFIG[selectedTier].classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        </>
                    )}
                </div>
                
                {isBooks && (
                    <div>
                         <label className="block text-sm font-medium text-gray-700">Session Year</label>
                        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-md border border-gray-200 mt-1 justify-between">
                            <button type="button" onClick={() => handleYearChange(-1)} className="p-1 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <span className="font-bold text-gray-900 text-lg">{sessionYear}</span>
                            <button type="button" onClick={() => handleYearChange(1)} className="p-1 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Select Item</label>
                    <select 
                        required 
                        className={inputClass} 
                        value={formData.itemName ? `${formData.subCategory}|||${formData.itemName}` : ''} 
                        onChange={handleItemChange} 
                        disabled={!formData.category}
                    >
                        <option value="">
                            {isBooks && availableItems.length === 0 ? `-- No Books Found --` : "-- Choose Item --"}
                        </option>
                        {availableItems.map((item: any, idx: number) => (
                            <option key={idx} value={`${item.subCategory}|||${item.itemName}`}>
                                {item.itemName} ({item.subCategory}) [Avail: {item.quantity}]
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input type="number" required min="1" className={inputClass} value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Issued To</label>
                        {isStationery ? (
                            <select 
                                required
                                className={`${inputClass} font-semibold`} 
                                value={formData.issuedTo} 
                                onChange={e => setFormData({...formData, issuedTo: e.target.value})}
                            >
                                <option value="GBD">GBD (Default)</option>
                                {SCHOOLS.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        ) : (
                            <input type="text" required placeholder="Name / Dept / Branch" className={inputClass} value={formData.issuedTo} onChange={e => setFormData({...formData, issuedTo: e.target.value})} />
                        )}
                    </div>
                </div>
                <button type="submit" className={`w-full text-white py-2 rounded-lg flex items-center justify-center gap-2 mt-4 ${editingTransaction ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                    {editingTransaction ? <Check size={18} /> : <ArrowUpRight size={18} />} 
                    {editingTransaction ? 'Update Issue Record' : 'Issue Stock'}
                </button>
            </form>
        </div>
    );
};