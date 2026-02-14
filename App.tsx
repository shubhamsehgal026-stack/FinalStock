import React from 'react';
import { AppProvider, useAppStore } from './store';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

const MainLayout: React.FC = () => {
  const { currentUser } = useAppStore();
  
  if (!currentUser) {
    return <Login />;
  }

  return <Dashboard />;
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;