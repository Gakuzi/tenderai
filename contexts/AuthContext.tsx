import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { UserRole, Client } from '../types';
import { api } from '../services/api';

// Mock staff users for login simulation
const STAFF_USERS = [
    { email: 'admin@tendera.ai', password: 'password', role: 'Admin' as UserRole },
    { email: 'manager@tendera.ai', password: 'password', role: 'Manager' as UserRole },
    { email: 'analyst@tendera.ai', password: 'password', role: 'Analyst' as UserRole },
];

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  impersonatedClient: Client | null;
  setImpersonatedClient: (client: Client | null) => void;
  isImpersonating: boolean; // Is a staff member viewing as a client?
  setIsImpersonating: (isImpersonating: boolean) => void;
  login: (email: string, pass: string) => Promise<UserRole>;
  logout: () => void;
  loading: boolean; // To track initial auth check
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Default to a staff role initially, login will overwrite this
  const [userRole, setUserRole] = useState<UserRole>('Admin'); 
  const [impersonatedClient, setImpersonatedClient] = useState<Client | null>(null);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for a session on initial load.
    // In a real app, this is where you'd check localStorage for a token.
    // For this mock, we just signal that the initial check is complete.
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<UserRole> => {
    // 1. Check if it's a staff user
    const staffUser = STAFF_USERS.find(u => u.email === email && u.password === pass);
    if (staffUser) {
        setIsAuthenticated(true);
        setUserRole(staffUser.role);
        setImpersonatedClient(null);
        setIsImpersonating(false);
        return staffUser.role;
    }

    // 2. If not staff, check if it's a client user
    const clients = await api.fetchClients();
    const clientUser = clients.find(c => c.email === email && c.password === pass);
    if (clientUser) {
        setIsAuthenticated(true);
        setUserRole('Client');
        setImpersonatedClient(clientUser);
        setIsImpersonating(false); // This is a real client login, not impersonation
        return 'Client';
    }

    throw new Error("Invalid credentials");
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUserRole('Admin'); // Reset to a default
    setImpersonatedClient(null);
    setIsImpersonating(false);
  }, []);


  return (
    <AuthContext.Provider value={{ 
        isAuthenticated, 
        userRole, 
        setUserRole, 
        impersonatedClient, 
        setImpersonatedClient,
        isImpersonating,
        setIsImpersonating,
        login,
        logout,
        loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};