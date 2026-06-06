import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import AssistantPanel from "./AssistantPanel";

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir asesor en línea"
        className="fixed bottom-6 left-6 z-40 bg-primary text-primary-foreground pl-4 pr-5 py-3 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-bold text-sm"
      >
        <MessageSquareText size={20} />
        <span className="hidden sm:inline">Solicitar asesoría</span>
        <span className="sm:hidden">Asesoría</span>
      </button>

      <AssistantPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
