import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Megaphone, Plus, Trash2, Pin, CalendarOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as db from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const announcementSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  body: z.string().min(5, "Mensagem deve ter pelo menos 5 caracteres"),
  authorName: z.string().min(1, "Nome do autor é obrigatório"),
  isPinned: z.boolean().default(false),
  validUntil: z.string().optional(),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export default function Announcements() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const isAdmin = !!profile?.isAdmin;
  const queryClient = useQueryClient();
  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: db.listAnnouncements,
  });

  const createMutation = useMutation({
    mutationFn: db.createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Aviso publicado" });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: db.deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Aviso excluído" });
    },
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: "", body: "", authorName: "Líder de Louvor", isPinned: false, validUntil: "" },
  });

  const onSubmit = (data: AnnouncementFormValues) => {
    createMutation.mutate({
      title: data.title, body: data.body,
      authorName: data.authorName, isPinned: data.isPinned,
      validUntil: data.validUntil || null,
    });
  };

  const sortedAnnouncements = announcements?.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Avisos</h1>
          <p className="text-muted-foreground">Mantenha a equipe informada com as últimas novidades.</p>
        </div>
        
        {isAdmin && (
          <Button className="hover-elevate shadow-md w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Aviso
          </Button>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publicar Aviso</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assunto</FormLabel>
                    <FormControl><Input placeholder="Mudança no horário do ensaio" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="body" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem</FormLabel>
                    <FormControl><Textarea placeholder="Digite sua mensagem aqui..." className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="authorName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publicado por</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isPinned" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Fixar no Início</FormLabel>
                      <p className="text-sm text-muted-foreground">Mantém este aviso no topo do painel da equipe.</p>
                    </div>
                  </FormItem>
                )} />
                <FormField control={form.control} name="validUntil" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <CalendarOff className="w-3.5 h-3.5 text-muted-foreground" />
                      Data de Expiração <span className="text-muted-foreground font-normal">(Opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Após esta data o aviso desaparece automaticamente.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Publicando..." : "Publicar Aviso"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4 max-w-4xl">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : sortedAnnouncements.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed rounded-xl border-border">
            <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">Nenhum aviso publicado</h3>
            <p className="text-muted-foreground text-sm mb-4">Publique um aviso para manter a equipe informada.</p>
          </div>
        ) : (
          sortedAnnouncements.map((announcement, index) => (
            <motion.div 
              key={announcement.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`overflow-hidden border-border/50 ${announcement.isPinned ? 'border-accent/30 shadow-md shadow-accent/5' : ''}`}>
                <CardHeader className={`pb-2 ${announcement.isPinned ? 'bg-accent/5' : 'bg-secondary/20'}`}>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {announcement.isPinned && <Pin className="w-4 h-4 text-accent fill-accent" />}
                      {announcement.title}
                    </CardTitle>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive -mt-2 -mr-2"
                        onClick={() => {
                          if(confirm('Excluir este aviso?')) deleteMutation.mutate(announcement.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-foreground whitespace-pre-wrap">{announcement.body}</p>
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground font-medium">
                    <span>{announcement.authorName}</span>
                    <div className="flex items-center gap-3">
                      {announcement.validUntil && (
                        <span className="flex items-center gap-1 text-amber-400/80">
                          <CalendarOff className="w-3 h-3" />
                          Expira em {format(parseISO(announcement.validUntil), "d 'de' MMM", { locale: ptBR })}
                        </span>
                      )}
                      <span>{format(parseISO(announcement.createdAt), "d 'de' MMM 'de' yyyy • HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
