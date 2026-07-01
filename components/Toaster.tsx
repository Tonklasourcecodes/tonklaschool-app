"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (opts: { type: ToastType; title: string; message?: string }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />,
  error: <XCircle size={18} className="shrink-0 text-red-500" />,
  info: <Info size={18} className="shrink-0 text-blue-500" />,
};

const ACCENT = {
  success: "#10b981",
  error: "#ef4444",
  info: "#3b82f6",
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  return (
    <div
      className="flex items-start gap-3 bg-white rounded-2xl px-4 py-3.5 min-w-[280px] max-w-[360px] pointer-events-auto"
      style={{
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
        borderLeft: `3px solid ${ACCENT[toast.type]}`,
        animation: "toastIn 0.28s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {ICONS[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 leading-tight">{toast.title}</p>
        {toast.message && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-0.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const add = useCallback(({ type, title, message }: { type: ToastType; title: string; message?: string }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
    const timer = setTimeout(() => remove(id), 4500);
    timers.current.set(id, timer);
  }, [remove]);

  const ctx: ToastContextValue = {
    toast: add,
    success: (title, message) => add({ type: "success", title, message }),
    error: (title, message) => add({ type: "error", title, message }),
    info: (title, message) => add({ type: "info", title, message }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {typeof window !== "undefined" && createPortal(
        <div
          className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onRemove={remove} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
