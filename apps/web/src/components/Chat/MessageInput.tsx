import { Loader2, Paperclip, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRoomContext } from '../../context/RoomContext';
import { requestUploadUrl } from '../../lib/api';
import { useToast } from '../../lib/toast';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled: boolean;
  onFileSend?: (fileUrl: string, fileType: string) => void;
}

const ENABLE_UPLOAD = import.meta.env.VITE_ENABLE_FILE_UPLOAD === 'true';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function MessageInput({ onSend, onTyping, disabled, onFileSend }: MessageInputProps) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state } = useRoomContext();
  const { addToast } = useToast();

  useEffect(() => {
    return () => clearTimeout(typingTimeout.current);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    onTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    onTyping(false);
    clearTimeout(typingTimeout.current);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!ENABLE_UPLOAD) {
      addToast('File upload is not enabled', 'error');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      addToast('File too large. Maximum size is 10MB.', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { uploadUrl, fileUrl } = await requestUploadUrl(
        state.roomId || '',
        state.sessionToken || '',
        {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
      );

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => resolve();
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      onFileSend?.(fileUrl, file.type);
      addToast('File uploaded', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white dark:bg-slate-900 dark:border-slate-700 sticky bottom-0"
    >
      {ENABLE_UPLOAD && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,application/zip"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="rounded-lg p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50"
            title="Attach file"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>
        </>
      )}

      {uploading && (
        <div className="absolute bottom-full left-0 right-0 h-1 bg-gray-200 dark:bg-slate-700">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <input
        id="message-input"
        value={text}
        onChange={handleChange}
        disabled={disabled}
        placeholder={disabled ? 'Room expired...' : 'Type a message...'}
        className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400 dark:disabled:bg-slate-800"
        maxLength={10000}
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Send size={18} />
      </button>
    </form>
  );
}
