import { BookOpenCheck, Network, History, HelpCircle, LogOut, Shield, Users } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

const navItems = [
  { title: "Validador", url: "/", icon: BookOpenCheck },
  { title: "Mapa de Campos", url: "/mindmap", icon: Network },
  { title: "Histórico", url: "/history", icon: History },
];

type UserRecord = { id: number; email: string; name: string; isAdmin: boolean; createdAt: string };

function UsersDialog() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const { data: users = [] } = useQuery<UserRecord[]>({
    queryKey: ["auth-users"],
    queryFn: () =>
      fetch(`${API_BASE()}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
  });

  const createUser = useMutation({
    mutationFn: (body: object) =>
      fetch(`${API_BASE()}/auth/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-users"] });
      setNewEmail(""); setNewName(""); setNewPassword(""); setIsAdmin(false);
      toast({ title: "Usuário criado com sucesso." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) =>
      fetch(`${API_BASE()}/auth/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-users"] });
      toast({ title: "Usuário removido." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="w-4 h-4" /> Gerenciar Usuários
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="border border-border/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Adicionar usuário</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input placeholder="Nome completo" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">E-mail</Label>
              <Input type="email" placeholder="email@ixcsoft.com.br" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Senha temporária (mín. 6 caracteres)</Label>
            <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isAdmin" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="rounded" />
            <Label htmlFor="isAdmin" className="text-xs cursor-pointer">Administrador (pode gerenciar usuários)</Label>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!newEmail || !newName || !newPassword || createUser.isPending}
            onClick={() => createUser.mutate({ email: newEmail, name: newName, password: newPassword, isAdmin })}
          >
            {createUser.isPending ? "Criando..." : "Criar usuário"}
          </Button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{u.name}</span>
                <span className="text-xs text-muted-foreground truncate">{u.email}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {u.isAdmin && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Admin</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteUser.mutate(u.id)}
                  disabled={deleteUser.isPending}
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DialogContent>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

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
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`
                        transition-all duration-200 rounded-xl py-5
                        ${isActive
                          ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-semibold shadow-sm"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
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

      <SidebarFooter className="p-4 border-t border-border/50 space-y-3">
        <a
          href="https://wiki-erp.ixcsoft.com.br/documentacao/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="font-medium">Wiki IXC</span>
        </a>

        {user?.isAdmin && (
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground w-full">
                <Shield className="w-4 h-4" />
                <span className="font-medium">Usuários</span>
              </button>
            </DialogTrigger>
            <UsersDialog />
          </Dialog>
        )}

        <div className="flex items-center gap-3 p-2">
          <Avatar className="w-9 h-9 border border-border/50 ring-2 ring-background shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold truncate">{user?.name ?? "Usuário"}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="shrink-0 w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
