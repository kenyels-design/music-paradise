import { useState } from "react";
import { BookOpen, Sparkles, Copy, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface FindSongHelperProps {
  songs: Array<{
    id: number;
    title: string;
    artist?: string | null;
    key?: string | null;
    tags?: string[];
  }>;
}

interface Suggestion {
  title: string;
  reason: string;
}

interface MatchedSuggestion {
  song: FindSongHelperProps["songs"][0];
  reason: string;
}

export function FindSongHelper({ songs }: FindSongHelperProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [verse, setVerse] = useState("");
  const [soloFilter, setSoloFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchedSuggestion[] | null>(null);
  const [empty, setEmpty] = useState(false);

  const handleSearch = async () => {
    if (!verse.trim()) return;

    // Apply solo filter if provided
    let pool = songs;
    const soloName = soloFilter.trim().toLowerCase();
    if (soloName) {
      pool = songs.filter((s) =>
        s.tags?.some((tag) => tag.toLowerCase().includes(`solo ${soloName}`))
      );
      if (pool.length === 0) {
        toast({
          title: `Nenhuma música encontrada com "Solo ${soloFilter.trim()}" nas tags.`,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    setResults(null);
    setEmpty(false);

    try {
      const songList = pool.map((s) => `"${s.title}"`).join(", ");
      const soloContext = soloName
        ? `\nContexto adicional: estas músicas são especificamente as que ${soloFilter.trim()} canta como solista.`
        : "";

      const prompt = `Tenho o seguinte repertório de músicas gospel: ${songList}.${soloContext}

Com base no versículo ou passagem bíblica a seguir, quais músicas do meu repertório têm conexão temática forte?

Versículo: "${verse.trim()}"

Responda APENAS com JSON válido (sem markdown, sem texto adicional), neste formato:
[
  { "title": "título exato da música do repertório", "reason": "justificativa em 1-2 frases" }
]

Retorne no máximo 5 sugestões. Use apenas títulos que existam exatamente na lista fornecida. Se não houver conexão forte, retorne [].`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: "Você é um assistente de música gospel. Responda sempre em JSON válido.",
          messages: [{ role: "user", content: prompt }],
          tools: [{ type: "web_search_20260209", name: "web_search" }],
        }),
      });

      const data = await response.json();
      const textBlock = data.content?.find((c: { type: string }) => c.type === "text");
      const rawText: string = textBlock?.text ?? "";
      const parsed: Suggestion[] = JSON.parse(
        rawText.replace(/```json|```/g, "").trim()
      );

      const matched: MatchedSuggestion[] = [];
      for (const suggestion of parsed) {
        const found = pool.find(
          (s) => s.title.toLowerCase() === suggestion.title.toLowerCase()
        );
        if (found) matched.push({ song: found, reason: suggestion.reason });
      }

      if (matched.length === 0) {
        setEmpty(true);
      } else {
        setResults(matched);
      }
    } catch {
      toast({ title: "Erro ao buscar sugestões", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (title: string) => {
    navigator.clipboard.writeText(title);
    toast({ title: "Copiado!" });
  };

  const handleClose = () => {
    setOpen(false);
    setVerse("");
    setSoloFilter("");
    setResults(null);
    setEmpty(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex-1 sm:flex-none border-primary/30 text-primary hover:bg-primary/10"
      >
        <BookOpen className="w-4 h-4 mr-2" /> Buscar por Versículo
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-120">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Buscar Músicas por Versículo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Versículo ou passagem bíblica
              </label>
              <Textarea
                placeholder={`Ex: "O Senhor é o meu pastor" (Salmos 23:1) ou João 3:16`}
                value={verse}
                onChange={(e) => setVerse(e.target.value)}
                className="resize-none min-h-20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Quem vai solar? <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                placeholder="Ex: Kenyel, Eduarda..."
                value={soloFilter}
                onChange={(e) => setSoloFilter(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Filtra músicas com "Solo [nome]" nas tags
              </p>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Consultando o repertório...
              </div>
            )}

            {empty && (
              <div className="py-4 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                Não encontrei músicas com conexão forte para este versículo. Tente outro.
              </div>
            )}

            {results && results.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {results.length} sugestão{results.length !== 1 ? "ões" : ""} encontrada{results.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {results.map(({ song, reason }) => (
                    <div
                      key={song.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{song.title}</p>
                        {(song.artist || song.key) && (
                          <p className="text-xs text-muted-foreground">
                            {song.artist}
                            {song.artist && song.key ? ` · Tom: ${song.key}` : song.key ? `Tom: ${song.key}` : ""}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">{reason}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                        onClick={() => handleCopy(song.title)}
                        title="Copiar nome"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={handleClose} className="hover:bg-accent">
              Fechar
            </Button>
            <Button
              onClick={handleSearch}
              disabled={!verse.trim() || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
