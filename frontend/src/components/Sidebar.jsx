import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore.js';

const links = [
  ['/', 'Dashboard'],
  ['/products', 'Products'],
  ['/customers', 'Customers'],
  ['/orders', 'Orders'],
  ['/expenses', 'Expenses'],
  ['/reports', 'Reports'],
  ['/campaigns', 'Campaigns'],
  ['/settings', 'Settings'],
];

export default function Sidebar() {
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const closeSidebar = useStore((state) => state.closeSidebar);

  return (
    <>
      <div className={`fixed inset-0 z-20 bg-black/40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} onClick={closeSidebar} />
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 transform bg-ink text-white transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <div>
            <p className="text-lg font-bold">ERP System</p>
            <p className="text-xs text-gray-300">Operations console</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={closeSidebar}
              className={({ isActive }) => `rounded px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-brand text-white' : 'text-gray-200 hover:bg-white/10'}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
