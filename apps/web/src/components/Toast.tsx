import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast } from '../lib/toast';

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const colorMap = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-gray-800 text-white dark:bg-slate-700 dark:text-slate-100',
} as const;

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg text-sm animate-slide-up ${colorMap[toast.type]}`}
          >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
