import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorFallbackProps {
  error?: Error | null;
  retry?: () => void;
  title?: string;
}

export function ErrorFallback({
  error,
  retry,
  title = 'Something went wrong',
}: ErrorFallbackProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
      <div className="text-center max-w-md">
        <AlertTriangle size={48} className="mx-auto mb-4 text-amber-500" />
        <h1 className="text-xl font-bold mb-2 text-gray-900 dark:text-slate-100">{title}</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {import.meta.env.DEV && error?.message
            ? error.message
            : 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex gap-3 justify-center">
          {retry && (
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <Home size={14} />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export function RoomErrorFallback(props: ErrorFallbackProps) {
  return <ErrorFallback {...props} title="Chat room error" />;
}
