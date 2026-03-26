import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/app-sidebar";
import ValidatorPage from "@/pages/validator-page";
import MindmapPage from "@/pages/mindmap-page";
import HistoryPage from "@/pages/history-page";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
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

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Force dark mode class on root wrapper to ensure sleek look */}
        <div className="dark bg-background text-foreground min-h-screen font-sans selection:bg-primary/30">
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
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
