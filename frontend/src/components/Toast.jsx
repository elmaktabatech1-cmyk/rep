import { useStore } from '../store/useStore.js';

const typeClasses = {
  success: 'border-brand bg-white',
  error: 'border-accent bg-white',
  info: 'border-gray-400 bg-white',
};

export default function Toast() {
  const toasts = useStore((state) => state.toasts);
  const removeToast = useStore((state) => state.removeToast);

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[min(92vw,380px)] flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className={`rounded border-l-4 p-4 shadow-soft ${typeClasses[toast.type] || typeClasses.info}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">{toast.title}</p>
              {toast.message ? <p className="mt-1 text-sm text-gray-600">{toast.message}</p> : null}
            </div>
            <button type="button" className="rounded px-2 text-gray-500 hover:bg-gray-100" onClick={() => removeToast(toast.id)} aria-label="Close notification">
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
