import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import ValidatorPage from "@/pages/validator-page";
import MindmapPage from "@/pages/mindmap-page";
import HistoryPage from "@/pages/history-page";
import LoginPage from "@/pages/login-page";
import NotFound from "@/pages/not-found";

const API_BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={ValidatorPage} />
      <Route path="/mindmap" component={MindmapPage} />
      <Route path="/history" component={HistoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { user, isLoading } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE()}/auth/status`)
      .then((r) => r.json())
      .then((d) => setNeedsSetup(!d.hasUsers))
      .catch(() => {})
      .finally(() => setCheckingSetup(false));
  }, []);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  if (isLoading || checkingSetup) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage setupMode={needsSetup} />;
  }

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 relative z-0">
            <header className="absolute top-4 left-4 z-50 lg:hidden">
              <SidebarTrigger className="bg-card/80 backdrop-blur-sm border shadow-sm rounded-lg w-10 h-10" />
            </header>
            <main className="flex-1 overflow-y-auto custom-scrollbar">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark bg-background text-foreground min-h-screen font-sans selection:bg-primary/30">
          <AuthProvider>
            <AppShell />
          </AuthProvider>
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
