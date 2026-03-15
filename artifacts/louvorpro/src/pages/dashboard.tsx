import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as db from "@/lib/db";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar, Clock, Music2, CheckCircle2, XCircle, Youtube,
  BellRing, Megaphone, ArrowRight, Guitar, BookOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 22 } },
};

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const myEmail = profile?.email ?? "";

  const { data: myAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["myUpcomingAssignments", myEmail],
    queryFn: () => db.listMyUpcomingAssignments(myEmail),
    enabled: !!myEmail,
  });

  const nextAssignment = myAssignments[0] ?? null;

  const { data: setlist = [], isLoading: loadingSetlist } = useQuery({
    queryKey: ["setlist", nextAssignment?.serviceId],
    queryFn: () => db.getSetlist(nextAssignment!.serviceId),
    enabled: !!nextAssignment?.serviceId,
  });

  const { data: announcements = [], isLoading: loadingAnnouncements } = useQuery({
    queryKey: ["announcements"],
    queryFn: db.listAnnouncements,
  });

  const confirmMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: db.AssignmentStatus }) =>
      db.updateAssignmentStatus(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["myUpcomingAssignments", myEmail] });
      toast({
        title: status === "confirmado" ? "Presença confirmada!" : "Escala recusada",
        description:
          status === "confirmado"
            ? "Sua presença foi confirmada para o culto."
            : "O líder foi notificado sobre sua recusa.",
      });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar sua resposta.", variant: "destructive" });
    },
  });

  const firstName = profile?.name?.split(" ")[0] ?? "Músico";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Saudação */}
      <motion.div variants={item}>
        <h1 className="text-2xl md:text-3xl font-display text-foreground">
          Olá, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está o seu resumo para o próximo culto.
        </p>
      </motion.div>

      {/* ─── Estado: carregando ─── */}
      {loadingAssignments && (
        <motion.div variants={item} className="space-y-4">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </motion.div>
      )}

      {/* ─── Estado: sem escalas ─── */}
      {!loadingAssignments && !nextAssignment && (
        <motion.div variants={item}>
          <Card className="border-border/40">
            <CardContent className="flex flex-col items-center justify-center text-center py-20 px-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Guitar className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Nenhuma escala programada
              </h2>
              <p className="text-muted-foreground max-w-sm">
                Você não possui escalas no momento. Aproveite para estudar seu instrumento e explorar o repertório!
              </p>
              <Button asChild className="mt-6" variant="outline">
                <Link href="/songs">Ver Repertório <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Hero: Meu Próximo Culto ─── */}
      {!loadingAssignments && nextAssignment && (
        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-primary/20 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-primary">
                  <BellRing className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-widest">Meu Próximo Culto</span>
                </div>
                {nextAssignment.status === "confirmado" ? (
                  <Badge className="bg-green-600/20 text-green-400 border border-green-500/30 px-3 py-1 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Presença Confirmada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-xs px-3 py-1">
                    Aguardando sua confirmação
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Título e data */}
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight">
                  {nextAssignment.serviceTitle}
                </h2>
                <p className="text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap text-sm">
                  <Calendar className="w-4 h-4 flex-shrink-0 text-primary" />
                  <span className="capitalize">
                    {format(parseISO(nextAssignment.serviceDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  {nextAssignment.serviceTime && (
                    <>
                      <span className="text-border">·</span>
                      <Clock className="w-4 h-4 flex-shrink-0 text-primary" />
                      <span>{nextAssignment.serviceTime}</span>
                    </>
                  )}
                </p>
                {nextAssignment.assignmentRole && (
                  <p className="text-xs text-primary font-medium mt-1.5">
                    Sua função: {nextAssignment.assignmentRole}
                  </p>
                )}
                {nextAssignment.serviceTheme && (
                  <p className="text-sm text-muted-foreground mt-1.5">
                    <span className="font-medium text-foreground/70">Tema:</span> {nextAssignment.serviceTheme}
                  </p>
                )}
              </div>

              {/* Botões de confirmação (somente se pendente) */}
              {nextAssignment.status === "pendente" && (
                <div className="flex gap-3 pt-1">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 h-10"
                    disabled={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate({ id: nextAssignment.id, status: "confirmado" })}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirmar Presença
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-10 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-400/60"
                    disabled={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate({ id: nextAssignment.id, status: "recusado" })}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Recusar
                  </Button>
                </div>
              )}

              {/* Link para plano do culto */}
              <Button variant="ghost" size="sm" asChild className="w-fit text-primary hover:bg-primary/10 px-0">
                <Link href={`/services/${nextAssignment.serviceId}`}>
                  Ver plano completo do culto <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Setlist do Próximo Culto ─── */}
      {nextAssignment && (
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-primary" />
                  Setlist do Culto
                </CardTitle>
                {setlist.length > 0 && (
                  <span className="text-xs text-muted-foreground">{setlist.length} música{setlist.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              <CardDescription>Músicas selecionadas para este culto — estude antes!</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSetlist ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : setlist.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-border/40 rounded-xl">
                  <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">O setlist deste culto ainda não foi definido.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {setlist.map((si, idx) => {
                    const key = si.keyOverride ?? si.song.key;
                    return (
                      <div
                        key={si.id}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/20 border border-border/30 hover:bg-secondary/40 transition-colors group"
                      >
                        <span className="text-xs font-mono text-muted-foreground/60 w-5 text-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm leading-tight truncate">
                            {si.song.title}
                          </p>
                          {si.song.artist && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{si.song.artist}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {key && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary font-bold">
                              {key}
                            </Badge>
                          )}
                          {si.song.bpm && (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-mono">
                              {si.song.bpm} BPM
                            </Badge>
                          )}
                          {si.song.youtubeUrl && (
                            <a
                              href={si.song.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-600/20 hover:border-red-400/40 transition-colors"
                              title="Abrir no YouTube"
                            >
                              <Youtube className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Quadro de Avisos ─── */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-yellow-400" />
                Quadro de Avisos
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground px-2">
                <Link href="/announcements">Ver todos <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
            <CardDescription>Comunicados recentes da equipe</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAnnouncements ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8">
                <Megaphone className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum aviso publicado ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {announcements.slice(0, 5).map(a => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl bg-secondary/20 border border-border/30 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {a.isPinned && (
                        <span className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400 ring-2 ring-yellow-400/30" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm leading-tight">{a.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
                        <p className="text-[11px] text-muted-foreground/50 mt-1.5">
                          {format(new Date(a.createdAt), "d 'de' MMM", { locale: ptBR })} · {a.authorName}
                        </p>
                      </div>
                    </div>
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
