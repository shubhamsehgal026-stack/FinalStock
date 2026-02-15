import React, { useMemo } from 'react';
import { useAppStore } from '../store';
import { UserRole, TransactionType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, ShoppingBag, PieChart as PieIcon, ArrowDownRight, ArrowUpRight, DollarSign, Building, AlertOctagon } from 'lucide-react';

interface Props {
    role: UserRole;
    currentSchoolId?: string | null;
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export const AnalyticsModule: React.FC<Props> = ({ role, currentSchoolId }) => {
    const { transactions, getComputedStock, schools } = useAppStore();

    // 1. Prepare Base Data
    // We need the Average Value of items to calculate the "Cost" of an Issue transaction.
    const stockSummary = useMemo(() => getComputedStock(), [getComputedStock]);
    
    // Create a map for quick price lookup: "SchoolId-ItemName" -> Price
    const priceMap = useMemo(() => {
        const map = new Map<string, number>();
        stockSummary.forEach(s => {
            map.set(`${s.schoolId}-${s.itemName}`, s.avgValue);
        });
        return map;
    }, [stockSummary]);

    // 2. Process Transactions into Analytic Data
    const analyticsData = useMemo(() => {
        const data = {
            bySchool: {} as Record<string, number>,
            byCategory: {} as Record<string, number>,
            byEmployee: {} as Record<string, number>,
            byMonth: {} as Record<string, { purchased: number, consumed: number }>,
            totalConsumedValue: 0,
            totalPurchasedValue: 0,
            totalDamagedValue: 0
        };

        transactions.forEach(t => {
            // Filter logic based on role
            if (role === UserRole.ACCOUNTANT && t.schoolId !== currentSchoolId) return;
            if (role === UserRole.HEAD_OFFICE && t.schoolId === 'HO_CENTRAL_STORE') return; // Exclude store from general analytics

            const value = t.totalValue || (t.quantity * (priceMap.get(`${t.schoolId}-${t.itemName}`) || 0));

            const monthKey = t.date.substring(0, 7); // YYYY-MM
            if (!data.byMonth[monthKey]) data.byMonth[monthKey] = { purchased: 0, consumed: 0 };

            if (t.type === TransactionType.ISSUE) {
                // Consumption Expense (Issue by Accountant = Expense for HO)
                data.totalConsumedValue += value;
                
                // By School (Key Metric for HO)
                data.bySchool[t.schoolId] = (data.bySchool[t.schoolId] || 0) + value;
                
                // By Category
                data.byCategory[t.category] = (data.byCategory[t.category] || 0) + value;

                // By Employee (Only relevant for Accountant view)
                if (t.issuedToId) {
                    const empLabel = t.issuedTo || t.issuedToId;
                    data.byEmployee[empLabel] = (data.byEmployee[empLabel] || 0) + value;
                }

                // Monthly Trend
                data.byMonth[monthKey].consumed += value;

            } else if (t.type === TransactionType.PURCHASE || t.type === TransactionType.OPENING_STOCK) {
                // Purchase Expense
                data.totalPurchasedValue += (t.totalValue || 0);
                data.byMonth[monthKey].purchased += (t.totalValue || 0);
            } else if (t.type === TransactionType.DAMAGE) {
                data.totalDamagedValue += value;
            }
        });

        return data;
    }, [transactions, role, currentSchoolId, priceMap]);

    // 3. Format Data for Recharts with Explicit Type Casting
    const schoolChartData = Object.entries(analyticsData.bySchool)
        .map(([name, value]) => ({ name: name.toUpperCase(), value: value as number }))
        .sort((a, b) => b.value - a.value);

    const categoryChartData = Object.entries(analyticsData.byCategory)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value);

    const employeeChartData = Object.entries(analyticsData.byEmployee)
        .map(([name, value]) => ({ name: name.split('(')[0], value: value as number })) // Clean name
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 Employees

    const trendChartData = Object.entries(analyticsData.byMonth)
        .map(([name, val]) => {
            const v = val as { purchased: number; consumed: number };
            return { name, purchased: v.purchased, consumed: v.consumed };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
                <p className={`text-xs mt-2 font-medium ${color}`}>{sub}</p>
            </div>
            <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')}`}>
                <Icon className={color} size={24} />
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Expense (Issued)" 
                    value={`₹${analyticsData.totalConsumedValue.toLocaleString()}`} 
                    sub={role === UserRole.HEAD_OFFICE ? "Total Value Issued by Accountants" : "Value Issued to Staff"}
                    icon={ArrowUpRight}
                    color="text-orange-600"
                />
                <StatCard 
                    title="Total Stock Added" 
                    value={`₹${analyticsData.totalPurchasedValue.toLocaleString()}`} 
                    sub="Purchases & Opening Stock"
                    icon={ArrowDownRight}
                    color="text-emerald-600"
                />
                <StatCard 
                    title="Net Asset Value" 
                    value={`₹${(analyticsData.totalPurchasedValue - analyticsData.totalConsumedValue - analyticsData.totalDamagedValue).toLocaleString()}`} 
                    sub="Value currently held in store"
                    icon={DollarSign}
                    color="text-blue-600"
                />
                <StatCard 
                    title="Damaged / Loss" 
                    value={`₹${analyticsData.totalDamagedValue.toLocaleString()}`} 
                    sub="Total Value Written Off"
                    icon={AlertOctagon}
                    color="text-red-600"
                />
            </div>

            {/* HEAD OFFICE SECTION */}
            {role === UserRole.HEAD_OFFICE && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-[450px] flex flex-col">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Building size={20} className="text-brand-600"/> Expense by School Branch
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">Shows total value of items issued by the Accountant at each school.</p>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={schoolChartData} layout="vertical" margin={{ left: 40, right: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                                        <Tooltip 
                                            formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Expense']} 
                                            cursor={{fill: '#f8fafc'}} 
                                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                        />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                                            {schoolChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-[450px] flex flex-col">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <PieIcon size={20} className="text-purple-600"/> Network-Wide Expense Categories
                            </h3>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {categoryChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-[400px] flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-emerald-600"/> Monthly Cash Flow (Purchase vs Issue Expense)
                        </h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendChartData} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                                    <defs>
                                        <linearGradient id="colorPurchased" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorConsumed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} />
                                    <Legend />
                                    <Area type="monotone" dataKey="purchased" stroke="#22c55e" fillOpacity={1} fill="url(#colorPurchased)" name="Purchases" />
                                    <Area type="monotone" dataKey="consumed" stroke="#ef4444" fillOpacity={1} fill="url(#colorConsumed)" name="Expense (Issued)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {/* ACCOUNTANT SECTION */}
            {role === UserRole.ACCOUNTANT && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-[400px] flex flex-col">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Users size={20} className="text-brand-600"/> Top 10 Employees by Consumption
                            </h3>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={employeeChartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                                        <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} cursor={{fill: '#f8fafc'}} />
                                        <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={15} name="Consumed Value" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-[400px] flex flex-col">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <PieIcon size={20} className="text-purple-600"/> Branch Expense Categories
                            </h3>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {categoryChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-[350px] flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-600"/> Monthly Consumption Trend
                        </h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                                    <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="consumed" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} name="Consumption Value" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};