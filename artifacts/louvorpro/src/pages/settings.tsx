import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, CalendarDays, ShieldCheck, Trash2, Plus,
  KeyRound, Save, CalendarIcon, Settings2, Users2,
} from "lucide-react";
import * as db from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AdminUsers from "./admin-users";
import { BandTemplatesManager } from "@/components/band-templates-manager";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Settings() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = !!profile?.isAdmin;

  // ── Meu Perfil ───────────────────────────────────────────────────────────���──
  const [name, setName] = useState(profile?.name ?? "");

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch(`${API_BASE}/api/profiles/${profile!.id}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao atualizar nome");
      }
      return res.json();
    },
    onSuccess: () => {
      refreshProfile();
      toast({ title: "Nome atualizado com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleResetPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Link enviado!", description: "Verifique seu e-mail para redefinir a senha." });
    }
  };

  // ── Ausências ───────────────────────────────────────────────────────────────
  const [absenceDate, setAbsenceDate] = useState<Date | undefined>(undefined);
  const [absenceReason, setAbsenceReason] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { data: members } = useQuery({ queryKey: ["members"], queryFn: db.listMembers });
  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["absences"],
    queryFn: db.listAbsences,
  });

  const currentMember = members?.find(m => m.email === profile?.email);
  const memberMap = new Map(members?.map(m => [m.id, m]) ?? []);

  const filteredAbsences = isAdmin
    ? absences ?? []
    : (absences ?? []).filter(a => a.memberId === currentMember?.id);

  const absencesByMember = filteredAbsences.reduce((acc, a) => {
    if (!acc.has(a.memberId)) acc.set(a.memberId, []);
    acc.get(a.memberId)!.push(a);
    return acc;
  }, new Map<number, db.Absence[]>());

  const createAbsenceMutation = useMutation({
    mutationFn: (input: { memberId: number; date: string; reason?: string }) =>
      db.createAbsence(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      toast({ title: "Ausência registrada" });
      setAbsenceDate(undefined);
      setAbsenceReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteAbsenceMutation = useMutation({
    mutationFn: db.deleteAbsence,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["absences"] }),
  });

  const handleRegisterAbsence = () => {
    if (!absenceDate || !currentMember) return;
    createAbsenceMutation.mutate({
      memberId: currentMember.id,
      date: format(absenceDate, "yyyy-MM-dd"),
      reason: absenceReason || undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Settings2 className="w-7 h-7 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie seu perfil e preferências.</p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? "grid-cols-4" : "grid-cols-2"} max-w-xl`}>
          <TabsTrigger value="perfil" className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Meu Perfil
          </TabsTrigger>
          <TabsTrigger value="ausencias" className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Ausências
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="templates" className="flex items-center gap-1.5">
              <Users2 className="w-3.5 h-3.5" /> Templates
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Administração
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── Meu Perfil ───────────────────────────────────────────────────── */}
        <TabsContent value="perfil" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seu nome de exibição no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Nome</Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">E-mail</Label>
                <Input
                  id="settings-email"
                  value={profile?.email ?? ""}
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
              </div>
              <Button
                onClick={() => updateNameMutation.mutate(name.trim())}
                disabled={
                  !name.trim() ||
                  name.trim() === profile?.name ||
                  updateNameMutation.isPending
                }
              >
                <Save className="w-4 h-4 mr-2" />
                {updateNameMutation.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Redefina sua senha de acesso ao LouvorPro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={handleResetPassword}>
                <KeyRound className="w-4 h-4 mr-2" />
                Redefinir senha
              </Button>
              <p className="text-xs text-muted-foreground">
                Um link será enviado para{" "}
                <span className="font-medium text-foreground/70">{profile?.email}</span>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Ausências ────────────────────────────────────────────────────── */}
        <TabsContent value="ausencias" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Ausência</CardTitle>
              <CardDescription>
                Informe com antecedência as datas em que você não poderá participar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentMember ? (
                <p className="text-sm text-muted-foreground py-2">
                  Seu cadastro ainda não foi vinculado a um membro da equipe.
                </p>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <div className="space-y-1.5">
                      <Label>Data</Label>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-[200px] justify-start text-left font-normal ${
                              !absenceDate ? "text-muted-foreground" : ""
                            }`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            {absenceDate
                              ? format(absenceDate, "dd/MM/yyyy")
                              : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={absenceDate}
                            onSelect={d => {
                              setAbsenceDate(d);
                              setDatePickerOpen(false);
                            }}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <Label>Motivo (opcional)</Label>
                      <Input
                        placeholder="Ex: viagem, compromisso..."
                        value={absenceReason}
                        onChange={e => setAbsenceReason(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleRegisterAbsence()}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleRegisterAbsence}
                    disabled={!absenceDate || createAbsenceMutation.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {createAbsenceMutation.isPending ? "Registrando..." : "Registrar ausência"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Lista ─────────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {isAdmin ? "Todas as ausências" : "Minhas ausências"}
            </h3>

            {loadingAbsences ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredAbsences.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed rounded-xl border-border">
                <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhuma ausência registrada.</p>
              </div>
            ) : isAdmin ? (
              <div className="space-y-3">
                {Array.from(absencesByMember.entries()).map(([memberId, memberAbsences]) => {
                  const member = memberMap.get(memberId);
                  return (
                    <Card key={memberId} className="border-border/50">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {(member?.name ?? "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {member?.name ?? `Membro #${memberId}`}
                          </p>
                          <Badge variant="secondary" className="text-[10px] ml-1">
                            {memberAbsences.length}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {memberAbsences
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .map(absence => (
                              <AbsenceRow
                                key={absence.id}
                                absence={absence}
                                onDelete={() => deleteAbsenceMutation.mutate(absence.id)}
                              />
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-border/50">
                <CardContent className="p-4 space-y-1">
                  {filteredAbsences
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(absence => (
                      <AbsenceRow
                        key={absence.id}
                        absence={absence}
                        onDelete={() => deleteAbsenceMutation.mutate(absence.id)}
                      />
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── Templates ───────────────────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="templates" className="mt-6">
            <BandTemplatesManager />
          </TabsContent>
        )}

        {/* ─── Administração ────────────────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="admin" className="mt-6">
            <AdminUsers />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function AbsenceRow({
  absence,
  onDelete,
}: {
  absence: db.Absence;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors duration-150">
      <div className="flex items-center gap-2.5 min-w-0">
        <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground shrink-0">
          {format(new Date(absence.date + "T00:00:00"), "dd/MM/yyyy")}
        </span>
        {absence.reason && (
          <span className="text-xs text-muted-foreground truncate">— {absence.reason}</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 transition-colors duration-150"
        onClick={onDelete}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
