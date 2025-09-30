import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on app load
    const storedUser = localStorage.getItem('paywaka_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock user data
    const userData = {
      id: '1',
      name: 'Divine Anyanechi',
      email: email,
      avatar: null,
      balance: 45750.00,
      monthlyEarnings: 12500.00,
      referrals: 8,
      rewards: 2350.00
    };
    
    setUser(userData);
    localStorage.setItem('paywaka_user', JSON.stringify(userData));
    setIsLoading(false);
    
    return { success: true, user: userData };
  };

  const register = async (name, email, password) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const userData = {
      id: '1',
      name: name,
      email: email,
      avatar: null,
      balance: 0.00,
      monthlyEarnings: 0.00,
      referrals: 0,
      rewards: 0.00
    };
    
    setUser(userData);
    localStorage.setItem('paywaka_user', JSON.stringify(userData));
    setIsLoading(false);
    
    return { success: true, user: userData };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('paywaka_user');
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
