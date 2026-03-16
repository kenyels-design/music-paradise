import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as db from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  ListMusic, Plus, Trash2, Pencil, Search, Copy, Check,
  ExternalLink, AlertTriangle, Music2, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const MIGRATION_SQL = `-- Execute no Supabase Dashboard > SQL Editor
CREATE TABLE IF NOT EXISTS free_playlists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE free_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_manage_free_playlists"
  ON free_playlists TO authenticated
  USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS free_playlist_songs (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL REFERENCES free_playlists(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, song_id)
);

ALTER TABLE free_playlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_manage_free_playlist_songs"
  ON free_playlist_songs TO authenticated
  USING (true) WITH CHECK (true);`;

function SetupBanner({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <Card className="border-amber-500/30 bg-amber-950/20">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Configuração necessária</p>
            <p className="text-sm text-amber-400/80 mt-1">
              As tabelas <code className="text-amber-300 bg-amber-900/40 px-1 rounded">free_playlists</code> e{" "}
              <code className="text-amber-300 bg-amber-900/40 px-1 rounded">free_playlist_songs</code> precisam ser criadas.
              Execute o SQL abaixo no Supabase.
            </p>
          </div>
        </div>
        <div className="relative">
          <pre className="text-xs bg-background/60 border border-amber-500/20 rounded-lg p-4 overflow-x-auto text-amber-100/70 whitespace-pre-wrap">
            {sql}
          </pre>
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2 border-amber-500/30 text-amber-400 hover:bg-amber-900/30 h-7 px-2 text-xs"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            {copied ? "Copiado!" : "Copiar SQL"}
          </Button>
        </div>
        <a
          href="https://supabase.com/dashboard/project/_/editor"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          Abrir Supabase SQL Editor <ExternalLink className="w-3 h-3" />
        </a>
      </CardContent>
    </Card>
  );
}

type PlaylistForm = { name: string; description: string };
const emptyForm: PlaylistForm = { name: "", description: "" };

export default function FreePlaylists() {
  const { profile } = useAuth();
  const isAdmin = !!profile?.isAdmin;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["freePlaylists"],
    queryFn: db.listFreePlaylists,
  });
  const { data: allSongs = [] } = useQuery({
    queryKey: ["songs"],
    queryFn: db.listSongs,
  });

  const playlists = result?.data ?? [];
  const tableExists = result?.tableExists ?? true;

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<db.FreePlaylist | null>(null);
  const [form, setForm] = useState<PlaylistForm>(emptyForm);

  const [selectedPlaylist, setSelectedPlaylist] = useState<db.FreePlaylist | null>(null);
  const [songSearch, setSongSearch] = useState("");

  const { data: playlistSongs = [], isLoading: loadingSongs } = useQuery({
    queryKey: ["freePlaylistSongs", selectedPlaylist?.id],
    queryFn: () => db.getFreePlaylistSongs(selectedPlaylist!.id),
    enabled: !!selectedPlaylist,
  });

  const createMutation = useMutation({
    mutationFn: (f: PlaylistForm) => db.createFreePlaylist({ name: f.name.trim(), description: f.description.trim() || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["freePlaylists"] }); toast({ title: "Playlist criada" }); setFormOpen(false); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (f: PlaylistForm) => db.updateFreePlaylist({ id: editItem!.id, name: f.name.trim(), description: f.description.trim() || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["freePlaylists"] }); toast({ title: "Playlist atualizada" }); setFormOpen(false); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: db.deleteFreePlaylist,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["freePlaylists"] }); toast({ title: "Playlist excluída" }); },
  });

  const addSongMutation = useMutation({
    mutationFn: ({ pid, sid }: { pid: number; sid: number }) => db.addSongToFreePlaylist(pid, sid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["freePlaylistSongs", selectedPlaylist?.id] }),
    onError: (e: any) => toast({ title: "Erro ao adicionar música", description: e.message, variant: "destructive" }),
  });

  const removeSongMutation = useMutation({
    mutationFn: ({ pid, sid }: { pid: number; sid: number }) => db.removeSongFromFreePlaylist(pid, sid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["freePlaylistSongs", selectedPlaylist?.id] }),
  });

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (pl: db.FreePlaylist) => { setEditItem(pl); setForm({ name: pl.name, description: pl.description ?? "" }); setFormOpen(true); };
  const handleSave = () => { if (!form.name.trim()) return; if (editItem) updateMutation.mutate(form); else createMutation.mutate(form); };
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const playlistSongIds = new Set(playlistSongs.map(s => s.id));
  const filteredSongs = allSongs.filter(s => {
    const t = songSearch.toLowerCase();
    return s.title.toLowerCase().includes(t) || (s.artist || "").toLowerCase().includes(t);
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Playlists</h1>
          <p className="text-muted-foreground mt-1 text-sm">Agrupe músicas do repertório em listas temáticas</p>
        </div>
        {isAdmin && tableExists && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Nova Playlist
          </Button>
        )}
      </div>

      {!tableExists && <SetupBanner sql={MIGRATION_SQL} />}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : tableExists && playlists.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ListMusic className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Nenhuma playlist criada</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Crie playlists para organizar músicas por tema, evento ou momento do culto.
            </p>
            {isAdmin && (
              <Button className="mt-6" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" /> Criar Primeira Playlist
              </Button>
            )}
          </CardContent>
        </Card>
      ) : tableExists ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map(pl => (
            <Card
              key={pl.id}
              className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
              onClick={() => setSelectedPlaylist(pl)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{pl.name}</h3>
                    {pl.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pl.description}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(pl)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => { if (confirm(`Excluir "${pl.name}"?`)) deleteMutation.mutate(pl.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
                  <ListMusic className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Clique para ver músicas</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* ─── Playlist Detail Dialog ─── */}
      <Dialog open={!!selectedPlaylist} onOpenChange={open => { if (!open) { setSelectedPlaylist(null); setSongSearch(""); } }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-primary" />
              {selectedPlaylist?.name}
            </DialogTitle>
            {selectedPlaylist?.description && (
              <p className="text-sm text-muted-foreground">{selectedPlaylist.description}</p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Songs in playlist */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Músicas ({playlistSongs.length})
              </p>
              {loadingSongs ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : playlistSongs.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-border/50 rounded-lg">
                  <Music2 className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
                  <p className="text-sm text-muted-foreground">Nenhuma música adicionada</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {playlistSongs.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/20 border border-border/30">
                      <span className="text-xs text-muted-foreground/50 w-4 text-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.artist || "—"}{s.key ? ` • ${s.key}` : ""}</p>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => removeSongMutation.mutate({ pid: selectedPlaylist!.id, sid: s.id })}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add songs (admin only) */}
            {isAdmin && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Adicionar Música
                </p>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder="Buscar por título ou artista..."
                    value={songSearch}
                    onChange={e => setSongSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/30">
                  {filteredSongs.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">Nenhuma música encontrada</div>
                  ) : filteredSongs.map(s => {
                    const inPlaylist = playlistSongIds.has(s.id);
                    return (
                      <div key={s.id} className={`flex items-center gap-3 px-3 py-2 ${inPlaylist ? "opacity-40" : "hover:bg-secondary/30"} transition-colors`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.artist || "—"}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs flex-shrink-0"
                          disabled={inPlaylist || addSongMutation.isPending}
                          onClick={() => addSongMutation.mutate({ pid: selectedPlaylist!.id, sid: s.id })}
                        >
                          {inPlaylist ? "Adicionada" : <><Plus className="w-3 h-3 mr-1" />Adicionar</>}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setSelectedPlaylist(null); setSongSearch(""); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Form Dialog ─── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Playlist" : "Nova Playlist"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome *</label>
              <Input
                placeholder="ex: Músicas Novas, Repertório de Ceia..."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descrição <span className="text-muted-foreground font-normal">(Opcional)</span></label>
              <Textarea
                placeholder="Contexto ou objetivo desta playlist"
                className="min-h-[70px] resize-none"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || isSaving}>
              {isSaving ? "Salvando..." : editItem ? "Salvar" : "Criar Playlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
