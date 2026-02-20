import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { HO_STORE_CATEGORIES, HO_STORE_ID, SCHOOLS } from '../constants';
import { TransactionType } from '../types';
import { PlusCircle, Save, History, ArrowUpRight, Package, Store, LayoutDashboard, ChevronLeft, ChevronRight, Layers, FileSpreadsheet, Download } from 'lucide-react';
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
    const { addTransaction, getComputedStock, transactions } = useAppStore();
    
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
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20);

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
                            <HOAddStockForm addTransaction={addTransaction} />
                        ) : (
                            <HOIssueStockForm addTransaction={addTransaction} hoStock={hoStock} />
                        )}
                    </div>

                    {/* HISTORY TABLE */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-6 text-gray-700 border-b pb-4">
                            <History size={24} />
                            <h2 className="text-xl font-bold">Recent {viewMode === 'ADD' ? 'Additions' : 'Issues'}</h2>
                        </div>
                        <div className="flex-1 overflow-auto">
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
                 <div className="flex items-center gap-2 mb-6 text-gray-700 border-b pb-4">
                    <Package size={24} />
                    <h2 className="text-xl font-bold">Current Store Inventory</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
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
                             {hoStock.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Store is empty</td></tr>
                                ) : (
                                    hoStock.map((item, idx) => (
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
        </div>
    );
};

const HOAddStockForm = ({ addTransaction }: { addTransaction: any }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: HO_STORE_CATEGORIES[0],
        subCategory: '',
        itemName: '',
        quantity: 1,
        cost: 0
    });
    
    // Config state
    const [sessionYear, setSessionYear] = useState(getCurrentSession());
    const [selectedTier, setSelectedTier] = useState(BOOK_TIERS[2].id); 
    const [selectedClass, setSelectedClass] = useState('');

    const isBooks = formData.category === 'Books';

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let finalSubCategory = formData.subCategory;
        let finalItemName = formData.itemName;
        
        if (isBooks) {
             finalSubCategory = selectedClass;
             // Append Tier and Year to Item Name for Uniqueness
             finalItemName = `${formData.itemName} [${selectedTier}] [${sessionYear}]`;
        }

        addTransaction({
            date: formData.date,
            schoolId: HO_STORE_ID,
            type: TransactionType.PURCHASE,
            category: formData.category,
            subCategory: finalSubCategory,
            itemName: finalItemName,
            quantity: Number(formData.quantity),
            unitPrice: Number(formData.cost),
            totalValue: Number(formData.quantity) * Number(formData.cost)
        });
        alert("Stock Added to HO Store!");
        setFormData({ ...formData, itemName: '', quantity: 1, cost: 0, subCategory: '' });
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-6 text-brand-700">
                <PlusCircle size={24} />
                <h2 className="text-xl font-bold">Add Stock</h2>
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

                {isBooks ? (
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
                <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-lg hover:bg-brand-700 flex items-center justify-center gap-2 mt-4">
                    <Save size={18} /> Add to Store
                </button>
            </form>
        </div>
    );
};

const HOIssueStockForm = ({ addTransaction, hoStock }: { addTransaction: any, hoStock: any[] }) => {
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

    // Initialize class when tier changes
    useEffect(() => {
        const classes = TIER_CONFIG[selectedTier].classes;
        if (!classes.includes(selectedClass)) {
            setSelectedClass(classes[0]);
        }
        // Reset item selection when filter criteria change
        setFormData(prev => ({...prev, itemName: '', subCategory: ''}));
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
        setFormData(prev => ({...prev, itemName: '', subCategory: ''}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.itemName) {
            alert("Please select an item");
            return;
        }
        
        const currentItem = hoStock.find((s: any) => s.category === formData.category && s.subCategory === formData.subCategory && s.itemName === formData.itemName);

        if (!currentItem || currentItem.quantity < formData.quantity) {
            alert("Insufficient stock in HO Store!");
            return;
        }

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
             <div className="flex items-center gap-2 mb-6 text-amber-600">
                <ArrowUpRight size={24} />
                <h2 className="text-xl font-bold">Issue Stock</h2>
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
                <button type="submit" className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 flex items-center justify-center gap-2 mt-4">
                    <ArrowUpRight size={18} /> Issue Stock
                </button>
            </form>
        </div>
    );
};