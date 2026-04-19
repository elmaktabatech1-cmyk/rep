import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { api, getErrorMessage } from '../utils/api.js';
import { useStore } from '../store/useStore.js';

const today = new Date().toISOString().slice(0, 10);
const emptyExpense = { category: '', amount: 0, date: today, description: '', isFixed: false, paymentAccountId: '', supplierId: '' };

export default function Expenses() {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyExpense);
  const queryClient = useQueryClient();
  const pushToast = useStore((state) => state.pushToast);

  const { data, isLoading } = useQuery({ queryKey: ['expenses'], queryFn: async () => (await api.get('/expenses')).data });
  const { data: accountsData } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await api.get('/expenses/accounts')).data.data });
  const { data: suppliersData } = useQuery({ queryKey: ['suppliers'], queryFn: async () => (await api.get('/expenses/suppliers')).data.data });

  const createMutation = useMutation({
    mutationFn: async () => api.post('/expenses', { ...form, amount: Number(form.amount), paymentAccountId: form.paymentAccountId || null, supplierId: form.supplierId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setCreating(false);
      setForm(emptyExpense);
      pushToast({ type: 'success', title: 'Expense recorded' });
    },
    onError: (error) => pushToast({ type: 'error', title: 'Expense failed', message: getErrorMessage(error) }),
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-ink">Expenses</h2>
          <p className="mt-1 text-gray-600">Operating costs, suppliers, and payment accounts.</p>
        </div>
        <button className="rounded bg-brand px-4 py-2 font-semibold text-white" onClick={() => setCreating(true)}>New expense</button>
      </div>
      <DataTable
        columns={[
          { key: 'date', header: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
          { key: 'category', header: 'Category' },
          { key: 'description', header: 'Description', render: (row) => row.description || '-' },
          { key: 'amount', header: 'Amount', render: (row) => `$${Number(row.amount).toFixed(2)}` },
          { key: 'paymentAccount', header: 'Account', render: (row) => row.paymentAccount?.name || '-' },
        ]}
        rows={data?.expenses || []}
        loading={isLoading}
      />
      <Modal open={creating} title="New expense" onClose={() => setCreating(false)} footer={(
        <div className="flex justify-end gap-3">
          <button className="rounded border border-line px-4 py-2" onClick={() => setCreating(false)}>Cancel</button>
          <button className="rounded bg-brand px-4 py-2 font-semibold text-white" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Save</button>
        </div>
      )}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="mb-1 block text-sm font-medium">Category</span><input className="w-full rounded border border-line px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
          <label><span className="mb-1 block text-sm font-medium">Amount</span><input className="w-full rounded border border-line px-3 py-2" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
          <label><span className="mb-1 block text-sm font-medium">Date</span><input className="w-full rounded border border-line px-3 py-2" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label><span className="mb-1 block text-sm font-medium">Account</span><select className="w-full rounded border border-line px-3 py-2" value={form.paymentAccountId} onChange={(e) => setForm({ ...form, paymentAccountId: e.target.value })}><option value="">Unpaid</option>{(accountsData?.accounts || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className="mb-1 block text-sm font-medium">Supplier</span><select className="w-full rounded border border-line px-3 py-2" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}><option value="">None</option>{(suppliersData?.suppliers || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="flex items-center gap-2 pt-6"><input type="checkbox" checked={form.isFixed} onChange={(e) => setForm({ ...form, isFixed: e.target.checked })} /> Fixed expense</label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-medium">Description</span><textarea className="w-full rounded border border-line px-3 py-2" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        </div>
      </Modal>
    </section>
  );
}
