import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (newPassword: string) => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "doc_validator_auth_token";
const DEFAULT_PASSWORD = "V@lidador123";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("doc_validator_user");
    const savedToken = localStorage.getItem(TOKEN_KEY);
    
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        localStorage.removeItem("doc_validator_user");
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!email.endsWith("@ixcsoft.com.br")) {
      alert("Apenas e-mails @ixcsoft.com.br são permitidos.");
      return false;
    }

    const savedPassword = localStorage.getItem(`ixc_pwd_${email}`);
    const validPassword = savedPassword || DEFAULT_PASSWORD;

    if (password !== validPassword) {
      alert("Senha incorreta.");
      return false;
    }

    const name = email
      .split("@")[0]
      .split(".")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    const newUser: AuthUser = {
      id: 1,
      email,
      name,
      isAdmin: false,
    };

    const newToken = btoa(`${email}:${Date.now()}`);

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem("doc_validator_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("doc_validator_user");
    setToken(null);
    setUser(null);
  };

  const changePassword = (newPassword: string) => {
    if (user) {
      localStorage.setItem(`ixc_pwd_${user.email}`, newPassword);
      alert("Senha alterada com sucesso!");
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, changePassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
