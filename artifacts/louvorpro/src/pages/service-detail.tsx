import { useState } from "react";
import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, Calendar, Clock, Music, Users, 
  Plus, Trash2, GripVertical, Settings, ListMusic,
  Youtube, ExternalLink, Sparkles, AlertTriangle
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const ABSENCES_KEY = ["absences"];
async function fetchAbsences() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/api/absences`);
  return res.json();
}
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const statusLabel: Record<string, string> = {
  draft: "Agendado",
  confirmed: "Confirmado",
  completed: "Realizado",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchPlaylists(serviceId: number) {
  const res = await fetch(`${BASE}/api/services/${serviceId}/playlists`);
  return res.json();
}

async function createPlaylist(serviceId: number, data: any) {
  const res = await fetch(`${BASE}/api/services/${serviceId}/playlists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function deletePlaylist(id: number) {
  await fetch(`${BASE}/api/playlists/${id}`, { method: "DELETE" });
}

type SpotifyIcon = React.FC<{ className?: string }>;
const SpotifyIcon: SpotifyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

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
  const { data: absences } = useQuery({ queryKey: ABSENCES_KEY, queryFn: fetchAbsences });

  // IDs de membros ausentes na data do culto
  const absentMemberIds = new Set(
    (absences || [])
      .filter((a: any) => service && a.date === service.date)
      .map((a: any) => a.memberId)
  );

  const playlistsKey = ["playlists", serviceId];
  const { data: playlists, isLoading: loadingPlaylists } = useQuery({
    queryKey: playlistsKey,
    queryFn: () => fetchPlaylists(serviceId),
  });

  const createPlaylistMutation = useMutation({
    mutationFn: (data: any) => createPlaylist(serviceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playlistsKey });
      toast({ title: "Playlist adicionada" });
      setAddPlaylistOpen(false);
      setPlaylistForm({ name: "", notes: "", spotifyUrl: "", youtubeUrl: "" });
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: (id: number) => deletePlaylist(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playlistsKey }),
  });

  const [addSongOpen, setAddSongOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addPlaylistOpen, setAddPlaylistOpen] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({ name: "", notes: "", spotifyUrl: "", youtubeUrl: "" });

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

  const handleAddPlaylist = () => {
    if (!playlistForm.name.trim()) return;
    createPlaylistMutation.mutate(playlistForm);
  };

  if (loadingService) {
    return <div className="space-y-4"><Skeleton className="h-10 w-32"/><Skeleton className="h-64 w-full"/></div>;
  }

  if (!service) return <div>Culto não encontrado</div>;

  const songMap = new Map(songs?.map(s => [s.id, s]) || []);

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
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="setlist" className="flex items-center gap-2"><Music className="w-4 h-4"/> Setlist</TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2"><Users className="w-4 h-4"/> Equipe</TabsTrigger>
          <TabsTrigger value="playlists" className="flex items-center gap-2"><ListMusic className="w-4 h-4"/> Playlists</TabsTrigger>
        </TabsList>
        
        {/* ─── SETLIST ─── */}
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
                        {songs?.map(s => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            <span className="flex items-center gap-2">
                              {(s as any).isNew && <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                              {s.title} {s.key ? `(Tom: ${s.key})` : ''}
                            </span>
                          </SelectItem>
                        ))}
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
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma música adicionada ainda.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {setlist?.sort((a,b)=>a.order - b.order).map((item, i) => {
                    const songData = songMap.get(item.song?.id || 0) || item.song;
                    const isNew = (songData as any)?.isNew;
                    return (
                      <div key={item.id} className={`p-4 flex items-center justify-between transition-colors group ${isNew ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-secondary/30'}`}>
                        <div className="flex items-center gap-4">
                          <div className="text-muted-foreground/30 px-2 py-4">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                              {item.song.title}
                              {isNew && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/15 border border-primary/30 rounded-full px-2 py-0.5">
                                  <Sparkles className="w-2.5 h-2.5" /> Nova
                                </span>
                              )}
                            </h4>
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── EQUIPE ─── */}
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
                  {absentMemberIds.size > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/20 border border-amber-600/30 text-amber-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-xs">Membros com ⚠ têm ausência registrada nesta data e estão indisponíveis.</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selecionar Membro</label>
                    <Select onValueChange={setSelectedMemberId} value={selectedMemberId}>
                      <SelectTrigger><SelectValue placeholder="Escolha um membro..." /></SelectTrigger>
                      <SelectContent>
                        {members?.map(m => {
                          const isAbsent = absentMemberIds.has(m.id);
                          return (
                            <SelectItem key={m.id} value={m.id.toString()}>
                              <span className="flex items-center gap-2">
                                {isAbsent && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                                <span className={isAbsent ? "text-amber-400" : ""}>{m.name}</span>
                                <span className="text-muted-foreground text-xs">({m.role})</span>
                                {isAbsent && <span className="text-xs text-amber-400 font-medium ml-1">— Indisponível</span>}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedMemberId && absentMemberIds.has(Number(selectedMemberId)) && (
                      <p className="text-xs text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Este membro registrou ausência nesta data. Você ainda pode escalá-lo se necessário.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Função neste Culto (Opcional)</label>
                    <Input placeholder="ex: Vocal Principal" value={memberRoleOverride} onChange={e => setMemberRoleOverride(e.target.value)} />
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

        {/* ─── PLAYLISTS ─── */}
        <TabsContent value="playlists" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">Playlists ({playlists?.length || 0})</h3>
            <Dialog open={addPlaylistOpen} onOpenChange={setAddPlaylistOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1"/> Adicionar Playlist</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader><DialogTitle>Nova Playlist</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome do Evento / Playlist</label>
                    <Input 
                      placeholder="ex: Culto de Páscoa 2026" 
                      value={playlistForm.name} 
                      onChange={e => setPlaylistForm(f => ({ ...f, name: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Observações (Opcional)</label>
                    <Textarea 
                      placeholder="Informações sobre a playlist, ordem das músicas, etc." 
                      className="min-h-[80px]"
                      value={playlistForm.notes} 
                      onChange={e => setPlaylistForm(f => ({ ...f, notes: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <SpotifyIcon className="w-4 h-4 text-green-400" /> Link do Spotify
                    </label>
                    <Input 
                      placeholder="https://open.spotify.com/playlist/..." 
                      value={playlistForm.spotifyUrl} 
                      onChange={e => setPlaylistForm(f => ({ ...f, spotifyUrl: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-red-400" /> Link do YouTube
                    </label>
                    <Input 
                      placeholder="https://youtube.com/playlist?list=..." 
                      value={playlistForm.youtubeUrl} 
                      onChange={e => setPlaylistForm(f => ({ ...f, youtubeUrl: e.target.value }))} 
                    />
                  </div>
                  <DialogFooter>
                    <Button 
                      className="w-full" 
                      onClick={handleAddPlaylist} 
                      disabled={!playlistForm.name.trim() || createPlaylistMutation.isPending}
                    >
                      {createPlaylistMutation.isPending ? "Salvando..." : "Salvar Playlist"}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingPlaylists ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : playlists?.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed rounded-xl border-border">
              <ListMusic className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Nenhuma playlist adicionada.</p>
              <p className="text-muted-foreground/70 text-sm mt-1">Adicione playlists do Spotify ou YouTube para este culto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {playlists?.map((playlist: any) => (
                <Card key={playlist.id} className="border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-base mb-1">{playlist.name}</h4>
                        {playlist.notes && (
                          <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{playlist.notes}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2">
                          {playlist.spotifyUrl && (
                            <a 
                              href={playlist.spotifyUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-3 py-1.5 hover:bg-green-400/20 transition-colors"
                            >
                              <SpotifyIcon className="w-3.5 h-3.5" />
                              Abrir no Spotify
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>
                          )}
                          {playlist.youtubeUrl && (
                            <a 
                              href={playlist.youtubeUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-3 py-1.5 hover:bg-red-400/20 transition-colors"
                            >
                              <Youtube className="w-3.5 h-3.5" />
                              Abrir no YouTube
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => deletePlaylistMutation.mutate(playlist.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
