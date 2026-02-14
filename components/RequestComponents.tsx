import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { RequestStatus, TransactionType, StockRequest } from '../types';
import { Send, Clock, CheckCircle, XCircle, Search, Edit3, ArrowRight, Package, PlusSquare, Trash2, Save, X } from 'lucide-react';

const inputClass = "mt-1 block w-full rounded-md border-slate-600 bg-slate-800 text-white shadow-sm p-2 border placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

export const UserRequestForm: React.FC = () => {
  const { addRequest, updateRequest, deleteRequest, currentUser, requests, getComputedStock, categories } = useAppStore();
  const [requestMode, setRequestMode] = useState<'STOCK' | 'NEW'>('STOCK');
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  
  // State for "New Item" Request
  const [newData, setNewData] = useState({
    category: categories[0] || '',
    subCategory: '',
    itemName: '',
    quantity: 1,
  });

  // State for "Existing Stock" Request
  const [stockData, setStockData] = useState({
    category: '',
    subCategory: '',
    itemName: '',
    quantity: 1
  });

  // Update default category when loaded
  useEffect(() => {
    if (!newData.category && categories.length > 0) {
        setNewData(prev => ({ ...prev, category: categories[0] }));
    }
  }, [categories, newData.category]);

  // Derived Data for Stock Dropdowns
  const currentStock = useMemo(() => 
    getComputedStock(currentUser?.schoolId || ''), 
    [getComputedStock, currentUser?.schoolId]
  );

  const availableCategories = useMemo(() => 
    Array.from(new Set(currentStock.map(s => s.category))), 
    [currentStock]
  );

  // Removed availableSubCategories

  const availableItems = useMemo(() => {
    if (!stockData.category) return [];
    // Filter by Category only
    return currentStock
        .filter(s => s.category === stockData.category)
        .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [currentStock, stockData.category]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.schoolId || !currentUser?.employeeId) return;

    const payload = requestMode === 'NEW' ? newData : stockData;

    // Validation
    if (requestMode === 'NEW') {
        if (!payload.category || !payload.subCategory || !payload.itemName) {
            alert("Please fill in all fields");
            return;
        }
    } else {
        // STOCK MODE: subCategory is inferred from item selection
        if (!payload.category || !payload.itemName) {
             alert("Please select an item");
             return;
        }
    }

    if (editingId) {
        // UPDATE MODE
        await updateRequest(editingId, {
            category: payload.category,
            subCategory: payload.subCategory,
            itemName: payload.itemName,
            quantity: Number(payload.quantity),
        });
        alert("Request Updated Successfully!");
        setEditingId(null);
    } else {
        // CREATE MODE
        await addRequest({
            schoolId: currentUser.schoolId,
            employeeId: currentUser.employeeId,
            employeeName: currentUser.name || 'Unknown',
            category: payload.category,
            subCategory: payload.subCategory,
            itemName: payload.itemName,
            quantity: Number(payload.quantity),
        });
        alert("Request Sent Successfully!");
    }
    
    // Reset Forms
    setNewData({ category: categories[0] || '', itemName: '', quantity: 1, subCategory: '' });
    setStockData({ category: '', subCategory: '', itemName: '', quantity: 1 });
  };

  const handleStockItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (!val) {
          setStockData({...stockData, itemName: '', subCategory: ''});
      } else {
          const [sub, name] = val.split('|||');
          setStockData({...stockData, subCategory: sub, itemName: name});
      }
  };

  const handleEdit = (req: StockRequest) => {
    setEditingId(req.id);
    // Switch to NEW mode to allow full editing of text fields
    setRequestMode('NEW'); 
    setNewData({
        category: req.category,
        subCategory: req.subCategory,
        itemName: req.itemName,
        quantity: req.quantity
    });
    // Scroll to form
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this request?")) {
        await deleteRequest(id);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewData({ category: categories[0] || '', itemName: '', quantity: 1, subCategory: '' });
    // If we were in STOCK mode before, we could revert, but default to STOCK is fine
    setRequestMode('STOCK');
  };

  const myRequests = requests.filter(r => r.employeeId === currentUser?.employeeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Request Form */}
      <div ref={formRef} className={`bg-white p-6 rounded-xl shadow-sm border ${editingId ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-brand-700">
                {editingId ? <Edit3 size={24} /> : <Send size={24} />}
                <h2 className="text-xl font-bold">{editingId ? 'Edit Request' : 'Request Item'}</h2>
            </div>
            {editingId && (
                <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>
            )}
        </div>

        {/* Tabs - Only show when not editing for simplicity */}
        {!editingId && (
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                <button 
                    onClick={() => setRequestMode('STOCK')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${requestMode === 'STOCK' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
                    type="button"
                >
                    <Package size={16} /> Existing Stock
                </button>
                <button 
                    onClick={() => setRequestMode('NEW')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${requestMode === 'NEW' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
                    type="button"
                >
                    <PlusSquare size={16} /> Request New Item
                </button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {requestMode === 'STOCK' ? (
             /* EXISTING STOCK FORM */
             <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select 
                    className={inputClass}
                    value={stockData.category}
                    onChange={(e) => setStockData({...stockData, category: e.target.value, subCategory: '', itemName: ''})}
                    required
                  >
                    <option value="">-- Select Category --</option>
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Name</label>
                  <select 
                    className={inputClass}
                    value={stockData.itemName ? `${stockData.subCategory}|||${stockData.itemName}` : ''}
                    onChange={handleStockItemChange}
                    disabled={!stockData.category}
                    required
                  >
                    <option value="">-- Select Item --</option>
                    {availableItems.map((item, idx) => (
                        <option key={idx} value={`${item.subCategory}|||${item.itemName}`}>
                            {item.itemName} ({item.subCategory}) (Avail: {item.quantity})
                        </option>
                    ))}
                  </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity Needed</label>
                    <input 
                    type="number" 
                    min="1"
                    className={inputClass}
                    value={stockData.quantity}
                    onChange={(e) => setStockData({...stockData, quantity: Number(e.target.value)})}
                    required
                    />
                </div>
             </>
          ) : (
            /* NEW ITEM FORM */
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select 
                        className={inputClass}
                        value={newData.category}
                        onChange={(e) => setNewData({...newData, category: e.target.value})}
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Sub Category</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Paints"
                        className={inputClass}
                        value={newData.subCategory}
                        onChange={(e) => setNewData({...newData, subCategory: e.target.value})}
                        required
                    />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Item Name</label>
                    <input 
                    type="text" 
                    placeholder="e.g. Red Acrylic Paint 500ml"
                    className={inputClass}
                    value={newData.itemName}
                    onChange={(e) => setNewData({...newData, itemName: e.target.value})}
                    required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity Needed</label>
                    <input 
                    type="number" 
                    min="1"
                    className={inputClass}
                    value={newData.quantity}
                    onChange={(e) => setNewData({...newData, quantity: Number(e.target.value)})}
                    required
                    />
                </div>
            </>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
            {editingId && (
                <button type="button" onClick={handleCancelEdit} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
                    Cancel Edit
                </button>
            )}
            <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2">
              {editingId ? <Save size={18} /> : <Send size={18} />} 
              {editingId ? 'Update Request' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6 text-gray-700 border-b pb-4">
          <Clock size={24} />
          <h2 className="text-xl font-bold">Active Requests</h2>
        </div>
        <div className="overflow-auto h-[400px]">
          {myRequests.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No active requests.</p>
          ) : (
            <div className="space-y-3">
              {myRequests.map(r => (
                <div key={r.id} className={`p-4 rounded-lg border flex justify-between items-start ${editingId === r.id ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div>
                    <h3 className="font-bold text-gray-800">{r.itemName}</h3>
                    <p className="text-xs text-gray-500">{r.category} • {r.subCategory}</p>
                    <p className="text-sm mt-1">Qty: <span className="font-semibold">{r.quantity}</span></p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {r.status === RequestStatus.PENDING ? (
                        <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold flex items-center gap-1">
                            <Clock size={12}/> Pending
                        </span>
                    ) : r.status === RequestStatus.APPROVED ? (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1">
                            <CheckCircle size={12}/> Approved
                        </span>
                    ) : (
                        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1">
                            <XCircle size={12}/> Rejected
                        </span>
                    )}

                    {/* Allow Edit/Delete only for Pending requests */}
                    {r.status === RequestStatus.PENDING && (
                        <div className="flex gap-2 mt-2">
                            <button 
                                onClick={() => handleEdit(r)}
                                className="p-1.5 text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                                title="Edit"
                                type="button"
                            >
                                <Edit3 size={14}/>
                            </button>
                            <button 
                                onClick={() => handleDelete(r.id)}
                                className="p-1.5 text-red-600 bg-red-100 rounded hover:bg-red-200"
                                title="Delete"
                                type="button"
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>
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

export const AccountantRequestManager: React.FC = () => {
    const { requests, currentUser, processRequest, getComputedStock } = useAppStore();
    const [editMode, setEditMode] = useState<string | null>(null);
    const [editData, setEditData] = useState({
        itemName: '',
        quantity: 0
    });
    
    // Only pending requests for this school
    const pendingRequests = requests.filter(r => 
        r.schoolId === currentUser?.schoolId && 
        r.status === RequestStatus.PENDING
    );

    const currentStock = getComputedStock(currentUser?.schoolId || '');

    const handleApprove = async (req: StockRequest) => {
        try {
            // Use edited data if available, otherwise original
            const finalItemName = editMode === req.id ? editData.itemName : req.itemName;
            const finalQty = editMode === req.id ? editData.quantity : req.quantity;

            // Check stock availability
            const stockItem = currentStock.find(s => 
                s.category === req.category && 
                s.subCategory === req.subCategory && 
                s.itemName === finalItemName
            );
            const availQty = stockItem ? stockItem.quantity : 0;

            if (availQty < finalQty) {
                if(!confirm(`Warning: Only ${availQty} units available. You are issuing ${finalQty}. This will result in negative stock. Continue?`)) {
                    return;
                }
            }

            // Await the process request function to ensure it completes
            await processRequest(req.id, RequestStatus.APPROVED, {
                date: new Date().toISOString().split('T')[0],
                schoolId: req.schoolId,
                type: TransactionType.ISSUE,
                category: req.category,
                subCategory: req.subCategory,
                itemName: finalItemName,
                quantity: Number(finalQty),
                issuedTo: `${req.employeeId} (${req.employeeName})`,
                issuedToId: req.employeeId
            });
            
            setEditMode(null);
            alert("Request Approved and Stock Issued!");
        } catch (error) {
            console.error("Failed to approve request:", error);
            alert("Failed to process request. Check console for details.");
        }
    };

    const handleReject = async (id: string) => {
        if(confirm("Are you sure you want to reject this request? It will be deleted permanently.")) {
            try {
                await processRequest(id, RequestStatus.REJECTED);
                alert("Request Rejected and Deleted");
            } catch (error) {
                console.error("Failed to reject request:", error);
                alert("Failed to reject request. Check console.");
            }
        }
    };

    const startEdit = (req: StockRequest) => {
        setEditMode(req.id);
        setEditData({
            itemName: req.itemName,
            quantity: req.quantity
        });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <div className="bg-yellow-100 p-2 rounded-full">
                    <Clock size={20} className="text-yellow-600" />
                </div>
                Pending Requests
                <span className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded-full text-gray-600">{pendingRequests.length}</span>
            </h2>

            {pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-400">All caught up! No pending requests.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Employee</th>
                                <th className="px-6 py-3">Requested Item</th>
                                <th className="px-6 py-3">Qty</th>
                                <th className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pendingRequests.map(req => (
                                <tr key={req.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(req.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {req.employeeName} <span className="text-xs text-gray-400 block">{req.employeeId}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editMode === req.id ? (
                                            <div className="space-y-1">
                                                <input 
                                                    className="w-full border rounded px-2 py-1 text-xs bg-slate-800 text-white border-slate-600"
                                                    value={editData.itemName}
                                                    onChange={(e) => setEditData({...editData, itemName: e.target.value})}
                                                />
                                                <p className="text-xs text-gray-400">{req.category}</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="font-medium text-gray-800">{req.itemName}</div>
                                                <div className="text-xs text-gray-400">{req.category} • {req.subCategory}</div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-800">
                                        {editMode === req.id ? (
                                            <input 
                                                type="number"
                                                className="w-16 border rounded px-2 py-1 text-xs bg-slate-800 text-white border-slate-600"
                                                value={editData.quantity}
                                                onChange={(e) => setEditData({...editData, quantity: Number(e.target.value)})}
                                            />
                                        ) : (
                                            req.quantity
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {editMode === req.id ? (
                                                <>
                                                    <button 
                                                        onClick={() => handleApprove(req)}
                                                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                                    >
                                                        Confirm Issue
                                                    </button>
                                                    <button 
                                                        onClick={() => setEditMode(null)}
                                                        className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => handleApprove(req)}
                                                        className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                                                        title="Approve & Issue"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => startEdit(req)}
                                                        className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                                                        title="Edit Request"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReject(req.id)}
                                                        className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                                                        title="Reject & Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}