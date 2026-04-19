import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import Toast from './Toast.jsx';

export default function Layout() {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Header />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
      <Toast />
    </div>
  );
}
