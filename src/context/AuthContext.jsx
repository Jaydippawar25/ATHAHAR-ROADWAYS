import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('athahar_user');
    return saved
      ? JSON.parse(saved)
      : {
          uid: 'user-001',
          email: 'admin@athahar.com',
          displayName: 'Administrator',
        };
  });

  const login = (email, password) => {
    const newUser = {
      uid: `usr-${Date.now()}`,
      email,
      displayName: email.split('@')[0].toUpperCase(),
    };
    setUser(newUser);
    localStorage.setItem('athahar_user', JSON.stringify(newUser));
    return newUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('athahar_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
