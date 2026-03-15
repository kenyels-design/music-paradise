import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Music, Music2, Plus, Search, ExternalLink, Pencil, Trash2, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as db from "@/lib/db";
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
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const songSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  artist: z.string().optional(),
  key: z.string().optional(),
  bpm: z.coerce.number().optional().nullable(),
  tags: z.string(),
  youtubeUrl: z.string().url("Deve ser uma URL válida").optional().or(z.literal('')),
  cifraClubUrl: z.string().url("Deve ser uma URL válida").optional().or(z.literal('')),
  notes: z.string().optional(),
  isNew: z.boolean().default(false),
  hasBrass: z.boolean().default(false),
});

type SongFormValues = z.infer<typeof songSchema>;

export default function Songs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: songs, isLoading } = useQuery({
    queryKey: ["songs"],
    queryFn: db.listSongs,
  });

  const createMutation = useMutation({
    mutationFn: db.createSong,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast({ title: "Música adicionada ao repertório" });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: db.updateSong,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast({ title: "Música atualizada" });
      setIsDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: db.deleteSong,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast({ title: "Música removida" });
    },
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<SongFormValues>({
    resolver: zodResolver(songSchema),
    defaultValues: {
      title: "", artist: "", key: "", bpm: undefined, tags: "",
      youtubeUrl: "", cifraClubUrl: "", notes: "", isNew: false, hasBrass: false
    },
  });

  const openEdit = (song: any) => {
    form.reset({
      title: song.title,
      artist: song.artist || "",
      key: song.key || "",
      bpm: song.bpm,
      tags: song.tags.join(", "),
      youtubeUrl: song.youtubeUrl || "",
      cifraClubUrl: song.cifraClubUrl || "",
      notes: song.notes || "",
      isNew: song.isNew || false,
      hasBrass: song.hasBrass || false,
    });
    setEditingId(song.id);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    form.reset({
      title: "", artist: "", key: "", bpm: undefined, tags: "",
      youtubeUrl: "", cifraClubUrl: "", notes: "", isNew: false, hasBrass: false
    });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const onSubmit = (data: SongFormValues) => {
    const payload = {
      ...data,
      bpm: data.bpm || null,
      tags: data.tags.split(",").map(t => t.trim()).filter(Boolean)
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredSongs = songs?.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.artist?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Repertório</h1>
          <p className="text-muted-foreground">Gerencie as músicas, tons e arranjos da equipe.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="hover-elevate shadow-md w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Adicionar Música
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Música" : "Adicionar Música"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl><Input placeholder="Quão Grande És Tu" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="artist" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artista / Compositor</FormLabel>
                    <FormControl><Input placeholder="Ministério Zoe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="key" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tom Padrão</FormLabel>
                      <FormControl><Input placeholder="ex: C, G, Am" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bpm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>BPM</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="120" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="tags" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (separadas por vírgula)</FormLabel>
                    <FormControl><Input placeholder="Louvor, Ceia, Páscoa, Adoração" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Links externos */}
                <div className="space-y-3">
                  <FormField control={form.control} name="youtubeUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        </span>
                        Link do YouTube
                      </FormLabel>
                      <FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cifraClubUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <span className="text-orange-400 font-black text-xs bg-orange-950/40 px-1.5 py-0.5 rounded border border-orange-600/40">CC</span>
                        Link do Cifra Club
                      </FormLabel>
                      <FormControl><Input placeholder="https://www.cifraclub.com.br/..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Música Nova */}
                <FormField control={form.control} name="isNew" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2 text-primary font-semibold">
                        <Sparkles className="w-4 h-4" />
                        Música Nova
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">Marque se a equipe nunca tocou esta música. Ficará destacada para atenção extra.</p>
                    </div>
                  </FormItem>
                )} />

                {/* Com Metais */}
                <FormField control={form.control} name="hasBrass" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-amber-600/30 bg-amber-950/10 p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5 border-amber-600/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2 text-amber-400 font-semibold">
                        <Music2 className="w-4 h-4" />
                        Hino com Metais
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">Marque se este hino é executado com a equipe de metais. A equipe será alertada.</p>
                    </div>
                  </FormItem>
                )} />

                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar Música"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Buscar por título ou artista..." 
          className="pl-10 h-12 text-base rounded-xl border-border/60 bg-secondary/20 focus-visible:bg-background transition-colors"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))
        ) : filteredSongs.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed rounded-xl border-border">
            <Music className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">Nenhuma música encontrada</h3>
            <p className="text-muted-foreground text-sm">Refine a busca ou adicione uma nova música.</p>
          </div>
        ) : (
          filteredSongs.map((song, index) => {
            const isNew = (song as any).isNew;
            const hasBrass = (song as any).hasBrass;
            const cifraClubUrl = (song as any).cifraClubUrl;
            
            return (
              <motion.div 
                key={song.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`h-full border transition-colors group flex flex-col relative overflow-hidden ${
                  isNew 
                    ? 'border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(180_100%_42%_/_0.08)]' 
                    : hasBrass
                    ? 'border-amber-600/40 bg-amber-950/10'
                    : 'border-border/50 hover:border-primary/30'
                }`}>
                  {/* Banner de música nova */}
                  {isNew && (
                    <div className="absolute top-0 left-0 right-0 bg-primary/20 border-b border-primary/30 px-4 py-1.5 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Música Nova — Atenção Extra!</span>
                    </div>
                  )}
                  {/* Banner com metais */}
                  {!isNew && hasBrass && (
                    <div className="absolute top-0 left-0 right-0 bg-amber-500/15 border-b border-amber-600/30 px-4 py-1.5 flex items-center gap-2">
                      <Music2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Hino com Metais</span>
                    </div>
                  )}
                  <CardContent className={`p-5 flex flex-col h-full ${(isNew || hasBrass) ? 'pt-10' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-foreground line-clamp-1" title={song.title}>
                          {song.title}
                        </h3>
                        {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mb-4 mt-2">
                      {song.key && (
                        <div className="bg-secondary px-2 py-1 rounded text-xs font-semibold text-foreground">
                          Tom: {song.key}
                        </div>
                      )}
                      {song.bpm && (
                        <div className="bg-secondary px-2 py-1 rounded text-xs font-semibold text-foreground">
                          {song.bpm} BPM
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mt-auto mb-4">
                      {song.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] py-0 border-none bg-primary/5 text-primary/80">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {song.youtubeUrl && (
                          <a href={song.youtubeUrl} target="_blank" rel="noreferrer"
                            className="text-xs font-medium text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                          >
                            YouTube <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {song.youtubeUrl && cifraClubUrl && (
                          <span className="text-muted-foreground/40 text-xs">·</span>
                        )}
                        {cifraClubUrl && (
                          <a href={cifraClubUrl} target="_blank" rel="noreferrer"
                            className="text-xs font-medium text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
                          >
                            Cifra Club <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(song)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if(confirm(`Excluir "${song.title}"?`)) {
                              deleteMutation.mutate(song.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
