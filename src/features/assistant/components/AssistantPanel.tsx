import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Loader2, CheckCircle2, AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { STEPS, type CapturedData, type Step } from "../lib/assistant-flow";
import { buildSummary } from "../lib/assistant-summary";
import { useAssistantLeadCapture, type ChatMsg } from "../hooks/useAssistantLeadCapture";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = "chat" | "summary" | "success";

export default function AssistantPanel({ open, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState<CapturedData>({});
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { submit, loading, error, success, reset } = useAssistantLeadCapture();

  const step: Step | undefined = STEPS[stepIdx];

  // Inicializa primer mensaje
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          message:
            "¡Hola! Soy el asistente de Promocionales Emocionales 🎁. Te haré algunas preguntas rápidas para preparar tu propuesta.",
        },
        { role: "assistant", message: STEPS[0].question },
      ]);
    }
  }, [open, messages.length]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, phase]);

  function pushAssistant(text: string) {
    setMessages((m) => [...m, { role: "assistant", message: text }]);
  }
  function pushUser(text: string) {
    setMessages((m) => [...m, { role: "user", message: text }]);
  }

  function advance(value: string | number | boolean | undefined, label: string) {
    if (!step) return;
    pushUser(label);
    const newData: CapturedData = { ...data };
    if (value !== undefined) newData[step.id] = value;
    setData(newData);
    setDraft("");

    const next = stepIdx + 1;
    if (next >= STEPS.length) {
      setPhase("summary");
      pushAssistant("¡Listo! Aquí está el resumen de tu solicitud. Revísalo y confírmame para enviarla.");
    } else {
      setStepIdx(next);
      pushAssistant(STEPS[next].question);
    }
  }

  function handleSkip() {
    if (!step?.optional) return;
    advance(undefined, step.skipLabel ?? "Omitir");
  }

  function handleChoice(opt: { value: string; label: string }) {
    if (!step) return;
    let v: string | boolean = opt.value;
    if (opt.value === "true") v = true;
    else if (opt.value === "false") v = false;
    advance(v, opt.label);
  }

  function handleYesNo(yes: boolean) {
    advance(yes, yes ? "Sí" : "No");
  }

  function handleSubmitText() {
    if (!step) return;
    const v = draft.trim();
    if (!v) return;
    if (step.kind === "number") {
      const n = parseFloat(v.replace(/[^0-9.]/g, ""));
      if (!isFinite(n) || n <= 0) {
        pushAssistant("Por favor ingresa una cantidad válida.");
        return;
      }
      advance(n, v);
    } else {
      advance(v, v);
    }
  }

  async function handleConfirmSend() {
    const summary = buildSummary(data);
    try {
      await submit({ captured: data, summary, messages });
      setPhase("success");
    } catch {
      // error displayed below
    }
  }

  function handleReset() {
    setStepIdx(0);
    setData({});
    setMessages([]);
    setDraft("");
    setPhase("chat");
    reset();
  }

  function handleBack() {
    if (phase === "summary") {
      setPhase("chat");
      return;
    }
    if (stepIdx === 0) return;
    setStepIdx(stepIdx - 1);
    pushAssistant(STEPS[stepIdx - 1].question);
  }

  const progress = useMemo(() => {
    if (phase === "success") return 100;
    if (phase === "summary") return 100;
    return Math.round((stepIdx / STEPS.length) * 100);
  }, [stepIdx, phase]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[400px] sm:h-[640px] sm:max-h-[85vh]">
      <div className="absolute inset-0 bg-black/40 sm:hidden" onClick={onClose} aria-hidden />
      <div className="relative w-full h-full sm:h-full bg-card border border-border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-foreground text-background px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {(phase === "chat" && stepIdx > 0) || phase === "summary" ? (
              <button onClick={handleBack} className="p-1 -ml-1 hover:bg-background/10 rounded" aria-label="Anterior">
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : null}
            <div className="min-w-0">
              <h2 className="font-bold text-sm">Asesor en línea</h2>
              <p className="text-[10px] opacity-70 truncate">
                {phase === "success" ? "Solicitud enviada" : phase === "summary" ? "Resumen" : step?.section}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-background/10 rounded" aria-label="Cerrar asistente">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Progress */}
        {phase !== "success" && (
          <div className="px-4 pt-2 shrink-0">
            <Progress value={progress} className="h-1" />
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm"
                }`}
              >
                {m.message}
              </div>
            </div>
          ))}

          {phase === "summary" && (
            <div className="bg-secondary rounded-xl p-3 text-xs whitespace-pre-wrap border border-border">
              {buildSummary(data)}
            </div>
          )}

          {phase === "success" && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="font-bold">¡Gracias! Recibimos tu solicitud.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Un asesor te contactará por WhatsApp o email muy pronto.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-2 text-xs">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <p className="font-bold">No se pudo registrar la solicitud</p>
                {error.stage && (
                  <p>
                    <span className="font-semibold">Etapa:</span> {error.stage}
                  </p>
                )}
                {error.error && (
                  <p className="break-words">
                    <span className="font-semibold">Error:</span> {error.error}
                  </p>
                )}
                {error.details && (
                  <p className="break-words opacity-80">
                    <span className="font-semibold">Detalles:</span> {error.details}
                  </p>
                )}
                {!error.stage && !error.error && <p className="break-words">{error.message}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border p-3 shrink-0 bg-card">
          {phase === "chat" && step && (
            <ChatInput
              step={step}
              draft={draft}
              setDraft={setDraft}
              onChoice={handleChoice}
              onYesNo={handleYesNo}
              onSubmitText={handleSubmitText}
              onSkip={handleSkip}
            />
          )}

          {phase === "summary" && (
            <div className="space-y-2">
              <p className="text-xs text-center text-muted-foreground">
                ¿Deseas que un asesor te contacte con esta información?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleBack} disabled={loading}>
                  Editar
                </Button>
                <Button onClick={handleConfirmSend} disabled={loading || success}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Confirmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {phase === "success" && (
            <Button variant="outline" onClick={handleReset} className="w-full">
              Iniciar otra solicitud
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatInput({
  step,
  draft,
  setDraft,
  onChoice,
  onYesNo,
  onSubmitText,
  onSkip,
}: {
  step: Step;
  draft: string;
  setDraft: (v: string) => void;
  onChoice: (o: { value: string; label: string }) => void;
  onYesNo: (yes: boolean) => void;
  onSubmitText: () => void;
  onSkip: () => void;
}) {
  if (step.kind === "choice" && step.options) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
          {step.options.map((opt) => (
            <Button
              key={opt.value}
              variant="outline"
              size="sm"
              className="justify-start text-left h-auto py-2 whitespace-normal"
              onClick={() => onChoice(opt)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {step.optional && (
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onSkip}>
            {step.skipLabel ?? "Omitir"}
          </Button>
        )}
      </div>
    );
  }

  if (step.kind === "yesno") {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onYesNo(true)}>
            Sí
          </Button>
          <Button variant="outline" onClick={() => onYesNo(false)}>
            No
          </Button>
        </div>
        {step.optional && (
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onSkip}>
            {step.skipLabel ?? "Omitir"}
          </Button>
        )}
      </div>
    );
  }

  // text, number, date
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          autoFocus
          type={step.kind === "date" ? "date" : step.kind === "number" ? "number" : "text"}
          inputMode={step.kind === "number" ? "numeric" : undefined}
          placeholder={step.placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmitText();
            }
          }}
        />
        <Button onClick={onSubmitText} disabled={!draft.trim()} aria-label="Enviar">
          <Send className="w-4 h-4" />
        </Button>
      </div>
      {step.optional && (
        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onSkip}>
          {step.skipLabel ?? "Omitir"}
        </Button>
      )}
    </div>
  );
}
