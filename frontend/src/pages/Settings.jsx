import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { api, getErrorMessage } from '../utils/api.js';
import { useStore } from '../store/useStore.js';

const emptyUser = { name: '', email: '', password: '', role: 'SALES', phone: '' };

export default function Settings() {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const queryClient = useQueryClient();
  const pushToast = useStore((state) => state.pushToast);
  const canManageUsers = user?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    enabled: canManageUsers,
    queryFn: async () => (await api.get('/auth/users')).data,
  });

  const createMutation = useMutation({
    mutationFn: async () => api.post('/auth/register', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreating(false);
      setForm(emptyUser);
      pushToast({ type: 'success', title: 'User created' });
    },
    onError: (error) => pushToast({ type: 'error', title: 'User failed', message: getErrorMessage(error) }),
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-ink">Settings</h2>
          <p className="mt-1 text-gray-600">Profile, roles, and operational preferences.</p>
        </div>
        {canManageUsers ? <button className="rounded bg-brand px-4 py-2 font-semibold text-white" onClick={() => setCreating(true)}>New user</button> : null}
      </div>
      <div className="rounded border border-line bg-white p-5 shadow-soft">
        <h3 className="font-semibold">Your profile</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div><dt className="text-sm text-gray-500">Name</dt><dd className="font-medium">{user?.name}</dd></div>
          <div><dt className="text-sm text-gray-500">Email</dt><dd className="font-medium">{user?.email}</dd></div>
          <div><dt className="text-sm text-gray-500">Role</dt><dd className="font-medium">{user?.role}</dd></div>
        </dl>
      </div>
      {canManageUsers ? (
        <DataTable
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'role', header: 'Role' },
            { key: 'isActive', header: 'Active', render: (row) => row.isActive ? 'Yes' : 'No' },
          ]}
          rows={data?.users || []}
          loading={isLoading}
        />
      ) : null}
      <Modal open={creating} title="New user" onClose={() => setCreating(false)} footer={(
        <div className="flex justify-end gap-3">
          <button className="rounded border border-line px-4 py-2" onClick={() => setCreating(false)}>Cancel</button>
          <button className="rounded bg-brand px-4 py-2 font-semibold text-white" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Save</button>
        </div>
      )}>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['name', 'Name'], ['email', 'Email'], ['password', 'Password'], ['phone', 'Phone'],
          ].map(([key, label]) => (
            <label key={key}><span className="mb-1 block text-sm font-medium">{label}</span><input className="w-full rounded border border-line px-3 py-2" type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>
          ))}
          <label><span className="mb-1 block text-sm font-medium">Role</span><select className="w-full rounded border border-line px-3 py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{['ADMIN', 'SALES', 'ACCOUNTANT', 'MARKETING'].map((role) => <option key={role}>{role}</option>)}</select></label>
        </div>
      </Modal>
    </section>
  );
}
