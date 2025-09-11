import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './contexts/AuthContext';
import { LocalizationProvider } from './contexts/LocalizationContext';

import Layout from './components/Layout';
import ClientLayout from './components/client/ClientLayout';
import Spinner from './components/Spinner';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tenders from './pages/Tenders';
import TenderDetail from './pages/TenderDetail';
import ClientRequests from './pages/ClientRequests';
import RequestDetail from './pages/RequestDetail';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Suppliers from './pages/Suppliers';
import SupplierDetail from './pages/SupplierDetail';
import Finances from './pages/Finances';
import Agents from './pages/Agents';
import AgentSettings from './pages/AgentSettings';
import Users from './pages/Users';
import Approvals from './pages/Approvals';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Client Pages
import ClientDashboard from './pages/client/ClientDashboard';
import ClientMyCompanies from './pages/client/ClientMyCompanies';
import ClientMyRequests from './pages/client/ClientMyRequests';
import ClientFinances from './pages/client/ClientFinances';
import ClientNewRequest from './pages/client/ClientNewRequest';


import { 
    ADMIN_SIDEBAR_LINKS, 
    MANAGER_SIDEBAR_LINKS, 
    ANALYST_SIDEBAR_LINKS 
} from './constants';
import { UserRole } from './types';


const AppRoutes: React.FC = () => {
    const { isAuthenticated, userRole, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <Spinner />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        )
    }

    const getSidebarLinks = () => {
        switch (userRole) {
            case 'Admin':
            case 'Developer':
                return ADMIN_SIDEBAR_LINKS;
            case 'Manager':
                return MANAGER_SIDEBAR_LINKS;
            case 'Analyst':
                return ANALYST_SIDEBAR_LINKS;
            default:
                return [];
        }
    };

    if (userRole === 'Client') {
        return (
            <Routes>
                <Route path="/client" element={<ClientLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<ClientDashboard />} />
                    <Route path="my-companies" element={<ClientMyCompanies />} />
                    <Route path="requests" element={<ClientMyRequests />} />
                    <Route path="finances" element={<ClientFinances />} />
                    <Route path="new-request" element={<ClientNewRequest />} />
                </Route>
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/client/dashboard" replace />} />
            </Routes>
        );
    }
    

    return (
        <Routes>
            <Route path="/" element={<Layout links={getSidebarLinks()} />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="tenders" element={<Tenders />} />
                <Route path="tenders/:id" element={<TenderDetail />} />
                <Route path="requests" element={<ClientRequests />} />
                <Route path="requests/:id" element={<RequestDetail />} />
                <Route path="clients" element={<Clients />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="suppliers/:id" element={<SupplierDetail />} />
                <Route path="finances" element={<Finances />} />
                <Route path="agents" element={<Agents />} />
                <Route path="agents/:id/settings" element={<AgentSettings />} />
                <Route path="users" element={<Users />} />
                <Route path="approvals" element={<Approvals />} />
                <Route path="audit" element={<Audit />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
            </Route>
        </Routes>
    )
}

const App: React.FC = () => {
  return (
    <LocalizationProvider>
        <AuthProvider>
            <HashRouter>
                <AppRoutes />
            </HashRouter>
        </AuthProvider>
    </LocalizationProvider>
  );
}

export default App;