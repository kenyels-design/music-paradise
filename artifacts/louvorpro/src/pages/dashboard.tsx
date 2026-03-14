import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  useListServices, 
  useListMembers, 
  useListSongs, 
  useListAnnouncements 
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, Users, Music, Megaphone, ArrowRight, Clock, Star, 
  AlertCircle, Plus, Trash2, UserX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchAbsences() {
  const res = await fetch(`${BASE}/api/absences`);
  return res.json();
}
async function createAbsence(data: { memberId: number; date: string; reason?: string }) {
  const res = await fetch(`${BASE}/api/absences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}
async function deleteAbsence(id: number) {
  await fetch(`${BASE}/api/absences/${id}`, { method: "DELETE" });
}

const ABSENCES_KEY = ["absences"];

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: services, isLoading: loadingServices } = useListServices();
  const { data: members, isLoading: loadingMembers } = useListMembers();
  const { data: songs, isLoading: loadingSongs } = useListSongs();
  const { data: announcements, isLoading: loadingAnnouncements } = useListAnnouncements();
  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ABSENCES_KEY,
    queryFn: fetchAbsences,
  });

  const createAbsenceMutation = useMutation({
    mutationFn: createAbsence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ABSENCES_KEY });
      toast({ title: "Ausência registrada com sucesso" });
      setAbsenceDialogOpen(false);
      setAbsenceForm({ memberId: "", date: format(new Date(), "yyyy-MM-dd"), reason: "" });
    },
  });

  const deleteAbsenceMutation = useMutation({
    mutationFn: deleteAbsence,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ABSENCES_KEY }),
  });

  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({
    memberId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    reason: "",
  });

  const handleCreateAbsence = () => {
    if (!absenceForm.memberId || !absenceForm.date) return;
    createAbsenceMutation.mutate({
      memberId: Number(absenceForm.memberId),
      date: absenceForm.date,
      reason: absenceForm.reason || undefined,
    });
  };

  const now = new Date();
  const upcomingServices = services
    ?.filter(s => isAfter(parseISO(s.date), now) || s.date === format(now, "yyyy-MM-dd"))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];
  const nextService = upcomingServices[0];
  const pinnedAnnouncements = announcements?.filter(a => a.isPinned) || [];

  // Future absences to show on dashboard
  const upcomingAbsences = (absences || []).filter((a: any) => 
    a.date >= format(now, "yyyy-MM-dd")
  ).sort((a: any, b: any) => a.date.localeCompare(b.date));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const statusLabel: Record<string, string> = {
    draft: "Rascunho",
    confirmed: "Confirmado",
    completed: "Realizado",
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-display text-foreground">Bem-vindo de volta</h1>
          <p className="text-muted-foreground text-lg">Veja o que está acontecendo no seu ministério de louvor.</p>
        </div>

        {/* Botão Informar Ausência */}
        <Dialog open={absenceDialogOpen} onOpenChange={setAbsenceDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-amber-600/40 bg-amber-950/20 text-amber-400 hover:bg-amber-950/40 hover:border-amber-500/60 hover:text-amber-300 transition-colors">
              <UserX className="w-4 h-4 mr-2" />
              Informar Ausência
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-amber-400" />
                Informar Ausência
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Registre quando um membro não poderá participar. Ele ficará marcado como indisponível para escala nessa data.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Membro da Equipe</label>
                <Select
                  value={absenceForm.memberId}
                  onValueChange={v => setAbsenceForm(f => ({ ...f, memberId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o membro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name} — {m.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data da Ausência</label>
                <Input
                  type="date"
                  value={absenceForm.date}
                  onChange={e => setAbsenceForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo (Opcional)</label>
                <Textarea
                  placeholder="ex: Viagem, Compromisso familiar, Doença..."
                  className="min-h-[80px]"
                  value={absenceForm.reason}
                  onChange={e => setAbsenceForm(f => ({ ...f, reason: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                onClick={handleCreateAbsence}
                disabled={!absenceForm.memberId || !absenceForm.date || createAbsenceMutation.isPending}
                className="w-full"
              >
                {createAbsenceMutation.isPending ? "Registrando..." : "Registrar Ausência"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Próximo Culto</p>
                {loadingServices ? <Skeleton className="h-8 w-24" /> : (
                  <h3 className="text-2xl font-bold text-foreground">
                    {nextService ? format(parseISO(nextService.date), "d 'de' MMM", { locale: ptBR }) : 'Nenhum'}
                  </h3>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Calendar className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Membros da Equipe</p>
                {loadingMembers ? <Skeleton className="h-8 w-16" /> : (
                  <h3 className="text-2xl font-bold text-foreground">{members?.length || 0}</h3>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Repertório</p>
                {loadingSongs ? <Skeleton className="h-8 w-16" /> : (
                  <h3 className="text-2xl font-bold text-foreground">{songs?.length || 0}</h3>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Music className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-accent/20 bg-accent/5 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-accent-foreground/80 mb-1">Avisos Fixados</p>
                {loadingAnnouncements ? <Skeleton className="h-8 w-16" /> : (
                  <h3 className="text-2xl font-bold text-accent-foreground">{pinnedAnnouncements.length}</h3>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent-foreground">
                <Megaphone className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Próximo culto */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full border-border/50 shadow-md flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Em Breve
                  </CardTitle>
                  <CardDescription>Próximo culto agendado</CardDescription>
                </div>
                {nextService && (
                  <Button variant="outline" size="sm" asChild className="hover-elevate">
                    <Link href={`/services/${nextService.id}`}>
                      Ver Plano <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {loadingServices ? (
                <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : nextService ? (
                <div className="bg-secondary/30 rounded-xl p-6 border border-border/40">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-1">{nextService.title}</h3>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(parseISO(nextService.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        {nextService.time && ` • ${nextService.time}`}
                      </p>
                    </div>
                    <Badge variant={nextService.status === 'confirmed' ? 'default' : 'secondary'} className="w-fit text-sm px-3 py-1">
                      {statusLabel[nextService.status] || nextService.status}
                    </Badge>
                  </div>
                  {nextService.theme && (
                    <div className="mt-6 pt-6 border-t border-border/50">
                      <p className="text-sm text-muted-foreground mb-1">Tema / Foco</p>
                      <p className="text-foreground font-medium">{nextService.theme}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-xl">
                  <Calendar className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">Nenhum culto agendado</h3>
                  <p className="text-muted-foreground text-sm mb-4">Planeje o próximo culto da sua equipe.</p>
                  <Button asChild><Link href="/services">Agendar Culto</Link></Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Avisos fixados */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-border/50 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Star className="w-5 h-5 text-accent" fill="currentColor" />
                Avisos Fixados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAnnouncements ? (
                <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
              ) : pinnedAnnouncements.length > 0 ? (
                <div className="space-y-4">
                  {pinnedAnnouncements.map(announcement => (
                    <div key={announcement.id} className="p-4 rounded-xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-colors">
                      <h4 className="font-semibold text-foreground mb-1">{announcement.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{announcement.body}</p>
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">Por {announcement.authorName}</p>
                    </div>
                  ))}
                  <Button variant="ghost" className="w-full text-primary hover:bg-primary/5" asChild>
                    <Link href="/announcements">Ver todos os avisos</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Megaphone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhum aviso fixado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Painel de Ausências */}
      <motion.div variants={itemVariants}>
        <Card className="border-amber-600/20 bg-amber-950/5">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                Ausências Registradas
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-600/40 text-amber-400 hover:bg-amber-950/30 hover:border-amber-500/60"
                onClick={() => setAbsenceDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Nova Ausência
              </Button>
            </div>
            <CardDescription>Membros indisponíveis para escala nas datas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAbsences ? (
              <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
            ) : upcomingAbsences.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-amber-600/20 rounded-xl">
                <UserX className="w-10 h-10 text-amber-400/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma ausência futura registrada.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingAbsences.map((absence: any) => (
                  <div
                    key={absence.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-amber-950/10 border border-amber-600/20 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold flex-shrink-0">
                        {absence.memberName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{absence.memberName}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm text-amber-400 font-medium">
                            {format(parseISO(absence.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                          </p>
                          {absence.reason && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <p className="text-sm text-muted-foreground">{absence.reason}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => deleteAbsenceMutation.mutate(absence.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
