import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { TransactionType } from '../types';
import { ClipboardList, Droplet, User, CornerUpLeft, Search, Bell, AlertCircle, X } from 'lucide-react';

const inputClass = "mt-1 block w-full rounded-md border-slate-600 bg-slate-800 text-white shadow-sm p-2 border placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

// --- EMPLOYEE VIEW: My Consumption ---
export const EmployeeConsumptionModule: React.FC = () => {
    const { currentUser, transactions, consumptionLogs, addConsumptionLog, returnRequests } = useAppStore();
    const [recordModalItem, setRecordModalItem] = useState<{ id: string, name: string, maxQty: number } | null>(null);
    const [consumeQty, setConsumeQty] = useState(1);
    const [consumeRemarks, setConsumeRemarks] = useState('');

    if (!currentUser?.employeeId) return <div>Invalid User Session</div>;

    // Get Active Issues for this employee
    const myIssues = useMemo(() => {
        // 1. Get all issue transactions for this user
        const issues = transactions.filter(t => 
            t.type === TransactionType.ISSUE && 
            t.issuedToId === currentUser.employeeId
        );

        // 2. Calculate remaining quantity for each issue
        return issues.map(issue => {
            // How much returned? (Look for RETURN tx linked to this issue ID)
            const returned = transactions
                .filter(t => t.type === TransactionType.RETURN && t.issuedToId === issue.id)
                .reduce((sum, t) => sum + t.quantity, 0);

            // How much consumed?
            const consumed = consumptionLogs
                .filter(c => c.issueTransactionId === issue.id)
                .reduce((sum, c) => sum + c.quantityConsumed, 0);

            const remaining = issue.quantity - returned - consumed;

            // Check if return requested
            const isReturnRequested = returnRequests.some(r => r.issueTransactionId === issue.id && r.status === 'PENDING');

            return {
                ...issue,
                returned,
                consumed,
                remaining,
                isReturnRequested
            };
        }).filter(item => item.remaining > 0); // Only show active items
    }, [transactions, consumptionLogs, returnRequests, currentUser.employeeId]);

    const handleRecordClick = (item: any) => {
        setRecordModalItem({ id: item.id, name: item.itemName, maxQty: item.remaining });
        setConsumeQty(1);
        setConsumeRemarks('');
    };

    const submitConsumption = async () => {
        if (!recordModalItem) return;
        if (consumeQty > recordModalItem.maxQty || consumeQty <= 0) {
            alert("Invalid Quantity");
            return;
        }

        await addConsumptionLog({
            schoolId: currentUser.schoolId || '',
            employeeId: currentUser.employeeId || '',
            issueTransactionId: recordModalItem.id,
            itemName: recordModalItem.name,
            quantityConsumed: Number(consumeQty),
            date: new Date().toISOString().split('T')[0],
            remarks: consumeRemarks
        });

        alert("Usage Recorded!");
        setRecordModalItem(null);
    };

    // Pending Return Requests Notification
    const pendingReturns = myIssues.filter(i => i.isReturnRequested);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {pendingReturns.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-pulse">
                    <Bell className="text-red-600 mt-1" />
                    <div>
                        <h3 className="font-bold text-red-800">Return Requested by Accountant</h3>
                        <p className="text-sm text-red-600">Please return the following items to the office immediately:</p>
                        <ul className="list-disc ml-5 mt-1 text-sm text-red-700 font-medium">
                            {pendingReturns.map(item => (
                                <li key={item.id}>{item.itemName} (Qty: {item.remaining})</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-6 text-brand-700 border-b pb-4">
                    <ClipboardList size={24} />
                    <h2 className="text-xl font-bold">My Active Inventory</h2>
                </div>

                {myIssues.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">You have no items currently issued.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myIssues.map(item => (
                            <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative overflow-hidden bg-gray-50">
                                {item.isReturnRequested && (
                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                        RETURN REQUESTED
                                    </div>
                                )}
                                <h3 className="font-bold text-gray-800">{item.itemName}</h3>
                                <p className="text-xs text-gray-500">{item.category}</p>
                                
                                <div className="mt-3 space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span>Issued:</span> <span className="font-semibold">{item.quantity}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <span>Consumed:</span> <span>{item.consumed}</span>
                                    </div>
                                    <div className="flex justify-between text-brand-600 font-bold border-t pt-1 mt-1">
                                        <span>In Hand:</span> <span>{item.remaining}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleRecordClick(item)}
                                    className="w-full mt-4 bg-brand-600 text-white py-2 rounded-md hover:bg-brand-700 text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    <Droplet size={14} /> Record Usage
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Consumption History */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-700 mb-4">My Usage History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Item</th>
                                <th className="px-4 py-2 text-right">Consumed</th>
                                <th className="px-4 py-2">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {consumptionLogs
                                .filter(c => c.employeeId === currentUser.employeeId)
                                .map(log => (
                                <tr key={log.id}>
                                    <td className="px-4 py-2 text-gray-500">{log.date}</td>
                                    <td className="px-4 py-2 font-medium">{log.itemName}</td>
                                    <td className="px-4 py-2 text-right font-bold text-orange-600">{log.quantityConsumed}</td>
                                    <td className="px-4 py-2 text-gray-500 italic">{log.remarks || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {recordModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-brand-50 rounded-t-xl">
                            <h3 className="font-bold text-brand-900">Record Consumption</h3>
                            <button onClick={() => setRecordModalItem(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-sm text-gray-500">Item</p>
                                <p className="font-bold text-gray-800">{recordModalItem.name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Quantity Consumed (Max: {recordModalItem.maxQty})</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max={recordModalItem.maxQty} 
                                    className={inputClass}
                                    value={consumeQty}
                                    onChange={(e) => setConsumeQty(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Remarks / Purpose</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Used for Class 5 Project"
                                    className={inputClass}
                                    value={consumeRemarks}
                                    onChange={(e) => setConsumeRemarks(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={submitConsumption}
                                className="w-full bg-brand-600 text-white py-2 rounded-lg hover:bg-brand-700 font-medium mt-2"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- ACCOUNTANT VIEW: Track Consumption & Return Requests ---
export const AccountantConsumptionManager: React.FC = () => {
    const { transactions, consumptionLogs, returnRequests, addReturnRequest, currentUser } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'ISSUES' | 'LOGS'>('ISSUES');

    // 1. Calculate Active Issues for ALL Employees in this school
    const activeIssues = useMemo(() => {
        const issues = transactions.filter(t => 
            t.type === TransactionType.ISSUE && 
            t.schoolId === currentUser?.schoolId
        );

        return issues.map(issue => {
            const returned = transactions
                .filter(t => t.type === TransactionType.RETURN && t.issuedToId === issue.id)
                .reduce((sum, t) => sum + t.quantity, 0);

            const consumed = consumptionLogs
                .filter(c => c.issueTransactionId === issue.id)
                .reduce((sum, c) => sum + c.quantityConsumed, 0);

            const remaining = issue.quantity - returned - consumed;
            const isReturnRequested = returnRequests.some(r => r.issueTransactionId === issue.id && r.status === 'PENDING');

            return { ...issue, returned, consumed, remaining, isReturnRequested };
        })
        .filter(item => item.remaining > 0) // Only active
        .filter(item => 
            item.issuedTo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [transactions, consumptionLogs, returnRequests, currentUser?.schoolId, searchTerm]);

    // 2. Filter Consumption Logs
    const filteredLogs = consumptionLogs
        .filter(l => l.schoolId === currentUser?.schoolId)
        .filter(l => l.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => b.createdAt - a.createdAt);

    const handleRequestReturn = async (item: any) => {
        if (!confirm(`Request return of ${item.itemName} from ${item.issuedTo}?`)) return;
        
        await addReturnRequest({
            schoolId: currentUser?.schoolId || '',
            employeeId: item.issuedToId || '',
            issueTransactionId: item.id,
            itemName: item.itemName
        });
        alert("Return Request Sent to Employee");
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('ISSUES')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'ISSUES' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'}`}
                        >
                            Active Issues & Return
                        </button>
                        <button 
                            onClick={() => setViewMode('LOGS')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'LOGS' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'}`}
                        >
                            Consumption Logs
                        </button>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            className="pl-10 w-full rounded-md border border-slate-300 p-2 text-sm"
                            placeholder="Search employee or item..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {viewMode === 'ISSUES' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Employee</th>
                                    <th className="px-6 py-3">Item</th>
                                    <th className="px-6 py-3 text-center">Issued</th>
                                    <th className="px-6 py-3 text-center">Consumed</th>
                                    <th className="px-6 py-3 text-center">In Hand</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeIssues.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No active issues found.</td></tr>
                                ) : (
                                    activeIssues.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-bold text-gray-800">{item.issuedTo}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{item.itemName}</div>
                                                <div className="text-xs text-gray-400">{item.category}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">{item.quantity}</td>
                                            <td className="px-6 py-4 text-center text-gray-500">{item.consumed}</td>
                                            <td className="px-6 py-4 text-center font-bold text-brand-600">{item.remaining}</td>
                                            <td className="px-6 py-4 text-right">
                                                {item.isReturnRequested ? (
                                                    <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">Requested</span>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleRequestReturn(item)}
                                                        className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full font-medium hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1 ml-auto"
                                                    >
                                                        <CornerUpLeft size={12} /> Request Return
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Employee ID</th>
                                    <th className="px-6 py-3">Item</th>
                                    <th className="px-6 py-3 text-right">Qty Consumed</th>
                                    <th className="px-6 py-3">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">No consumption logs found.</td></tr>
                                ) : (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-500">{log.date}</td>
                                            <td className="px-6 py-4 font-mono text-xs">{log.employeeId}</td>
                                            <td className="px-6 py-4 font-medium">{log.itemName}</td>
                                            <td className="px-6 py-4 text-right font-bold text-orange-600">{log.quantityConsumed}</td>
                                            <td className="px-6 py-4 text-gray-500 italic">{log.remarks}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};