export default function Modal({ open, title, children, onClose, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" className="rounded px-3 py-1 text-gray-500 hover:bg-gray-100" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-5 scrollbar-thin">{children}</div>
        {footer ? <div className="border-t border-line bg-field px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
