import { useState, useContext, createContext, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PromptsProvider } from "@/contexts/prompts-context";
import ValidatorPageStandalone from "@/pages/validator-page-standalone";

// Mock Auth Provider para funcionar offline
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

const MOCK_USER: AuthUser = {
  id: 1,
  email: "user@validador.local",
  name: "Usuário",
  isAdmin: false,
};

function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<AuthUser | null>(MOCK_USER);
  const [token] = useState<string | null>("mock-token");

  const login = () => {};
  const logout = () => {};
  const isLoading = false;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 0 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark bg-background text-foreground min-h-screen font-sans selection:bg-primary/30">
          <MockAuthProvider>
            <PromptsProvider>
              <SidebarProvider>
                <ValidatorPageStandalone />
              </SidebarProvider>
            </PromptsProvider>
          </MockAuthProvider>
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
