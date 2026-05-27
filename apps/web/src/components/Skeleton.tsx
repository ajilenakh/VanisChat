export function ChatSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`flex mb-2 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`rounded-lg px-3 py-2 space-y-2 ${
              i % 2 === 0 ? 'bg-gray-200 dark:bg-slate-700' : 'bg-gray-100 dark:bg-slate-800'
            }`}
            style={{ width: `${Math.max(120, 200 - i * 15)}px` }}
          >
            {i % 2 !== 0 && <div className="h-3 w-16 bg-gray-300 dark:bg-slate-600 rounded" />}
            <div className="h-4 w-full bg-gray-300 dark:bg-slate-600 rounded" />
            <div className="h-3 w-12 bg-gray-300 dark:bg-slate-600 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}
