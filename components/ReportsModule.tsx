import React from 'react';
import { StockSummary, Transaction, UserRole } from '../types';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

interface ReportsModuleProps {
    stockData: StockSummary[];
    transactions: Transaction[];
    financialYear: string;
    schoolName: string;
    role: UserRole;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ 
    stockData, 
    transactions, 
    financialYear, 
    schoolName,
    role
}) => {

    const downloadCSV = (data: any[], filename: string) => {
        if (!data || data.length === 0) {
            alert("No data available to download");
            return;
        }

        // Get headers
        const headers = Object.keys(data[0]);
        
        // Convert to CSV string
        const csvContent = [
            headers.join(','), // Header row
            ...data.map(row => headers.map(fieldName => {
                // Handle strings with commas or quotes
                const val = row[fieldName] !== null && row[fieldName] !== undefined ? row[fieldName] : '';
                const stringVal = String(val).replace(/"/g, '""'); 
                return `"${stringVal}"`;
            }).join(','))
        ].join('\n');

        // Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadInventory = () => {
        const reportData = stockData.map(item => ({
            School: item.schoolId,
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
        downloadCSV(reportData, `Inventory_Status_${schoolName}_${financialYear}_${timestamp}.csv`);
    };

    const handleDownloadTransactions = () => {
        const reportData = transactions.map(t => ({
            Date: t.date,
            TransactionID: t.id,
            School: t.schoolId,
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
        downloadCSV(reportData, `Transaction_History_${schoolName}_${financialYear}_${timestamp}.csv`);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600" /> 
                        Reports Center
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Generate and download detailed reports for <strong>{financialYear}</strong>.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Inventory Report Card */}
                    <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-gray-50 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                                <PackageIcon />
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                                {stockData.length} Items
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Current Inventory Status</h3>
                        <p className="text-sm text-gray-600 mb-6 flex-grow">
                            Download a snapshot of current stock levels, including quantities, average values, and total asset worth.
                        </p>
                        <div className="mt-auto">
                            <button 
                                onClick={handleDownloadInventory}
                                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-blue-600 text-blue-700 py-2.5 rounded-lg hover:bg-blue-50 font-semibold transition-colors"
                            >
                                <Download size={18} /> Download
                            </button>
                        </div>
                    </div>

                    {/* Transaction Report Card */}
                    <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-gray-50 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className="bg-amber-100 p-3 rounded-lg text-amber-600">
                                <FileText />
                            </div>
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded">
                                {transactions.length} Records
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Transaction History</h3>
                        <p className="text-sm text-gray-600 mb-6 flex-grow">
                            Detailed log of all Purchases (Inward) and Issues (Outward) for the selected financial year.
                        </p>
                        <div className="mt-auto">
                            <button 
                                onClick={handleDownloadTransactions}
                                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-amber-600 text-amber-700 py-2.5 rounded-lg hover:bg-amber-50 font-semibold transition-colors"
                            >
                                <Download size={18} /> Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PackageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22v-9"/></svg>
);