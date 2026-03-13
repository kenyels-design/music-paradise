import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Music, Plus, Search, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { 
  useListSongs, 
  useCreateSong, 
  useUpdateSong, 
  useDeleteSong,
  getListSongsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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

const songSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  artist: z.string().optional(),
  key: z.string().optional(),
  bpm: z.coerce.number().optional().nullable(),
  tags: z.string(),
  youtubeUrl: z.string().url("Deve ser uma URL válida").optional().or(z.literal('')),
  notes: z.string().optional(),
});

type SongFormValues = z.infer<typeof songSchema>;

export default function Songs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: songs, isLoading } = useListSongs();
  
  const createMutation = useCreateSong({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
        toast({ title: "Música adicionada ao repertório" });
        setIsDialogOpen(false);
      }
    }
  });

  const updateMutation = useUpdateSong({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
        toast({ title: "Música atualizada" });
        setIsDialogOpen(false);
      }
    }
  });

  const deleteMutation = useDeleteSong({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
        toast({ title: "Música removida" });
      }
    }
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<SongFormValues>({
    resolver: zodResolver(songSchema),
    defaultValues: {
      title: "", artist: "", key: "", bpm: undefined, tags: "", youtubeUrl: "", notes: ""
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
      notes: song.notes || "",
    });
    setEditingId(song.id);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    form.reset({ title: "", artist: "", key: "", bpm: undefined, tags: "", youtubeUrl: "", notes: "" });
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
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
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
          <DialogContent className="sm:max-w-[500px]">
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
                <FormField control={form.control} name="youtubeUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link do YouTube</FormLabel>
                    <FormControl><Input placeholder="https://youtube.com/..." {...field} /></FormControl>
                    <FormMessage />
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
          filteredSongs.map((song, index) => (
            <motion.div 
              key={song.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full border-border/50 hover:border-primary/30 transition-colors group flex flex-col">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div>
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

                  <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
                    {song.youtubeUrl ? (
                      <a href={song.youtubeUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-accent hover:underline flex items-center">
                        Ouvir <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    ) : <span />}
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(song)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if(confirm(`Excluir "${song.title}"?`)) {
                            deleteMutation.mutate({ id: song.id });
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
          ))
        )}
      </div>
    </div>
  );
}
