import { Clock, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";

export default function PendingPage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
  };

  if (profile?.status === "rejeitado") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 mx-auto mb-6">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Acesso negado</h2>
          <p className="text-muted-foreground mb-6">
            Sua solicitação de acesso foi recusada. Entre em contato com o administrador do ministério.
          </p>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 mx-auto mb-6">
          <Clock className="w-8 h-8 text-yellow-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Aguardando aprovação</h2>
        <p className="text-muted-foreground mb-2">
          Olá, <span className="text-foreground font-medium">{profile?.name}</span>!
        </p>
        <p className="text-muted-foreground mb-8">
          Seu cadastro foi realizado com sucesso. Um administrador do ministério precisa aprovar o seu acesso antes que você possa usar o sistema.
        </p>

        <div className="bg-card border border-border rounded-xl p-4 mb-6 text-left space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Detalhes do cadastro</p>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Nome</span>
            <span className="text-sm font-medium text-foreground">{profile?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">E-mail</span>
            <span className="text-sm font-medium text-foreground">{profile?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="text-sm font-semibold text-yellow-400">Pendente</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleCheck} variant="outline" disabled={checking} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Verificando..." : "Verificar aprovação"}
          </Button>
          <Button variant="ghost" onClick={signOut} className="gap-2 text-muted-foreground">
            <LogOut className="w-4 h-4" /> Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
}
