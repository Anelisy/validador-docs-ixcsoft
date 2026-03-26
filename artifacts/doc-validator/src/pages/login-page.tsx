import { useState } from "react";
import { BookOpenCheck, Lock, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

const API_BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

export default function LoginPage({ setupMode = false }: { setupMode?: boolean }) {
  const { login } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const endpoint = setupMode ? "/auth/setup" : "/auth/login";
    const body = setupMode ? { email, name, password } : { email, password };

    try {
      const res = await fetch(`${API_BASE()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Erro", description: data.error ?? "Falha ao autenticar.", variant: "destructive" });
        return;
      }

      login(data.token, data.user);
    } catch {
      toast({ title: "Erro de conexão", description: "Não foi possível conectar ao servidor.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/25 mb-4">
            <BookOpenCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Validador de Docs</h1>
          <p className="text-sm text-muted-foreground mt-1">Documentação IA — IXC Soft</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            {setupMode ? (
              <ShieldCheck className="w-5 h-5 text-primary" />
            ) : (
              <Lock className="w-5 h-5 text-primary" />
            )}
            <h2 className="text-lg font-semibold">
              {setupMode ? "Configuração Inicial" : "Acesso Restrito"}
            </h2>
          </div>

          {setupMode && (
            <p className="text-sm text-muted-foreground mb-5 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              Nenhum usuário cadastrado ainda. Crie a conta administradora para começar.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {setupMode && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9 bg-background/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9 pr-10 bg-background/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Aguarde..." : setupMode ? "Criar conta admin" : "Entrar"}
            </Button>
          </form>

          {!setupMode && (
            <p className="text-xs text-center text-muted-foreground mt-4">
              Acesso disponível apenas para membros da equipe cadastrados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
