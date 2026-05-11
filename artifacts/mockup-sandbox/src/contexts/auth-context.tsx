/**
 * Contexto de Autenticação Simplificado para o Mockup Sandbox
 * Funciona offline sem dependências de API
 */

import { createContext, useContext, ReactNode } from "react";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USER: AuthUser = {
  id: 1,
  email: "user@validador.local",
  name: "Usuário",
  isAdmin: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const login = () => {};
  const logout = () => {};

  return (
    <AuthContext.Provider
      value={{
        user: MOCK_USER,
        token: "mock-token",
        login,
        logout,
        isLoading: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
