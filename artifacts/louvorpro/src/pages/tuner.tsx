import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Guitar } from "lucide-react";
import { Button } from "@/components/ui/button";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function freqToNote(freq: number): { note: string; octave: number; cents: number; midiNote: number } {
  const midiNote = 12 * Math.log2(freq / 440) + 69;
  const rounded = Math.round(midiNote);
  const cents = (midiNote - rounded) * 100;
  const octave = Math.floor(rounded / 12) - 1;
  const noteIndex = ((rounded % 12) + 12) % 12;
  return { note: NOTE_NAMES[noteIndex], octave, cents, midiNote: rounded };
}

function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;
  let foundGoodCorrelation = false;
  const correlations = new Array(MAX_SAMPLES);

  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let lastCorrelation = 1;
  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    correlations[offset] = correlation;

    if (foundGoodCorrelation && correlation < lastCorrelation) {
      let shift = 0;
      if (offset > 1 && offset < MAX_SAMPLES - 1) {
        const d1 = correlations[offset - 1];
        const d2 = correlations[offset];
        const d3 = correlations[offset + 1];
        shift = (d3 - d1) / (2 * (2 * d2 - d1 - d3));
      }
      return sampleRate / (offset + shift);
    }
    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    }
    lastCorrelation = correlation;
  }
  if (bestOffset !== -1) return sampleRate / bestOffset;
  return -1;
}

type NoteInfo = {
  note: string;
  octave: number;
  cents: number;
  freq: number;
};

export default function Tuner() {
  const [active, setActive] = useState(false);
  const [noteInfo, setNoteInfo] = useState<NoteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const bufferRef = useRef<Float32Array>(new Float32Array(2048));

  const tick = useCallback(() => {
    if (!analyserRef.current) return;
    analyserRef.current.getFloatTimeDomainData(bufferRef.current);
    const freq = autoCorrelate(bufferRef.current, audioCtxRef.current!.sampleRate);
    if (freq > 40 && freq < 4200) {
      const info = freqToNote(freq);
      setNoteInfo({ ...info, freq });
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startListening = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.fftSize);
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      setActive(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Permissão de microfone negada. Verifique as configurações do navegador.");
    }
  };

  const stopListening = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setActive(false);
    setNoteInfo(null);
  };

  useEffect(() => () => stopListening(), []);

  const cents = noteInfo?.cents ?? 0;
  const isInTune = Math.abs(cents) <= 5;
  const needleAngle = Math.max(-45, Math.min(45, (cents / 50) * 45));
  const indicatorColor = isInTune ? "hsl(142 71% 45%)" : "hsl(var(--primary))";

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Guitar className="w-8 h-8 text-primary" />
          Afinador Cromático
        </h1>
        <p className="text-muted-foreground">Afine seu instrumento usando o microfone do dispositivo.</p>
      </div>

      {/* Display principal */}
      <div className={`rounded-2xl border transition-all duration-500 overflow-hidden ${
        isInTune && active && noteInfo
          ? "border-green-500/50 bg-green-950/20 shadow-[0_0_40px_hsl(142_71%_45%_/_0.12)]"
          : "border-border/50 bg-card"
      }`}>
        <div className="p-8 flex flex-col items-center gap-6">
          
          {/* Note display */}
          <div className="text-center min-h-[120px] flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {noteInfo ? (
                <motion.div
                  key={noteInfo.note + noteInfo.octave}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className="flex items-start gap-1">
                    <span
                      className="text-8xl font-display font-bold leading-none transition-colors duration-300"
                      style={{ color: indicatorColor }}
                    >
                      {noteInfo.note}
                    </span>
                    <span className="text-2xl text-muted-foreground mt-3 font-medium">
                      {noteInfo.octave}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground mt-2 font-mono">
                    {noteInfo.freq.toFixed(1)} Hz
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="text-6xl font-display font-bold text-muted-foreground/20">—</div>
                  <p className="text-sm text-muted-foreground">
                    {active ? "Toque uma nota..." : "Pressione o botão para começar"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Medidor de agulha */}
          <div className="relative w-full max-w-sm">
            {/* Fundo do medidor */}
            <div className="relative h-36 overflow-hidden">
              {/* Arco do medidor */}
              <svg viewBox="0 0 300 160" className="absolute inset-0 w-full h-full">
                {/* Arco de fundo */}
                <path d="M 30 150 A 120 120 0 0 1 270 150" fill="none" stroke="hsl(var(--border))" strokeWidth="6" strokeLinecap="round" />
                
                {/* Zona de afinação (verde central) */}
                <path d="M 138 38 A 120 120 0 0 1 162 38" fill="none" stroke="hsl(142 71% 45%)" strokeWidth="8" strokeLinecap="round" opacity="0.4" />
                
                {/* Arco colorido baseado nos cents */}
                {noteInfo && (
                  <path
                    d="M 30 150 A 120 120 0 0 1 270 150"
                    fill="none"
                    stroke={indicatorColor}
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.15"
                  />
                )}

                {/* Marcações de escala */}
                {[-50, -25, 0, 25, 50].map((c, i) => {
                  const angle = (c / 50) * 80 - 90; // -170 to -10 degrees from center
                  const rad = (angle * Math.PI) / 180;
                  const cx = 150 + 120 * Math.cos(rad);
                  const cy = 150 + 120 * Math.sin(rad);
                  const cx2 = 150 + 108 * Math.cos(rad);
                  const cy2 = 150 + 108 * Math.sin(rad);
                  return (
                    <g key={c}>
                      <line x1={cx} y1={cy} x2={cx2} y2={cy2} stroke="hsl(var(--muted-foreground))" strokeWidth="2" opacity="0.4" />
                      <text x={150 + 95 * Math.cos(rad)} y={150 + 95 * Math.sin(rad)} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--muted-foreground))" fontSize="10" opacity="0.6">
                        {c === 0 ? "0" : (c > 0 ? `+${c}` : `${c}`)}
                      </text>
                    </g>
                  );
                })}

                {/* Agulha */}
                <g transform={`rotate(${needleAngle}, 150, 150)`} style={{ transition: "transform 0.1s ease-out" }}>
                  <line x1="150" y1="150" x2="150" y2="42" stroke={indicatorColor} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />
                  <circle cx="150" cy="150" r="7" fill={indicatorColor} style={{ transition: "fill 0.3s" }} />
                  <circle cx="150" cy="150" r="3" fill="hsl(var(--card))" />
                </g>
              </svg>
            </div>

            {/* Labels cents */}
            <div className="flex justify-between text-xs text-muted-foreground/60 font-mono px-2 -mt-2">
              <span>♭ flat</span>
              <span
                className="font-bold text-sm transition-colors duration-300"
                style={{ color: isInTune && noteInfo ? "hsl(142 71% 45%)" : "hsl(var(--muted-foreground))" }}
              >
                {noteInfo ? (cents >= 0 ? `+${cents.toFixed(0)}¢` : `${cents.toFixed(0)}¢`) : "0¢"}
              </span>
              <span>♯ sharp</span>
            </div>
          </div>

          {/* Badge de afinado */}
          <AnimatePresence>
            {isInTune && noteInfo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="flex items-center gap-2 bg-green-500/15 border border-green-500/40 text-green-400 rounded-full px-5 py-2 text-sm font-bold tracking-wide"
              >
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                AFINADO
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Botão ligar/desligar */}
      <div className="flex justify-center">
        {!active ? (
          <Button
            size="lg"
            className="h-16 w-16 rounded-full text-lg shadow-lg hover-elevate"
            onClick={startListening}
            title="Ativar microfone"
          >
            <Mic className="w-7 h-7" />
          </Button>
        ) : (
          <Button
            size="lg"
            variant="destructive"
            className="h-16 w-16 rounded-full text-lg shadow-lg"
            onClick={stopListening}
            title="Parar"
          >
            <MicOff className="w-7 h-7" />
          </Button>
        )}
      </div>

      {active && (
        <p className="text-center text-xs text-muted-foreground">
          Microfone ativo — toque uma nota no seu instrumento
        </p>
      )}

      {error && (
        <div className="text-center text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Tabela de referência */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 bg-secondary/20">
          <h3 className="text-sm font-semibold text-foreground">Notas de Referência (A4 = 440 Hz)</h3>
        </div>
        <div className="grid grid-cols-4 gap-0 divide-x divide-y divide-border/30">
          {[
            { note: "C4", freq: 261.63 }, { note: "D4", freq: 293.66 },
            { note: "E4", freq: 329.63 }, { note: "F4", freq: 349.23 },
            { note: "G4", freq: 392.00 }, { note: "A4", freq: 440.00 },
            { note: "B4", freq: 493.88 }, { note: "C5", freq: 523.25 },
          ].map(({ note, freq }) => (
            <div key={note} className="flex flex-col items-center py-3 px-2">
              <span className="text-sm font-bold text-primary">{note}</span>
              <span className="text-xs text-muted-foreground font-mono">{freq} Hz</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
