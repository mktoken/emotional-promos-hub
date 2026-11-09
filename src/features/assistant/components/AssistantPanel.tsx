import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
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

type TurnstileRenderOptions = {
  sitekey: string;
  action: string;
  language: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": (errorCode: string) => boolean;
  "timeout-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_ACTION = "assistant_lead_capture";
let turnstileScriptLoad: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptLoad) return turnstileScriptLoad;

  turnstileScriptLoad = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) resolve();
      else {
        turnstileScriptLoad = null;
        reject(new Error("turnstile_api_unavailable"));
      }
    };
    script.onerror = () => {
      script.remove();
      turnstileScriptLoad = null;
      reject(new Error("turnstile_script_failed"));
    };
    document.head.appendChild(script);
  });

  return turnstileScriptLoad;
}

function TurnstileChallenge({
  onTokenChange,
  resetKey,
}: {
  onTokenChange: (token: string) => void;
  resetKey: number;
}) {
  const siteKey = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim() ?? "";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    onTokenChange("");
    if (!siteKey) {
      setStatus("unavailable");
      return;
    }

    let disposed = false;
    let widgetId: string | null = null;
    setStatus("loading");
    void loadTurnstileScript().then(() => {
      if (disposed || !containerRef.current || !window.turnstile) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: TURNSTILE_ACTION,
        language: "es",
        callback: (token) => onTokenChange(token),
        "expired-callback": () => {
          onTokenChange("");
          if (widgetId) window.turnstile?.reset(widgetId);
        },
        "error-callback": () => {
          onTokenChange("");
          setStatus("unavailable");
          return true;
        },
        "timeout-callback": () => {
          onTokenChange("");
          if (widgetId) window.turnstile?.reset(widgetId);
        },
      });
      widgetIdRef.current = widgetId;
      setStatus("ready");
    }).catch(() => {
      if (!disposed) {
        onTokenChange("");
        setStatus("unavailable");
      }
    });

    return () => {
      disposed = true;
      if (widgetId) window.turnstile?.remove(widgetId);
      if (widgetIdRef.current === widgetId) widgetIdRef.current = null;
    };
  }, [onTokenChange, siteKey]);

  useEffect(() => {
    onTokenChange("");
    if (!widgetIdRef.current || !window.turnstile) return;
    try {
      window.turnstile.reset(widgetIdRef.current);
      setStatus("ready");
    } catch {
      setStatus("unavailable");
    }
  }, [onTokenChange, resetKey]);

  return (
    <div role="group" aria-label="Verificación de seguridad" className="flex flex-col items-center gap-1">
      <div ref={containerRef} />
      {status === "loading" && (
        <p className="text-xs text-muted-foreground" role="status">Preparando verificación…</p>
      )}
      {status === "unavailable" && (
        <p className="text-xs text-destructive" role="status">La verificación no está disponible. Inténtalo más tarde.</p>
      )}
    </div>
  );
}

export default function AssistantPanel({ open, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState<CapturedData>({});
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("chat");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
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
    if (!privacyConsent || !turnstileToken) return;
    try {
      await submit({
        captured: data,
        messages,
        privacyConsent,
        honeypot: honeypotRef.current?.value ?? "",
        turnstileToken,
      });
      setPhase("success");
    } catch {
      setTurnstileToken("");
      setTurnstileResetKey((key) => key + 1);
      // error displayed below
    }
  }

  function handleReset() {
    setStepIdx(0);
    setData({});
    setMessages([]);
    setDraft("");
    setPhase("chat");
    setPrivacyConsent(false);
    setTurnstileToken("");
    setTurnstileResetKey((key) => key + 1);
    if (honeypotRef.current) honeypotRef.current.value = "";
    reset();
  }

  function handleBack() {
    if (phase === "summary") {
      setTurnstileToken("");
      setTurnstileResetKey((key) => key + 1);
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
                Revisaremos tu solicitud y usaremos los datos proporcionados para contactarte
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-2 text-xs">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <p className="font-bold">No se pudo registrar la solicitud</p>
                <p className="break-words">{error.message}</p>
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
              <input
                ref={honeypotRef}
                type="text"
                name="website"
                autoComplete="off"
                tabIndex={-1}
                aria-hidden="true"
                className="absolute -left-[10000px] h-px w-px opacity-0"
              />
              <label className="flex items-start gap-2 text-xs leading-relaxed">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(event) => setPrivacyConsent(event.target.checked)}
                  disabled={loading || success}
                  className="mt-0.5"
                />
                <span>
                  He leído el <Link to="/aviso-de-privacidad" target="_blank" rel="noreferrer" className="font-semibold text-primary underline">Aviso de Privacidad</Link> y autorizo el uso de mis datos para revisar esta solicitud y contactarme sobre ella.
                </span>
              </label>
              <p className="text-xs text-center text-muted-foreground">
                ¿Deseas que un asesor te contacte con esta información?
              </p>
              <TurnstileChallenge
                onTokenChange={setTurnstileToken}
                resetKey={turnstileResetKey}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleBack} disabled={loading}>
                  Editar
                </Button>
                <Button onClick={handleConfirmSend} disabled={loading || success || !privacyConsent || !turnstileToken}>
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
