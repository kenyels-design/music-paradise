import { useState } from "react";
import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, Calendar, Clock, Music, Users, 
  Plus, Trash2, GripVertical, Settings 
} from "lucide-react";
import { 
  useGetService, 
  useGetSetlist, 
  useListServiceAssignments,
  useListSongs,
  useListMembers,
  useAddToSetlist,
  useRemoveFromSetlist,
  useCreateServiceAssignment,
  useDeleteServiceAssignment,
  getGetSetlistQueryKey,
  getListServiceAssignmentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  confirmed: "Confirmado",
  completed: "Realizado",
};

export default function ServiceDetail() {
  const { id } = useParams();
  const serviceId = parseInt(id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: service, isLoading: loadingService } = useGetService(serviceId);
  const { data: setlist, isLoading: loadingSetlist } = useGetSetlist(serviceId);
  const { data: assignments, isLoading: loadingAssignments } = useListServiceAssignments(serviceId);
  const { data: songs } = useListSongs();
  const { data: members } = useListMembers();

  const [addSongOpen, setAddSongOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const addSongMutation = useAddToSetlist({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSetlistQueryKey(serviceId) });
        toast({ title: "Música adicionada ao setlist" });
        setAddSongOpen(false);
      }
    }
  });

  const removeSongMutation = useRemoveFromSetlist({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSetlistQueryKey(serviceId) })
    }
  });

  const addMemberMutation = useCreateServiceAssignment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServiceAssignmentsQueryKey(serviceId) });
        toast({ title: "Membro escalado" });
        setAddMemberOpen(false);
      }
    }
  });

  const removeMemberMutation = useDeleteServiceAssignment({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListServiceAssignmentsQueryKey(serviceId) })
    }
  });

  const [selectedSongId, setSelectedSongId] = useState("");
  const [songKeyOverride, setSongKeyOverride] = useState("");
  
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberRoleOverride, setMemberRoleOverride] = useState("");

  const handleAddSong = () => {
    if (!selectedSongId) return;
    addSongMutation.mutate({
      id: serviceId,
      data: {
        songId: parseInt(selectedSongId),
        order: (setlist?.length || 0) + 1,
        keyOverride: songKeyOverride || null
      }
    });
  };

  const handleAddMember = () => {
    if (!selectedMemberId) return;
    addMemberMutation.mutate({
      id: serviceId,
      data: {
        memberId: parseInt(selectedMemberId),
        role: memberRoleOverride || null
      }
    });
  };

  if (loadingService) {
    return <div className="space-y-4"><Skeleton className="h-10 w-32"/><Skeleton className="h-64 w-full"/></div>;
  }

  if (!service) return <div>Culto não encontrado</div>;

  return (
    <div className="space-y-6 pb-20">
      <Link href="/services" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à Agenda
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-display font-bold text-foreground">{service.title}</h1>
            <Badge variant="secondary">{statusLabel[service.status] || service.status}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4"/>
              {format(parseISO(service.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </div>
            {service.time && <div className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {service.time}</div>}
            {service.theme && <div className="flex items-center gap-1.5"><Settings className="w-4 h-4"/> {service.theme}</div>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="setlist" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="setlist" className="flex items-center gap-2"><Music className="w-4 h-4"/> Setlist</TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2"><Users className="w-4 h-4"/> Equipe</TabsTrigger>
        </TabsList>
        
        <TabsContent value="setlist" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">Músicas ({setlist?.length || 0})</h3>
            <Dialog open={addSongOpen} onOpenChange={setAddSongOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1"/> Adicionar Música</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar ao Setlist</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selecionar Música</label>
                    <Select onValueChange={setSelectedSongId} value={selectedSongId}>
                      <SelectTrigger><SelectValue placeholder="Escolha uma música..." /></SelectTrigger>
                      <SelectContent>
                        {songs?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.title} {s.key ? `(Tom: ${s.key})` : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Substituição de Tom (Opcional)</label>
                    <Input placeholder="ex: G" value={songKeyOverride} onChange={e => setSongKeyOverride(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Deixe em branco para usar o tom padrão da música</p>
                  </div>
                  <Button className="w-full" onClick={handleAddSong} disabled={!selectedSongId || addSongMutation.isPending}>
                    {addSongMutation.isPending ? "Adicionando..." : "Adicionar ao Setlist"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-border/50">
            <CardContent className="p-0">
              {loadingSetlist ? (
                <div className="p-6 text-center text-muted-foreground">Carregando...</div>
              ) : setlist?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border-b last:border-0 border-border/50">
                  Nenhuma música adicionada ainda.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {setlist?.sort((a,b)=>a.order - b.order).map((item, i) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="text-muted-foreground/30 px-2 py-4">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {i + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{item.song.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.song.artist} 
                            {(item.keyOverride || item.song.key) && ` • Tom: ${item.keyOverride || item.song.key}`}
                            {item.song.bpm && ` • ${item.song.bpm} BPM`}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => removeSongMutation.mutate({ id: serviceId, itemId: item.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">Equipe Escalada ({assignments?.length || 0})</h3>
            <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1"/> Escalar Membro</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Escalar Membro da Equipe</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selecionar Membro</label>
                    <Select onValueChange={setSelectedMemberId} value={selectedMemberId}>
                      <SelectTrigger><SelectValue placeholder="Escolha um membro..." /></SelectTrigger>
                      <SelectContent>
                        {members?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.role})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Função neste Culto (Opcional)</label>
                    <Input placeholder="ex: Vocal Principal em vez de apenas Vocal" value={memberRoleOverride} onChange={e => setMemberRoleOverride(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleAddMember} disabled={!selectedMemberId || addMemberMutation.isPending}>
                    {addMemberMutation.isPending ? "Escalando..." : "Escalar para o Culto"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingAssignments ? (
              <Skeleton className="h-20 w-full" />
            ) : assignments?.length === 0 ? (
              <div className="col-span-2 py-12 text-center border-2 border-dashed rounded-xl border-border">
                <p className="text-muted-foreground">Nenhum membro escalado ainda.</p>
              </div>
            ) : (
              assignments?.map(assignment => (
                <Card key={assignment.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                        {assignment.member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{assignment.member.name}</p>
                        <p className="text-sm text-primary font-medium">{assignment.role || assignment.member.role}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeMemberMutation.mutate({ id: serviceId, assignmentId: assignment.id })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
