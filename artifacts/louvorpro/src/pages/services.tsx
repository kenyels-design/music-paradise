import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, getDay, differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon, Plus, ArrowRight, Clock, Trash2,
  ChevronLeft, ChevronRight, History, CalendarDays, Pencil, MoreVertical,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as db from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

// ─── Schema (sem campo status — ciclo de vida é automático por data) ──────────
const serviceSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().optional(),
  theme: z.string().optional(),
});
type ServiceFormValues = z.infer<typeof serviceSchema>;

const statusLabel: Record<string, string> = {
  draft: "Agendado",
  confirmed: "Confirmado",
  completed: "Realizado",
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── Mini Calendário ─────────────────────────────────────────────────────────
function MiniCalendar({ services }: { services: db.Service[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);
  const paddedDays: (Date | null)[] = [...Array(startPad).fill(null), ...days];
  const eventDates = new Set(services.map(s => s.date));

  const getStatus = (day: Date) => services.find(s => s.date === format(day, "yyyy-MM-dd"))?.status;

  return (
    <div className="w-72 select-none">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setCurrentMonth(p => subMonths(p, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-sm font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setCurrentMonth(p => addMonths(p, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground/60 uppercase py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {paddedDays.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} />;
          const hasEvent = eventDates.has(format(day, "yyyy-MM-dd"));
          const status = getStatus(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className="flex flex-col items-center justify-center py-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                ${isToday ? "border border-primary/50 text-primary" : "text-foreground"}
                ${hasEvent
                  ? status === "confirmed" ? "bg-primary text-primary-foreground font-bold"
                    : status === "completed" ? "bg-muted text-muted-foreground font-bold"
                    : "bg-primary/20 text-primary font-bold"
                  : "hover:bg-secondary/60"
                }`}>
                {format(day, "d")}
              </div>
              {hasEvent && (
                <div className={`w-1 h-1 rounded-full mt-0.5 ${status === "confirmed" ? "bg-primary" : "bg-primary/50"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary/20 inline-block" /> Agendado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary inline-block" /> Confirmado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-muted inline-block" /> Realizado</span>
      </div>
    </div>
  );
}

// ─── Formulário reutilizável ─────────────────────────────────────────────────
function ServiceForm({
  form, onSubmit, isPending, submitLabel,
}: {
  form: ReturnType<typeof useForm<ServiceFormValues>>;
  onSubmit: (v: ServiceFormValues) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Título do Culto</FormLabel>
            <FormControl><Input placeholder="Culto de Louvor" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem>
              <FormLabel>Data</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="time" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário (Opcional)</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="theme" render={({ field }) => (
          <FormItem>
            <FormLabel>Tema / Foco (Opcional)</FormLabel>
            <FormControl><Input placeholder="ex: Graça, Ressurreição, Missão" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <DialogFooter className="pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Services() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const isAdmin = !!profile?.isAdmin;
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: db.listServices,
  });

  const createMutation = useMutation({
    mutationFn: db.createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Culto agendado com sucesso" });
      setIsCreateOpen(false);
      createForm.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ServiceFormValues }) =>
      db.updateService(id, { title: data.title, date: data.date, time: data.time, theme: data.theme }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Culto atualizado" });
      setEditingService(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: db.deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Culto excluído" });
      setDetailService(null);
    },
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingService, setEditingService] = useState<db.Service | null>(null);
  const [detailService, setDetailService] = useState<db.Service | null>(null);

  const createForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { title: "Culto de Louvor", date: format(new Date(), "yyyy-MM-dd"), time: "10:00", theme: "" },
  });

  const editForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { title: "", date: "", time: "", theme: "" },
  });

  useEffect(() => {
    if (editingService) {
      editForm.reset({
        title: editingService.title,
        date: editingService.date,
        time: editingService.time || "",
        theme: editingService.theme || "",
      });
    }
  }, [editingService]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-emerald-900/30 text-emerald-400 border-emerald-800/50";
      case "completed": return "bg-slate-800 text-slate-400 border-slate-700";
      default: return "bg-amber-900/30 text-amber-400 border-amber-800/50";
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const allServices = [...(services || [])].sort((a, b) => a.date.localeCompare(b.date));
  const upcomingServices = allServices.filter(s => s.date >= today);
  const pastServices = [...allServices].filter(s => s.date < today).reverse().slice(0, 30);

  const nearServices = upcomingServices.filter(s => differenceInCalendarDays(parseISO(s.date), new Date()) <= 20);
  const farServices = upcomingServices.filter(s => differenceInCalendarDays(parseISO(s.date), new Date()) > 20);

  const handleDelete = (id: number) => {
    if (confirm("Excluir este culto?")) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Agenda de Cultos</h1>
          <p className="text-muted-foreground">Planeje os próximos cultos e setlists.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="border-border/60 hover:border-primary/50 hover:bg-primary/5" title="Ver calendário">
                <CalendarIcon className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 bg-card border-border shadow-xl" align="end">
              <MiniCalendar services={services || []} />
            </PopoverContent>
          </Popover>

          {isAdmin && (
            <Button className="hover-elevate shadow-md flex-1 sm:flex-none" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Agendar Culto
            </Button>
          )}
        </div>
      </div>

      {/* ── Dialog: Criar Culto ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Novo Culto</DialogTitle>
          </DialogHeader>
          <ServiceForm
            form={createForm}
            onSubmit={v => createMutation.mutate({ title: v.title, date: v.date, time: v.time, theme: v.theme, status: "draft" })}
            isPending={createMutation.isPending}
            submitLabel="Agendar Culto"
          />
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar Culto ── */}
      <Dialog open={!!editingService} onOpenChange={open => !open && setEditingService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Culto</DialogTitle>
          </DialogHeader>
          <ServiceForm
            form={editForm}
            onSubmit={v => editingService && updateMutation.mutate({ id: editingService.id, data: v })}
            isPending={updateMutation.isPending}
            submitLabel="Salvar Alterações"
          />
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detalhe (card compacto clicado) ── */}
      <Dialog open={!!detailService} onOpenChange={open => !open && setDetailService(null)}>
        <DialogContent className="sm:max-w-[420px]">
          {detailService && (
            <>
              <DialogHeader>
                <DialogTitle>{detailService.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  {format(parseISO(detailService.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
                {detailService.time && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    {detailService.time}
                  </div>
                )}
                {detailService.theme && (
                  <p className="text-sm text-foreground/80 bg-secondary/40 rounded-lg px-3 py-2">{detailService.theme}</p>
                )}
                <Badge variant="outline" className={`${getStatusColor(detailService.status)} w-fit`}>
                  {statusLabel[detailService.status] || detailService.status}
                </Badge>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                {isAdmin && (
                  <>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(detailService.id)}
                      disabled={deleteMutation.isPending} className="w-full sm:w-auto">
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditingService(detailService); setDetailService(null); }}
                      className="w-full sm:w-auto">
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                    </Button>
                  </>
                )}
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link href={`/services/${detailService.id}`}>
                    Planejar <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Abas ── */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Próximos
              {upcomingServices.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary/20 text-primary font-bold rounded-full px-1.5 py-0.5">{upcomingServices.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
              {pastServices.length > 0 && (
                <span className="ml-1 text-[10px] bg-secondary text-muted-foreground font-bold rounded-full px-1.5 py-0.5">{pastServices.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── ABA PRÓXIMOS ── */}
          <TabsContent value="upcoming">
            {upcomingServices.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed rounded-xl border-border">
                <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground">Nenhum culto futuro</h3>
                <p className="text-muted-foreground text-sm mb-4">Agende o próximo culto para começar o planejamento.</p>
                {isAdmin && <Button variant="outline" onClick={() => setIsCreateOpen(true)}>Agendar Agora</Button>}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cards completos — até 20 dias */}
                {nearServices.length > 0 && (
                  <div className="grid gap-4">
                    {nearServices.map((service, index) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        index={index}
                        isAdmin={isAdmin}
                        getStatusColor={getStatusColor}
                        onEdit={() => setEditingService(service)}
                        onDelete={() => handleDelete(service.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Grid compacto — além de 20 dias */}
                {farServices.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Eventos Futuros
                      <span className="text-muted-foreground/50">• mais de 20 dias</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {farServices.map((service, index) => (
                        <CompactCard
                          key={service.id}
                          service={service}
                          index={index}
                          getStatusColor={getStatusColor}
                          onClick={() => setDetailService(service)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── ABA HISTÓRICO ── */}
          <TabsContent value="history">
            {pastServices.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed rounded-xl border-border">
                <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground">Nenhum culto realizado</h3>
                <p className="text-muted-foreground text-sm">O histórico aparece aqui após as datas passarem.</p>
              </div>
            ) : (
              <>
                {pastServices.length === 30 && (
                  <p className="text-xs text-muted-foreground mb-3 px-1">Exibindo os últimos 30 cultos realizados.</p>
                )}
                <div className="grid gap-4">
                  {pastServices.map((service, index) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      index={index}
                      isAdmin={isAdmin}
                      getStatusColor={getStatusColor}
                      onEdit={() => setEditingService(service)}
                      onDelete={() => handleDelete(service.id)}
                      dimmed
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Card completo ───────────────────────────────────────────────────────────
function ServiceCard({
  service, index, isAdmin, getStatusColor, onEdit, onDelete, dimmed = false,
}: {
  service: db.Service;
  index: number;
  isAdmin: boolean;
  getStatusColor: (s: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  dimmed?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className={`overflow-hidden hover:border-primary/40 transition-colors group ${dimmed ? "opacity-70 hover:opacity-100" : ""}`}>
        <CardContent className="p-0 flex flex-col sm:flex-row items-stretch">
          {/* Data */}
          <div className={`p-4 sm:w-44 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-border/50 ${dimmed ? "bg-secondary/20" : "bg-secondary/50"}`}>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">
              {format(parseISO(service.date), "MMM", { locale: ptBR })}
            </p>
            <p className="text-4xl font-display font-bold text-foreground -mt-0.5">
              {format(parseISO(service.date), "dd")}
            </p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {service.time || "A definir"}
            </p>
          </div>

          {/* Detalhes */}
          <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-foreground">{service.title}</h3>
                {service.theme && <p className="text-muted-foreground mt-1 text-sm">{service.theme}</p>}
              </div>
              <Badge variant="outline" className={`${getStatusColor(service.status)} ml-2 flex-shrink-0`}>
                {statusLabel[service.status] || service.status}
              </Badge>
            </div>
          </div>

          {/* Ações */}
          <div className="p-4 bg-secondary/10 flex items-center justify-end sm:justify-center border-t sm:border-t-0 sm:border-l border-border/50 gap-2">
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit} className="gap-2">
                    <Pencil className="w-4 h-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button asChild className="hover-elevate">
              <Link href={`/services/${service.id}`}>
                {dimmed ? "Ver" : "Planejar"} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Card compacto (grid, eventos distantes) ─────────────────────────────────
function CompactCard({
  service, index, getStatusColor, onClick,
}: {
  service: db.Service;
  index: number;
  getStatusColor: (s: string) => string;
  onClick: () => void;
}) {
  const daysLeft = differenceInCalendarDays(parseISO(service.date), new Date());
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5 active:scale-95">
        <CardContent className="p-4 flex flex-col items-center text-center gap-1">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
            {format(parseISO(service.date), "MMM", { locale: ptBR })}
          </p>
          <p className="text-3xl font-display font-bold text-foreground leading-none">
            {format(parseISO(service.date), "dd")}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {format(parseISO(service.date), "yyyy")}
          </p>
          <p className="text-xs font-medium text-foreground/80 line-clamp-2 mt-1 leading-tight">
            {service.title}
          </p>
          <span className={`mt-1 text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(service.status)}`}>
            {daysLeft}d
          </span>
        </CardContent>
      </Card>
    </motion.div>
  );
}
