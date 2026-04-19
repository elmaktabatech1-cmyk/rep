export default function Loading({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <div className="flex items-center gap-3 rounded border border-line bg-white px-4 py-3 shadow-soft">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <span className="font-medium text-gray-700">{label}</span>
      </div>
    </div>
  );
}
