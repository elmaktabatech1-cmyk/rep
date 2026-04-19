import { useAuth } from '../hooks/useAuth.js';
import { useStore } from '../store/useStore.js';

export default function Header() {
  const { user, logout } = useAuth();
  const toggleSidebar = useStore((state) => state.toggleSidebar);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-white px-4 shadow-sm lg:px-6">
      <div className="flex items-center gap-3">
        <button type="button" className="rounded border border-line px-3 py-2 lg:hidden" onClick={toggleSidebar}>
          Menu
        </button>
        <div>
          <p className="text-sm text-gray-500">Signed in as</p>
          <h1 className="font-semibold text-ink">{user?.name || 'User'}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded bg-field px-3 py-1 text-sm font-medium text-gray-700 sm:inline-block">{user?.role}</span>
        <button type="button" className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
