import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { api, buildQuery, getErrorMessage } from '../utils/api.js';
import { useStore } from '../store/useStore.js';

const emptyCustomer = { name: '', phone: '', email: '', deviceModel: '', tagsText: '', optInWhatsApp: true, optInEmail: true };

export default function Customers() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const queryClient = useQueryClient();
  const pushToast = useStore((state) => state.pushToast);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => (await api.get(`/customers${buildQuery({ search })}`)).data,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, tags: form.tagsText.split(',').map((v) => v.trim()).filter(Boolean) };
      delete payload.tagsText;
      if (editing?.id) return api.patch(`/customers/${editing.id}`, payload);
      return api.post('/customers', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditing(null);
      setForm(emptyCustomer);
      pushToast({ type: 'success', title: 'Customer saved' });
    },
    onError: (error) => pushToast({ type: 'error', title: 'Save failed', message: getErrorMessage(error) }),
  });

  const openEdit = (customer) => {
    setEditing(customer);
    setForm({ ...customer, tagsText: Array.isArray(customer.tags) ? customer.tags.join(', ') : '' });
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-ink">Customers</h2>
          <p className="mt-1 text-gray-600">CRM records, opt-ins, referrals, and loyalty.</p>
        </div>
        <button className="rounded bg-brand px-4 py-2 font-semibold text-white" onClick={() => { setEditing({}); setForm(emptyCustomer); }}>New customer</button>
      </div>
      <input className="w-full rounded border border-line bg-white px-3 py-2 sm:max-w-sm" placeholder="Search customers" value={search} onChange={(e) => setSearch(e.target.value)} />
      <DataTable
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'phone', header: 'Phone' },
          { key: 'email', header: 'Email', render: (row) => row.email || '-' },
          { key: 'totalSpent', header: 'Spent', render: (row) => `$${Number(row.totalSpent || 0).toFixed(2)}` },
          { key: 'loyaltyPoints', header: 'Points' },
        ]}
        rows={data?.customers || []}
        loading={isLoading}
        actions={(row) => <button className="rounded border border-line px-3 py-1 hover:bg-field" onClick={() => openEdit(row)}>Edit</button>}
      />
      <Modal open={Boolean(editing)} title={editing?.id ? 'Edit customer' : 'New customer'} onClose={() => setEditing(null)} footer={(
        <div className="flex justify-end gap-3">
          <button className="rounded border border-line px-4 py-2" onClick={() => setEditing(null)}>Cancel</button>
          <button className="rounded bg-brand px-4 py-2 font-semibold text-white" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</button>
        </div>
      )}>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['name', 'Name'], ['phone', 'Phone'], ['email', 'Email'], ['deviceModel', 'Device model'], ['tagsText', 'Tags'],
          ].map(([key, label]) => (
            <label key={key} className={key === 'tagsText' ? 'block sm:col-span-2' : 'block'}>
              <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
              <input className="w-full rounded border border-line px-3 py-2" value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </label>
          ))}
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.optInWhatsApp} onChange={(e) => setForm({ ...form, optInWhatsApp: e.target.checked })} /> WhatsApp opt-in</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.optInEmail} onChange={(e) => setForm({ ...form, optInEmail: e.target.checked })} /> Email opt-in</label>
        </div>
      </Modal>
    </section>
  );
}
