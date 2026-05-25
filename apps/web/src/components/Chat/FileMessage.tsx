import { Download, FileText, X } from 'lucide-react';
import { useState } from 'react';

interface FileMessageProps {
  fileUrl: string;
  fileType: string;
  isOwn: boolean;
}

export function ImageMessage({ fileUrl, isOwn: _isOwn }: { fileUrl: string; isOwn: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg overflow-hidden"
      >
        <img
          src={fileUrl}
          alt="Shared content"
          className={`${expanded ? 'max-h-[80vh]' : 'max-h-60'} w-auto rounded-lg object-contain bg-black/5 dark:bg-black/20`}
          loading="lazy"
        />
      </button>
      {expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
        >
          <X size={12} /> Collapse
        </button>
      )}
    </div>
  );
}

export function FileDownload({ fileUrl, fileType: _fileType, isOwn }: FileMessageProps) {
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download
      className={`mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-opacity-80 transition-colors ${
        isOwn
          ? 'border-blue-500/30 text-blue-100 hover:bg-blue-500/20'
          : 'border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
      }`}
    >
      <FileText size={16} />
      <span className="flex-1 truncate">{fileUrl.split('/').pop() || 'File'}</span>
      <Download size={14} className="shrink-0" />
    </a>
  );
}
