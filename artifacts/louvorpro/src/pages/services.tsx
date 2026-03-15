import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { 
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus, ArrowRight, Clock, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as db from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const serviceSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().optional(),
  theme: z.string().optional(),
  status: z.enum(["draft", "confirmed", "completed"]),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const statusLabel: Record<string, string> = {
  draft: "Agendado",
  confirmed: "Confirmado",
  completed: "Realizado",
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function MiniCalendar({ services }: { services: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the start to align with Sunday
  const startPad = getDay(monthStart);
  const paddedDays: (Date | null)[] = [...Array(startPad).fill(null), ...days];

  const eventDates = new Set(
    services?.map(s => s.date) || []
  );

  const hasEvent = (day: Date) => {
    const formatted = format(day, "yyyy-MM-dd");
    return eventDates.has(formatted);
  };

  const getEventStatus = (day: Date) => {
    const formatted = format(day, "yyyy-MM-dd");
    const service = services?.find(s => s.date === formatted);
    return service?.status;
  };

  return (
    <div className="w-72 select-none">
      {/* Header com navegação */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-sm font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground/60 uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7 gap-y-1">
        {paddedDays.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} />;
          const event = hasEvent(day);
          const status = getEventStatus(day);
          const today = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className="flex flex-col items-center justify-center py-1 relative"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium relative transition-colors ${
                  today
                    ? "border border-primary/50 text-primary"
                    : "text-foreground"
                } ${
                  event
                    ? status === "confirmed"
                      ? "bg-primary text-primary-foreground font-bold"
                      : status === "completed"
                      ? "bg-muted text-muted-foreground font-bold"
                      : "bg-primary/20 text-primary font-bold"
                    : "hover:bg-secondary/60"
                }`}
              >
                {format(day, "d")}
              </div>
              {event && (
                <div className={`w-1 h-1 rounded-full mt-0.5 ${
                  status === "confirmed" ? "bg-primary" : "bg-primary/50"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-primary/20 inline-block" /> Rascunho
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-primary inline-block" /> Confirmado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-muted inline-block" /> Realizado
        </span>
      </div>
    </div>
  );
}

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
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: db.deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Culto excluído" });
    },
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: "Culto de Louvor",
      date: format(new Date(), 'yyyy-MM-dd'),
      time: "10:00",
      theme: "",
      status: "draft",
    },
  });

  const onSubmit = (data: ServiceFormValues) => {
    createMutation.mutate({ title: data.title, date: data.date, time: data.time, theme: data.theme, status: data.status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50';
      case 'completed': return 'bg-slate-800 text-slate-400 border-slate-700';
      default: return 'bg-amber-900/30 text-amber-400 border-amber-800/50';
    }
  };

  const sortedServices = services?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Agenda de Cultos</h1>
          <p className="text-muted-foreground">Planeje os próximos cultos e setlists.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Botão Calendário */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors" title="Ver calendário">
                <CalendarIcon className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 bg-card border-border shadow-xl" align="end">
              <MiniCalendar services={services || []} />
            </PopoverContent>
          </Popover>

          {/* Botão Agendar */}
          {isAdmin && (
            <Button className="hover-elevate shadow-md flex-1 sm:flex-none" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Agendar Culto
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agendar Novo Culto</DialogTitle>
              </DialogHeader>
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
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecionar status" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Agendado</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="completed">Realizado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Agendando..." : "Agendar Culto"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : sortedServices.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed rounded-xl border-border">
            <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">Nenhum culto agendado</h3>
            <p className="text-muted-foreground text-sm mb-4">Crie o primeiro culto para começar o planejamento.</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>Agendar Agora</Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedServices.map((service, index) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:border-primary/40 transition-colors group">
                  <CardContent className="p-0 flex flex-col sm:flex-row items-stretch">
                    <div className="bg-secondary/50 p-4 sm:w-44 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-border/50">
                      <p className="text-xs font-bold text-primary uppercase tracking-widest">
                        {format(parseISO(service.date), 'MMM', { locale: ptBR })}
                      </p>
                      <p className="text-4xl font-display font-bold text-foreground -mt-0.5">
                        {format(parseISO(service.date), 'dd')}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {service.time || 'A definir'}
                      </p>
                    </div>
                    
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

                    <div className="p-4 bg-secondary/10 flex items-center justify-end sm:justify-center border-t sm:border-t-0 sm:border-l border-border/50 gap-2">
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={(e) => {
                          e.preventDefault();
                          if(confirm('Excluir este culto?')) deleteMutation.mutate(service.id);
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button asChild className="hover-elevate">
                        <Link href={`/services/${service.id}`}>
                          Planejar <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
