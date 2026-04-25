import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ShieldCheck, Clock, ShieldOff, Users, CheckCircle2, XCircle,
  Music2, Headphones, Shield,
} from "lucide-react";
import { useState } from "react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type UserStatus = "pendente" | "aprovado" | "rejeitado";
type UserRole = "musico" | "tecnica" | "admin";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  isAdmin: boolean;
  role: UserRole;
  createdAt: string;
}

async function fetchProfiles(): Promise<UserProfile[]> {
  const res = await fetch(`${API_BASE}/api/profiles`);
  if (!res.ok) throw new Error("Erro ao carregar usuários");
  return res.json();
}

async function updateStatus(id: string, status: UserStatus): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/profiles/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Erro ao atualizar status");
  }
  return res.json();
}

async function updateRole(id: string, role: UserRole): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/profiles/${id}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Erro ao atualizar perfil");
  }
  return res.json();
}

const statusConfig: Record<UserStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: {
    label: "Pendente",
    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  aprovado: {
    label: "Aprovado",
    color: "bg-green-500/15 text-green-400 border-green-500/30",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rejeitado: {
    label: "Rejeitado",
    color: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const roleConfig: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
  musico: {
    label: "Músico",
    icon: <Music2 className="w-3.5 h-3.5" />,
    color: "text-primary",
  },
  tecnica: {
    label: "Técnica/Som",
    icon: <Headphones className="w-3.5 h-3.5" />,
    color: "text-sky-400",
  },
  admin: {
    label: "Administrador",
    icon: <Shield className="w-3.5 h-3.5" />,
    color: "text-yellow-400",
  },
};

export default function AdminUsers() {
  const { profile: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionTarget, setActionTarget] = useState<{ id: string; name: string; action: UserStatus } | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => updateStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      const cfg = statusConfig[updated.status];
      toast({ title: "Status atualizado", description: `${updated.name} agora está como "${cfg.label}".` });
      setActionTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateRole(id, role),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      const cfg = roleConfig[updated.role];
      toast({ title: "Perfil atualizado", description: `${updated.name} agora é ${cfg.label}.` });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: err.message.length > 120 ? err.message.slice(0, 120) + "…" : err.message,
        variant: "destructive",
        duration: 8000,
      });
      console.error("[updateRole]", err.message);
    },
  });

  if (!currentUser?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldOff className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  const pendentes = profiles.filter((p) => p.status === "pendente");
  const outros = profiles.filter((p) => p.status !== "pendente");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Gerenciar Usuários</h1>
          <p className="text-sm text-muted-foreground">Aprove acessos e defina o perfil de cada usuário</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {profiles.length} usuário{profiles.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {pendentes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Aguardando aprovação ({pendentes.length})
              </h2>
              <div className="space-y-2">
                {pendentes.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    currentUserId={currentUser.id}
                    onStatusAction={(action) => setActionTarget({ id: user.id, name: user.name, action })}
                    onRoleChange={(role) => roleMutation.mutate({ id: user.id, role })}
                    isStatusPending={statusMutation.isPending}
                    isRolePending={roleMutation.isPending && roleMutation.variables?.id === user.id}
                  />
                ))}
              </div>
            </section>
          )}

          {outros.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Todos os usuários
              </h2>
              <div className="space-y-2">
                {outros.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    currentUserId={currentUser.id}
                    onStatusAction={(action) => setActionTarget({ id: user.id, name: user.name, action })}
                    onRoleChange={(role) => roleMutation.mutate({ id: user.id, role })}
                    isStatusPending={statusMutation.isPending}
                    isRolePending={roleMutation.isPending && roleMutation.variables?.id === user.id}
                  />
                ))}
              </div>
            </section>
          )}

          {profiles.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Users className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">Nenhum usuário cadastrado ainda.</p>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget?.action === "aprovado" ? "Aprovar acesso?" : "Rejeitar acesso?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === "aprovado"
                ? `${actionTarget?.name} poderá acessar o sistema após a aprovação.`
                : `${actionTarget?.name} não poderá acessar o sistema. Esta ação pode ser revertida.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionTarget && statusMutation.mutate({ id: actionTarget.id, status: actionTarget.action })}
              className={actionTarget?.action === "rejeitado" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {actionTarget?.action === "aprovado" ? "Aprovar" : "Rejeitar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserCard({
  user,
  currentUserId,
  onStatusAction,
  onRoleChange,
  isStatusPending,
  isRolePending,
}: {
  user: UserProfile;
  currentUserId: string;
  onStatusAction: (action: UserStatus) => void;
  onRoleChange: (role: UserRole) => void;
  isStatusPending: boolean;
  isRolePending: boolean;
}) {
  const cfg = statusConfig[user.status];
  const isSelf = user.id === currentUserId;
  const currentRole: UserRole = user.role ?? "musico";

  return (
    <div className="flex flex-col gap-3 bg-card border border-border rounded-xl px-4 py-3">
      {/* Linha superior: avatar + nome + status */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">{user.name}</p>
            {user.isAdmin && (
              <span className="text-[10px] bg-primary/15 text-primary border border-primary/20 rounded px-1.5 py-0.5 font-semibold flex-shrink-0">
                Admin
              </span>
            )}
            {isSelf && (
              <span className="text-[10px] text-muted-foreground flex-shrink-0">(você)</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>

        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold flex-shrink-0 ${cfg.color}`}>
          {cfg.icon}
          {cfg.label}
        </div>
      </div>

      {/* Linha inferior: seletor de role + botões de status */}
      <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-12">
        {/* Seletor de perfil (role) — sempre visível, desabilitado para si mesmo */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Perfil:</span>
          <Select
            value={currentRole}
            onValueChange={(v: UserRole) => onRoleChange(v)}
            disabled={isSelf || isRolePending}
          >
            <SelectTrigger className={`h-7 text-xs w-auto min-w-[140px] border-border/60 gap-1.5 ${isRolePending ? "opacity-50" : ""}`}>
              {/* Exibe o ícone+label correto com base no valor real vindo da API */}
              <span className={`flex items-center gap-1.5 flex-1 ${roleConfig[currentRole].color}`}>
                {roleConfig[currentRole].icon}
                {roleConfig[currentRole].label}
              </span>
              {/* SelectValue necessário para o Radix funcionar, mas ocultado visualmente */}
              <SelectValue className="sr-only" />
            </SelectTrigger>
            <SelectContent>
              {/* value é ESTRITAMENTE o valor que vai para o banco — sem acento, minúsculo */}
              <SelectItem value="musico">
                <span className="flex items-center gap-2">
                  <Music2 className="w-3.5 h-3.5 text-primary" />
                  Músico
                </span>
              </SelectItem>
              <SelectItem value="tecnica">
                <span className="flex items-center gap-2">
                  <Headphones className="w-3.5 h-3.5 text-sky-400" />
                  Técnica / Som
                </span>
              </SelectItem>
              <SelectItem value="admin">
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-yellow-400" />
                  Administrador
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          {isRolePending && (
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </div>

        {/* Botões de aprovação (apenas para outros usuários) */}
        {!isSelf && (
          <div className="flex flex-wrap gap-2">
            {user.status !== "aprovado" && (
              <Button
                size="sm"
                variant="outline"
                disabled={isStatusPending}
                className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                onClick={() => onStatusAction("aprovado")}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprovar
              </Button>
            )}
            {user.status !== "rejeitado" && (
              <Button
                size="sm"
                variant="outline"
                disabled={isStatusPending}
                className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => onStatusAction("rejeitado")}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
              </Button>
            )}
            {user.status !== "pendente" && (
              <Button
                size="sm"
                variant="outline"
                disabled={isStatusPending}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onStatusAction("pendente")}
              >
                <Clock className="w-3.5 h-3.5 mr-1" /> Pendente
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
