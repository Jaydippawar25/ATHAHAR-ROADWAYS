import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/common/Sidebar';
import { TopHeader } from './components/common/TopHeader';
import { BottomNav } from './components/common/BottomNav';
import { ScrollToTop } from './components/common/ScrollToTop';
import { AppRoutes } from './routes/AppRoutes';

const MainLayout = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <AppRoutes />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row overflow-x-hidden w-full max-w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full lg:pl-64 overflow-x-hidden">
        <TopHeader />
        <main className="flex-1 w-full max-w-full mx-auto px-3 sm:px-4 lg:px-5 py-3.5 sm:py-5 pb-20 lg:pb-5 overflow-x-hidden">
          <AppRoutes />
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <ScrollToTop />
          <MainLayout />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
