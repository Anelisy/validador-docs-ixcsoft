import { BookOpenCheck, Network, History, HelpCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const items = [
  { title: "Validador", url: "/", icon: BookOpenCheck },
  { title: "Mapa de Campos", url: "/mindmap", icon: Network },
  { title: "Histórico", url: "/history", icon: History },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r-border/50 bg-card/50 backdrop-blur-xl">
      <SidebarHeader className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
          <BookOpenCheck className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <h2 className="font-display font-bold text-base leading-tight">Validador</h2>
          <span className="text-xs text-muted-foreground font-medium">Documentação IA</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        transition-all duration-200 rounded-xl py-5
                        ${isActive 
                          ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-semibold shadow-sm' 
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <a 
          href="https://wiki-erp.ixcsoft.com.br/documentacao/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="font-medium">Wiki IXC</span>
        </a>
        
        <div className="mt-4 flex items-center gap-3 p-2">
          <Avatar className="w-9 h-9 border border-border/50 ring-2 ring-background">
            <AvatarFallback className="bg-primary/20 text-primary font-bold">DV</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Equipe Dev</span>
            <span className="text-xs text-muted-foreground">Uso Interno</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
