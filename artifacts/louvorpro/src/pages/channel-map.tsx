import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as db from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Mic2, Plus, Trash2, Pencil, Copy, Check,
  AlertTriangle, ExternalLink,
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
CREATE TABLE IF NOT EXISTS channel_maps (
  id SERIAL PRIMARY KEY,
  instrument VARCHAR(255) NOT NULL,
  input_channel INTEGER,
  output_channel INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE channel_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_manage_channel_maps"
  ON channel_maps TO authenticated
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
              A tabela <code className="text-amber-300 bg-amber-900/40 px-1 rounded">channel_maps</code> ainda não existe no banco de dados.
              Execute o SQL abaixo no painel do Supabase para ativá-la.
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

type FormState = {
  instrument: string;
  inputChannel: string;
  outputChannel: string;
  notes: string;
};

const emptyForm: FormState = { instrument: "", inputChannel: "", outputChannel: "", notes: "" };

export default function ChannelMapPage() {
  const { profile } = useAuth();
  const isAdmin = !!profile?.isAdmin;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["channelMap"],
    queryFn: db.listChannelMap,
  });

  const channels = result?.data ?? [];
  const tableExists = result?.tableExists ?? true;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<db.ChannelMap | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: db.ChannelMap) => {
    setEditItem(item);
    setForm({
      instrument: item.instrument,
      inputChannel: item.inputChannel?.toString() ?? "",
      outputChannel: item.outputChannel?.toString() ?? "",
      notes: item.notes ?? "",
    });
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (f: FormState) =>
      db.createChannelMap({
        instrument: f.instrument.trim(),
        inputChannel: f.inputChannel ? parseInt(f.inputChannel) : null,
        outputChannel: f.outputChannel ? parseInt(f.outputChannel) : null,
        notes: f.notes.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channelMap"] });
      toast({ title: "Canal adicionado" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (f: FormState) =>
      db.updateChannelMap({
        id: editItem!.id,
        instrument: f.instrument.trim(),
        inputChannel: f.inputChannel ? parseInt(f.inputChannel) : null,
        outputChannel: f.outputChannel ? parseInt(f.outputChannel) : null,
        notes: f.notes.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channelMap"] });
      toast({ title: "Canal atualizado" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: db.deleteChannelMap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channelMap"] });
      toast({ title: "Canal removido" });
    },
  });

  const handleSave = () => {
    if (!form.instrument.trim()) return;
    if (editItem) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Mapa de Canais</h1>
          <p className="text-muted-foreground mt-1 text-sm">Stage plot e roteamento de instrumentos</p>
        </div>
        {isAdmin && tableExists && (
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Canal
          </Button>
        )}
      </div>

      {!tableExists && <SetupBanner sql={MIGRATION_SQL} />}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : tableExists && channels.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mic2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Nenhum canal cadastrado</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Cadastre os instrumentos e seus canais de entrada/saída para montar o stage plot do ministério.
            </p>
            {isAdmin && (
              <Button className="mt-6" onClick={openAdd}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Primeiro Canal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : tableExists && channels.length > 0 ? (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mic2 className="w-4 h-4 text-primary" />
              Canais ({channels.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Canal In</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instrumento</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Canal Out</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Observações</th>
                    {isAdmin && <th className="px-4 py-3 w-20" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {channels.map((ch) => (
                    <tr key={ch.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        {ch.inputChannel != null ? (
                          <Badge variant="outline" className="border-primary/30 text-primary font-mono font-bold min-w-[2rem] justify-center">
                            {ch.inputChannel}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{ch.instrument}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {ch.outputChannel != null ? (
                          <Badge variant="secondary" className="font-mono text-xs">
                            {ch.outputChannel}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-muted-foreground text-xs line-clamp-1">{ch.notes || "—"}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(ch)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMutation.mutate(ch.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Canal" : "Novo Canal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Instrumento / Fonte *</label>
              <Input
                placeholder="ex: Violão, Baixo, Vocal 1..."
                value={form.instrument}
                onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Canal de Entrada</label>
                <Input
                  type="number"
                  min={1}
                  max={64}
                  placeholder="ex: 1"
                  value={form.inputChannel}
                  onChange={e => setForm(f => ({ ...f, inputChannel: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Canal de Saída</label>
                <Input
                  type="number"
                  min={1}
                  max={64}
                  placeholder="ex: 3"
                  value={form.outputChannel}
                  onChange={e => setForm(f => ({ ...f, outputChannel: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                placeholder="Tipo de cabo, phantom power, etc."
                className="min-h-[70px] resize-none"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.instrument.trim() || isSaving}>
              {isSaving ? "Salvando..." : editItem ? "Salvar Alterações" : "Adicionar Canal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
