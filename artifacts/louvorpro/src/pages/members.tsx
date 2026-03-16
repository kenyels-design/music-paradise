import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Users, Plus, Pencil, Trash2, Shield, MoreVertical } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as db from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const memberSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  role: z.string().min(2, "Função é obrigatória"),
  isLeader: z.boolean().default(false),
  notes: z.string().optional(),
});

type MemberFormValues = z.infer<typeof memberSchema>;

export default function Members() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const isAdmin = !!profile?.isAdmin;
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: db.listMembers,
  });

  const createMutation = useMutation({
    mutationFn: db.createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Membro adicionado com sucesso" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (err: any) => toast({ title: "Erro ao adicionar membro", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: db.updateMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Membro atualizado com sucesso" });
      setIsDialogOpen(false);
      setEditingId(null);
    },
    onError: (err: any) => toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: db.deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Membro removido" });
    },
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "",
      isLeader: false,
      notes: "",
    },
  });

  const openEdit = (member: any) => {
    form.reset({
      name: member.name,
      email: member.email,
      role: member.role,
      isLeader: member.isLeader,
      notes: member.notes || "",
    });
    setEditingId(member.id);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    form.reset({ name: "", email: "", role: "", isLeader: false, notes: "" });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const onSubmit = (data: MemberFormValues) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getRoleColor = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('vocal') || roleLower.includes('cantor')) return 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800/50';
    if (roleLower.includes('guitar') || roleLower.includes('violão') || roleLower.includes('guitarra') || roleLower.includes('bass') || roleLower.includes('baixo')) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50';
    if (roleLower.includes('drum') || roleLower.includes('bateria') || roleLower.includes('percussão')) return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50';
    if (roleLower.includes('key') || roleLower.includes('teclad') || roleLower.includes('piano')) return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50';
    if (roleLower.includes('sound') || roleLower.includes('som') || roleLower.includes('tech') || roleLower.includes('projeção')) return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50';
    return 'bg-primary/10 text-primary border-primary/20';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Equipe de Louvor</h1>
          <p className="text-muted-foreground">Gerencie os membros e funções da equipe.</p>
        </div>
        
        {isAdmin && (
          <Button onClick={openCreate} className="hover-elevate shadow-md w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Membro
          </Button>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Membro" : "Adicionar Membro"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl><Input placeholder="João da Silva" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl><Input type="email" placeholder="joao@igreja.org" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função Principal</FormLabel>
                    <FormControl><Input placeholder="ex: Vocalista, Guitarrista, Sonoplasta" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isLeader" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Líder da Equipe</FormLabel>
                      <p className="text-sm text-muted-foreground">Marque se este membro pode liderar cultos.</p>
                    </div>
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Disponibilidade, instrumentos alternativos, etc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar Membro"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))
        ) : members?.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl border-border">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">Nenhum membro cadastrado</h3>
            <p className="text-muted-foreground text-sm">Adicione o primeiro membro para começar.</p>
          </div>
        ) : (
          members?.map((member, index) => (
            <motion.div 
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow border-border/50">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-lg border border-border/50">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-foreground leading-tight flex items-center gap-2">
                            {member.name}
                            {member.isLeader && <Shield className="w-4 h-4 text-accent" />}
                          </h3>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-border/50">
                      <Badge variant="outline" className={`${getRoleColor(member.role)} font-medium`}>
                        {member.role}
                      </Badge>
                      
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground flex-shrink-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(member)}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => { if (confirm(`Remover ${member.name} da equipe?`)) deleteMutation.mutate(member.id); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
