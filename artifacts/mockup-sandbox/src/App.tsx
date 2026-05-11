import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/contexts/auth-context";
import { PromptsProvider } from "@/contexts/prompts-context";
import ValidatorPageStandalone from "@/pages/validator-page-standalone";

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
          <AuthProvider>
            <PromptsProvider>
              <SidebarProvider>
                <ValidatorPageStandalone />
              </SidebarProvider>
            </PromptsProvider>
          </AuthProvider>
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
