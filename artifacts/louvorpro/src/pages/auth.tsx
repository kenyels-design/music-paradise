import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus } from "lucide-react";

type Tab = "login" | "cadastro";

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao entrar";
      toast({ title: "Erro ao entrar", description: traduzirErro(message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Senhas diferentes", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, name);
      toast({ title: "Conta criada!", description: "Aguarde a aprovação de um administrador para acessar o sistema." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao cadastrar";
      toast({ title: "Erro ao cadastrar", description: traduzirErro(message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/images/logo.png" alt="LouvorPro" className="h-10 w-auto object-contain mb-4" />
          <p className="text-muted-foreground mt-1 text-sm">Gestão de ministério de louvor</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === "login"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Entrar
              </span>
            </button>
            <button
              onClick={() => setTab("cadastro")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === "cadastro"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" /> Criar conta
              </span>
            </button>
          </div>

          <div className="p-6">
            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleCadastro} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cad-name">Nome completo</Label>
                  <Input
                    id="cad-name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cad-email">E-mail</Label>
                  <Input
                    id="cad-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cad-password">Senha</Label>
                  <Input
                    id="cad-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cad-confirm">Confirmar senha</Label>
                  <Input
                    id="cad-confirm"
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Após o cadastro, um administrador precisa aprovar seu acesso.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function traduzirErro(message: string): string {
  if (message.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (message.includes("Email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (message.includes("User already registered")) return "Este e-mail já está cadastrado.";
  if (message.includes("Password should be")) return "A senha deve ter pelo menos 6 caracteres.";
  if (message.includes("Unable to validate email")) return "E-mail inválido.";
  return message;
}
