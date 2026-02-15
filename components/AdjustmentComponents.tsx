import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { RequestStatus } from '../types';
import { AlertTriangle, Send, CheckCircle, XCircle, Clock } from 'lucide-react';

const inputClass = "mt-1 block w-full rounded-md border-slate-600 bg-slate-800 text-white shadow-sm p-2 border placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

// --- ACCOUNTANT VIEW ---
export const AccountantAdjustmentForm: React.FC = () => {
    const { currentUser, getComputedStock, addAdjustmentRequest, adjustmentRequests } = useAppStore();
    const currentStock = getComputedStock(currentUser?.schoolId || '');

    const [formData, setFormData] = useState({
        category: '',
        subCategory: '',
        itemName: '',
        quantity: 1,
        reason: ''
    });

    // Derived state for dropdowns
    const availableCategories = useMemo(() => Array.from(new Set(currentStock.map(s => s.category))), [currentStock]);
    
    const availableItems = useMemo(() => {
        if (!formData.category) return [];
        return currentStock
            .filter(s => s.category === formData.category)
            .sort((a, b) => a.itemName.localeCompare(b.itemName));
    }, [currentStock, formData.category]);

    const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val) {
            setFormData({...formData, itemName: '', subCategory: ''});
        } else {
            const [sub, name] = val.split('|||');
            setFormData({...formData, subCategory: sub, itemName: name});
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.itemName || !currentUser?.schoolId) return;

        const stockItem = currentStock.find(s => 
            s.category === formData.category && 
            s.subCategory === formData.subCategory && 
            s.itemName === formData.itemName
        );

        if (!stockItem || stockItem.quantity < formData.quantity) {
            alert("Cannot report more than available stock quantity");
            return;
        }

        await addAdjustmentRequest({
            schoolId: currentUser.schoolId,
            category: formData.category,
            subCategory: formData.subCategory,
            itemName: formData.itemName,
            quantity: Number(formData.quantity),
            reason: formData.reason
        });

        alert("Damage/Adjustment Request Sent to Head Office");
        setFormData({ ...formData, itemName: '', quantity: 1, reason: '', subCategory: '' });
    };

    // Filter requests for this school
    const myRequests = adjustmentRequests
        .filter(r => r.schoolId === currentUser?.schoolId)
        .sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-6 text-red-600">
                    <AlertTriangle size={24} />
                    <h2 className="text-xl font-bold">Report Damage / Nullify Stock</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <select 
                            className={inputClass} 
                            value={formData.category} 
                            onChange={e => setFormData({...formData, category: e.target.value, itemName: '', subCategory: ''})}
                            required
                        >
                            <option value="">-- Select Category --</option>
                            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Item</label>
                        <select 
                            className={inputClass} 
                            value={formData.itemName ? `${formData.subCategory}|||${formData.itemName}` : ''}
                            onChange={handleItemChange}
                            required
                            disabled={!formData.category}
                        >
                            <option value="">-- Select Item --</option>
                            {availableItems.map((item, idx) => (
                                <option key={idx} value={`${item.subCategory}|||${item.itemName}`}>
                                    {item.itemName} ({item.subCategory}) [Avail: {item.quantity}]
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity to Remove</label>
                        <input 
                            type="number" 
                            min="1" 
                            className={inputClass}
                            value={formData.quantity}
                            onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Reason / Remarks</label>
                        <textarea 
                            className={inputClass}
                            rows={3}
                            placeholder="e.g. Broken during transport, expired, theft..."
                            value={formData.reason}
                            onChange={e => setFormData({...formData, reason: e.target.value})}
                            required
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2">
                            <Send size={18} /> Send Request
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-6 text-gray-700 border-b pb-4">
                    <Clock size={24} />
                    <h2 className="text-xl font-bold">Request History</h2>
                </div>
                <div className="overflow-auto h-[500px]">
                    {myRequests.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No adjustment requests found.</p>
                    ) : (
                        <div className="space-y-3">
                            {myRequests.map(req => (
                                <div key={req.id} className="p-4 rounded-lg border border-gray-100 bg-gray-50 flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{req.itemName}</h3>
                                        <p className="text-xs text-gray-500">{req.category} • {req.subCategory}</p>
                                        <p className="text-sm mt-1">Qty to Remove: <span className="font-bold text-red-600">{req.quantity}</span></p>
                                        <p className="text-xs text-gray-600 mt-2 italic">"{req.reason}"</p>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(req.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        {req.status === RequestStatus.PENDING && (
                                            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">Pending</span>
                                        )}
                                        {req.status === RequestStatus.APPROVED && (
                                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">Approved</span>
                                        )}
                                        {req.status === RequestStatus.REJECTED && (
                                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">Rejected</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- HEAD OFFICE VIEW ---
export const HOAdjustmentManager: React.FC = () => {
    const { adjustmentRequests, processAdjustmentRequest } = useAppStore();

    const pending = adjustmentRequests.filter(r => r.status === RequestStatus.PENDING);
    const history = adjustmentRequests.filter(r => r.status !== RequestStatus.PENDING).sort((a, b) => b.createdAt - a.createdAt);

    const handleAction = async (id: string, status: RequestStatus) => {
        if (status === RequestStatus.APPROVED) {
            if (!confirm("Are you sure? This will remove the stock from the school's inventory.")) return;
        }
        await processAdjustmentRequest(id, status);
    };

    return (
        <div className="space-y-8">
            {/* PENDING REQUESTS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-6 text-red-600">
                    <AlertTriangle size={24} />
                    <h2 className="text-xl font-bold">Pending Damage Requests</h2>
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{pending.length}</span>
                </div>

                {pending.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">No pending damage requests.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">School</th>
                                    <th className="px-6 py-3">Item Details</th>
                                    <th className="px-6 py-3 text-center">Qty</th>
                                    <th className="px-6 py-3">Reason</th>
                                    <th className="px-6 py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pending.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800">{req.schoolId}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{req.itemName}</div>
                                            <div className="text-xs text-gray-500">{req.category}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-red-600">{req.quantity}</td>
                                        <td className="px-6 py-4 text-gray-600 italic max-w-xs truncate" title={req.reason}>{req.reason}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleAction(req.id, RequestStatus.APPROVED)}
                                                    className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"
                                                    title="Approve & Nullify Stock"
                                                >
                                                    <CheckCircle size={18}/>
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(req.id, RequestStatus.REJECTED)}
                                                    className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                                                    title="Reject Request"
                                                >
                                                    <XCircle size={18}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* HISTORY */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-700 mb-4">Processed Requests History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">School</th>
                                <th className="px-4 py-2">Item</th>
                                <th className="px-4 py-2">Qty</th>
                                <th className="px-4 py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-4 text-gray-400">No history available</td></tr>
                            ) : (
                                history.map(req => (
                                    <tr key={req.id}>
                                        <td className="px-4 py-2 text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 font-medium">{req.schoolId}</td>
                                        <td className="px-4 py-2">{req.itemName}</td>
                                        <td className="px-4 py-2 font-bold">{req.quantity}</td>
                                        <td className="px-4 py-2">
                                            {req.status === RequestStatus.APPROVED ? (
                                                <span className="text-green-600 font-bold text-xs">Approved</span>
                                            ) : (
                                                <span className="text-red-600 font-bold text-xs">Rejected</span>
                                            )}
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