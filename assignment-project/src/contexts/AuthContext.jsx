import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL; // should be http://localhost:5000 for now

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load user + token from localStorage on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const clearError = () => setError(null);

  const login = async ({ email, password }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      try {
        data = await res.json();            // avoid "Unexpected end of JSON input"
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.');
        setLoading(false);
        return null;
      }

      const { user: loggedUser, token: jwt } = data;

      setUser(loggedUser);
      setToken(jwt);
      localStorage.setItem('currentUser', JSON.stringify(loggedUser));
      localStorage.setItem('token', jwt);

      setLoading(false);
      return loggedUser;
    } catch (err) {
      console.error(err);
      setError('Login failed. Please try again.');
      setLoading(false);
      return null;
    }
  };

  const register = async ({ name, email, password, role }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setLoading(false);
        return null;
      }

      const { user: newUser, token: jwt } = data;

      setUser(newUser);
      setToken(jwt);
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      localStorage.setItem('token', jwt);

      setLoading(false);
      return newUser;
    } catch (err) {
      console.error(err);
      setError('Registration failed. Please try again.');
      setLoading(false);
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
