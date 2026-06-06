import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, X, Users2 } from "lucide-react";
import * as db from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TemplateMember {
  id: number;
  memberId: number;
  memberName: string;
  memberDefaultRole: string;
  role: string | null;
  sortOrder: number;
}

interface BandTemplate {
  id: number;
  name: string;
  type: "weekend" | "thursday" | "other";
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  members: TemplateMember[];
}

const typeLabels: Record<string, string> = {
  weekend: "Fim de Semana",
  thursday: "Quinta-feira",
  other: "Outro",
};

const typeBadgeClasses: Record<string, string> = {
  weekend:
    "bg-blue-500/15 text-blue-600 border-blue-400/40 dark:text-blue-400 dark:border-blue-500/30",
  thursday:
    "bg-purple-500/15 text-purple-600 border-purple-400/40 dark:text-purple-400 dark:border-purple-500/30",
  other:
    "bg-secondary text-muted-foreground border-border",
};

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.error ?? "Erro na requisição");
  }
  return res.json();
}

export function BandTemplatesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<BandTemplate[]>({
    queryKey: ["band-templates"],
    queryFn: () => apiFetch("/api/band-templates"),
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ["members"],
    queryFn: db.listMembers,
  });

  // ── Create ──────────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    type: "weekend",
    description: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof createForm) =>
      apiFetch("/api/band-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["band-templates"] });
      toast({ title: "Template criado" });
      setCreateOpen(false);
      setCreateForm({ name: "", type: "weekend", description: "" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // ── Update ──────────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      name?: string;
      description?: string;
      isActive?: boolean;
    }) =>
      apiFetch(`/api/band-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["band-templates"] }),
    onError: (err: Error) =>
      toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`${API_BASE}/api/band-templates/${id}`, { method: "DELETE" }).then(r => {
        if (!r.ok) throw new Error("Erro ao excluir template");
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["band-templates"] });
      toast({ title: "Template excluído" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // ── Add member ──────────────────────────────────────────────────────────────
  const addMemberMutation = useMutation({
    mutationFn: ({ templateId, memberId }: { templateId: number; memberId: number }) =>
      apiFetch(`/api/band-templates/${templateId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["band-templates"] });
      toast({ title: "Membro adicionado" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // ── Remove member ────────────────────────────────────────────────────────────
  const removeMemberMutation = useMutation({
    mutationFn: ({ templateId, memberId }: { templateId: number; memberId: number }) =>
      fetch(`${API_BASE}/api/band-templates/${templateId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      }).then(r => {
        if (!r.ok) throw new Error("Erro ao remover membro");
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["band-templates"] }),
    onError: (err: Error) =>
      toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const groups = [
    {
      key: "weekend",
      label: "Fins de Semana",
      items: templates.filter(t => t.type === "weekend"),
    },
    {
      key: "thursday",
      label: "Quinta-feira",
      items: templates.filter(t => t.type === "thursday"),
    },
    {
      key: "other",
      label: "Outros",
      items: templates.filter(t => t.type === "other"),
    },
  ].filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Templates de Escala</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bandas reutilizáveis para escalas de cultos.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Novo Template
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && templates.length === 0 && (
        <div className="py-14 text-center border-2 border-dashed rounded-xl border-border">
          <Users2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum template criado.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Crie um template para facilitar a escala dos cultos.
          </p>
        </div>
      )}

      {groups.map(group => (
        <div key={group.key} className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
            {group.label}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {group.items.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                allMembers={allMembers}
                onUpdate={data => updateMutation.mutate({ id: template.id, ...data })}
                onDelete={() => deleteMutation.mutate(template.id)}
                onAddMember={memberId =>
                  addMemberMutation.mutate({ templateId: template.id, memberId })
                }
                onRemoveMember={memberId =>
                  removeMemberMutation.mutate({ templateId: template.id, memberId })
                }
              />
            ))}
          </div>
        </div>
      ))}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Novo Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                placeholder="ex: Banda A, Banda Kenyel"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === "Enter" && createForm.name.trim()) {
                    createMutation.mutate(createForm);
                  }
                }}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={createForm.type}
                onValueChange={v => setCreateForm(f => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekend">Fim de Semana</SelectItem>
                  <SelectItem value="thursday">Quinta-feira</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Notas sobre esta banda..."
                value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate(createForm)}
              disabled={!createForm.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  allMembers,
  onUpdate,
  onDelete,
  onAddMember,
  onRemoveMember,
}: {
  template: BandTemplate;
  allMembers: db.Member[];
  onUpdate: (data: { name?: string; description?: string; isActive?: boolean }) => void;
  onDelete: () => void;
  onAddMember: (memberId: number) => void;
  onRemoveMember: (memberId: number) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(template.name);
  const [addingMemberId, setAddingMemberId] = useState("");

  const availableMembers = allMembers.filter(
    m => !template.members.some(tm => tm.memberId === m.id)
  );

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== template.name) {
      onUpdate({ name: trimmed });
    } else {
      setNameValue(template.name);
    }
    setEditingName(false);
  };

  return (
    <Card className={`border-border/50 transition-opacity duration-200 ${!template.isActive ? "opacity-55" : ""}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          {editingName ? (
            <Input
              className="h-7 text-sm font-semibold flex-1 px-2"
              value={nameValue}
              autoFocus
              onChange={e => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setNameValue(template.name);
                  setEditingName(false);
                }
              }}
            />
          ) : (
            <h3
              className="text-sm font-semibold text-foreground flex-1 cursor-pointer hover:text-primary transition-colors duration-150 truncate"
              onClick={() => setEditingName(true)}
              title="Clique para renomear"
            >
              {template.name}
            </h3>
          )}

          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${
              typeBadgeClasses[template.type] ?? typeBadgeClasses.other
            }`}
          >
            {typeLabels[template.type] ?? template.type}
          </span>

          {!template.isActive && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-secondary text-muted-foreground border-border font-semibold shrink-0">
              Inativo
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingName(true)}>
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdate({ isActive: !template.isActive })}>
                {template.isActive ? "Desativar" : "Ativar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Members */}
        {template.members.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 px-1">
            Nenhum membro adicionado ainda.
          </p>
        ) : (
          <div className="space-y-0.5">
            {[...template.members]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg group hover:bg-accent transition-colors duration-150"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">
                      {member.memberName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight truncate">
                      {member.memberName}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight truncate">
                      {member.role || member.memberDefaultRole || "—"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all duration-150 shrink-0"
                    onClick={() => onRemoveMember(member.memberId)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
          </div>
        )}

        {/* Add member row */}
        {availableMembers.length > 0 && (
          <div className="flex gap-2 pt-1 border-t border-border/40">
            <Select value={addingMemberId} onValueChange={setAddingMemberId}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Adicionar membro..." />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map(m => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    <span>{m.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">— {m.role}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 px-3 shrink-0"
              disabled={!addingMemberId}
              onClick={() => {
                onAddMember(parseInt(addingMemberId));
                setAddingMemberId("");
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
