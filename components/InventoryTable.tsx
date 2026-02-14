import React from 'react';
import { StockSummary } from '../types';

interface Props {
  data: StockSummary[];
  showSchoolName?: boolean;
}

export const InventoryTable: React.FC<Props> = ({ data, showSchoolName }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            {showSchoolName && <th className="px-4 py-3 md:px-6">School ID</th>}
            <th className="px-4 py-3 md:px-6">Category</th>
            <th className="px-4 py-3 md:px-6">Sub-Category</th>
            <th className="px-4 py-3 md:px-6">Item Name</th>
            <th className="px-4 py-3 md:px-6 text-right text-indigo-700">Total Purchased</th>
            <th className="px-4 py-3 md:px-6 text-right text-orange-700">Total Used</th>
            <th className="px-4 py-3 md:px-6 text-right">Quantity Avail.</th>
            <th className="px-4 py-3 md:px-6 text-right">Avg Value (₹)</th>
            <th className="px-4 py-3 md:px-6 text-right">Total Asset Value (₹)</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={showSchoolName ? 9 : 8} className="px-6 py-8 text-center text-gray-400">
                No stock records found.
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr key={idx} className="bg-white border-b hover:bg-gray-50 transition-colors">
                {showSchoolName && (
                  <td className="px-4 py-3 md:px-6 font-medium text-gray-900">{item.schoolId}</td>
                )}
                <td className="px-4 py-3 md:px-6">{item.category}</td>
                <td className="px-4 py-3 md:px-6">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded border border-blue-400 whitespace-nowrap">
                        {item.subCategory}
                    </span>
                </td>
                <td className="px-4 py-3 md:px-6 font-medium text-gray-900 min-w-[150px]">{item.itemName}</td>
                <td className="px-4 py-3 md:px-6 text-right font-medium text-indigo-600 bg-indigo-50/50">{item.totalPurchased}</td>
                <td className="px-4 py-3 md:px-6 text-right font-medium text-orange-600 bg-orange-50/50">{item.totalIssued}</td>
                <td className={`px-4 py-3 md:px-6 text-right font-bold ${item.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {item.quantity}
                </td>
                <td className="px-4 py-3 md:px-6 text-right">₹{item.avgValue.toFixed(2)}</td>
                <td className="px-4 py-3 md:px-6 text-right font-medium text-gray-900">
                    ₹{(item.quantity * item.avgValue).toFixed(2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};