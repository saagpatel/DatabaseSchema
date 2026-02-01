import { useEffect, useState, useCallback } from "react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

let toastListeners: ((toast: ToastMessage) => void)[] = [];

export function showToast(
  type: ToastMessage["type"],
  message: string
) {
  const toast: ToastMessage = {
    id: crypto.randomUUID(),
    type,
    message,
  };
  toastListeners.forEach((fn) => fn(toast));
}

export function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: ToastMessage) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 4000);
  }, []);

  useEffect(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== addToast);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  const bgMap = {
    success: "bg-success",
    error: "bg-danger",
    info: "bg-accent",
    warning: "bg-warning",
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${bgMap[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg max-w-sm text-sm animate-[slideIn_0.2s_ease-out]`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
