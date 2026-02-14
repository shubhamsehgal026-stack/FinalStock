import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { UserRole } from '../types';
import { Building2, School, User, KeyRound, Lock, Badge, Store, LayoutGrid } from 'lucide-react';
import { CENTRAL_STORE_CREDENTIALS, HEAD_OFFICE_CREDENTIALS } from '../constants';

export const Login: React.FC = () => {
  const { login, schools, employees, userCredentials } = useAppStore();
  const [activeTab, setActiveTab] = useState<'HO' | 'BRANCH' | 'STORE'>('HO');
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [branchRole, setBranchRole] = useState<UserRole.ACCOUNTANT | UserRole.USER>(UserRole.ACCOUNTANT);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Auto-fill credentials for convenience
  useEffect(() => {
    // Reset fields on tab switch
    setPassword('');
    setUsername('');

    if (activeTab === 'HO') {
      setUsername(HEAD_OFFICE_CREDENTIALS.username);
      setPassword(HEAD_OFFICE_CREDENTIALS.password);
    } else if (activeTab === 'STORE') {
      setUsername(CENTRAL_STORE_CREDENTIALS.username);
      setPassword(CENTRAL_STORE_CREDENTIALS.password);
    } else {
      // Logic for Branch Tab
      if (selectedSchool) {
        if (branchRole === UserRole.ACCOUNTANT) {
           const cred = userCredentials.find(c => c.schoolId === selectedSchool && c.role === UserRole.ACCOUNTANT);
           if (cred) {
               setPassword(cred.password);
           }
        } else {
           // For User Role - Auto pick the first employee of this school
           const emp = employees.find(e => e.schoolId === selectedSchool);
           if (emp) {
             setUsername(emp.id); // Set Employee ID
             setPassword(`${emp.id}@123`);
           }
        }
      }
    }
  }, [activeTab, selectedSchool, branchRole, schools, employees, userCredentials]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    let success = false;
    
    if (activeTab === 'HO') {
      if (username !== HEAD_OFFICE_CREDENTIALS.username) {
        setError("Invalid Head Office Username");
        return;
      }
      success = login(null, UserRole.HEAD_OFFICE, password);
    } else if (activeTab === 'STORE') {
      if (username !== CENTRAL_STORE_CREDENTIALS.username) {
        setError("Invalid Central Store Username");
        return;
      }
      success = login(null, UserRole.CENTRAL_STORE_MANAGER, password);
    } else {
      if (!selectedSchool) {
        setError("Please select a school branch");
        return;
      }
      // For Accountant, username is ignored/not used. For User, username is EmployeeID.
      success = login(selectedSchool, branchRole, password, username);
    }

    if (!success) {
      setError("Invalid credentials. Please check details.");
    }
  };

  const inputClasses = "pl-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all focus:bg-white";
  const selectClasses = "pl-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none appearance-none focus:bg-white";
  const iconClasses = "absolute left-3 top-3.5 text-gray-400";

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-600/20 rounded-full blur-[100px] animate-blob mix-blend-screen"></div>
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-screen" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-indigo-600/20 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-screen" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden relative z-10 border border-white/20">
        
        {/* Left Side - Visual */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-brand-600 to-brand-900 flex-col items-center justify-center p-12 text-white relative">
          <div className="absolute inset-0 pattern-grid"></div>
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm mb-6 border border-white/20 shadow-lg">
               <Building2 size={64} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-3 tracking-tight">Darshan Inventory</h1>
            <p className="text-brand-100 text-lg font-light leading-relaxed">
              Managing educational resources with precision and ease across all branches.
            </p>
            
            <div className="mt-10 flex gap-4 text-xs font-medium text-brand-200 uppercase tracking-widest">
              <span>Secure</span> • <span>Fast</span> • <span>Reliable</span>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-white">
          {/* Mobile Logo for context */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-8 text-brand-700">
              <Building2 size={32} />
              <span className="text-2xl font-bold">DarshanInv</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
            <p className="text-gray-500 text-sm mt-1">Access the stock management portal</p>
          </div>

          {/* Custom Tabs */}
          <div className="flex mb-8 bg-gray-100/80 p-1.5 rounded-xl">
            <button
              onClick={() => { setActiveTab('HO'); setError(''); }}
              className={`flex-1 py-2.5 px-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'HO' 
                ? 'bg-white text-brand-700 shadow-sm ring-1 ring-gray-200' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <LayoutGrid size={16} /> Head Office
            </button>
            <button
              onClick={() => { setActiveTab('BRANCH'); setError(''); }}
              className={`flex-1 py-2.5 px-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'BRANCH' 
                ? 'bg-white text-brand-700 shadow-sm ring-1 ring-gray-200' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <School size={16} /> Branch
            </button>
             <button
              onClick={() => { setActiveTab('STORE'); setError(''); }}
              className={`flex-1 py-2.5 px-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'STORE' 
                ? 'bg-white text-brand-700 shadow-sm ring-1 ring-gray-200' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <Store size={16} /> Store
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {activeTab === 'HO' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <User className={iconClasses} size={18} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClasses}
                    placeholder="Enter HO ID"
                  />
                </div>
              </div>
            )}
            
            {activeTab === 'STORE' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Username</label>
                <div className="relative">
                  <Store className={iconClasses} size={18} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClasses}
                    placeholder="Enter Store ID"
                  />
                </div>
              </div>
            )}

            {activeTab === 'BRANCH' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Branch</label>
                  <div className="relative">
                    <School className={iconClasses} size={18} />
                    <select
                      value={selectedSchool}
                      onChange={(e) => setSelectedSchool(e.target.value)}
                      className={selectClasses}
                    >
                      <option value="">-- Select School --</option>
                      {schools.map(school => (
                        <option key={school.id} value={school.id}>{school.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Login As</label>
                   <div className="grid grid-cols-2 gap-3">
                     <label className={`cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${branchRole === UserRole.ACCOUNTANT ? 'bg-black border-black text-white shadow-md transform scale-[1.02]' : 'hover:bg-gray-50 border-gray-200 text-gray-600'}`}>
                        <input 
                          type="radio" 
                          name="role" 
                          checked={branchRole === UserRole.ACCOUNTANT}
                          onChange={() => setBranchRole(UserRole.ACCOUNTANT)}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${branchRole === UserRole.ACCOUNTANT ? 'border-white' : 'border-gray-400'}`}>
                            {branchRole === UserRole.ACCOUNTANT && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-medium">Accountant</span>
                     </label>

                     <label className={`cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${branchRole === UserRole.USER ? 'bg-black border-black text-white shadow-md transform scale-[1.02]' : 'hover:bg-gray-50 border-gray-200 text-gray-600'}`}>
                        <input 
                          type="radio" 
                          name="role" 
                          checked={branchRole === UserRole.USER}
                          onChange={() => setBranchRole(UserRole.USER)}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${branchRole === UserRole.USER ? 'border-white' : 'border-gray-400'}`}>
                            {branchRole === UserRole.USER && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-medium">Employee</span>
                     </label>
                   </div>
                </div>

                {/* Conditional Input for User Role */}
                {branchRole === UserRole.USER && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee ID</label>
                    <div className="relative">
                      <Badge className={iconClasses} size={18} />
                      <input
                        type="text"
                        value={username} // Reusing username state for Employee ID
                        onChange={(e) => setUsername(e.target.value)}
                        className={inputClasses}
                        placeholder="Enter Employee ID (e.g. 101)"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className={iconClasses} size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClasses}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                 <div className="w-2 h-2 mt-1.5 bg-red-500 rounded-full flex-shrink-0"></div>
                 <div>{error}</div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98]"
            >
              <KeyRound size={20} />
              Login to System
            </button>
          </form>

          <div className="mt-8 text-center">
             <p className="text-xs text-gray-400">
               Protected by Darshan Education Network Security
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};