import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { api, buildQuery, getErrorMessage } from '../utils/api.js';
import { useStore } from '../store/useStore.js';

const newOrder = { customerId: '', status: 'PENDING', paymentMethod: '', discount: 0, tax: 0, items: [{ productId: '', quantity: 1, priceAtSale: 0 }] };

export default function Orders() {
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(newOrder);
  const queryClient = useQueryClient();
  const pushToast = useStore((state) => state.pushToast);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', status],
    queryFn: async () => (await api.get(`/orders${buildQuery({ status })}`)).data,
  });
  const { data: productsData } = useQuery({ queryKey: ['products', 'select'], queryFn: async () => (await api.get('/products?limit=100')).data });
  const { data: customersData } = useQuery({ queryKey: ['customers', 'select'], queryFn: async () => (await api.get('/customers?limit=100')).data });

  const createMutation = useMutation({
    mutationFn: async () => api.post('/orders', {
      ...form,
      customerId: form.customerId || null,
      discount: Number(form.discount || 0),
      tax: Number(form.tax || 0),
      items: form.items.map((item) => ({ productId: item.productId || null, quantity: Number(item.quantity), priceAtSale: Number(item.priceAtSale) })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setCreating(false);
      setForm(newOrder);
      pushToast({ type: 'success', title: 'Order created' });
    },
    onError: (error) => pushToast({ type: 'error', title: 'Order failed', message: getErrorMessage(error) }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, nextStatus }) => api.patch(`/orders/${id}/status`, { status: nextStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      pushToast({ type: 'success', title: 'Status updated' });
    },
    onError: (error) => pushToast({ type: 'error', title: 'Update failed', message: getErrorMessage(error) }),
  });

  const updateItem = (index, patch) => {
    const items = form.items.map((item, i) => i === index ? { ...item, ...patch } : item);
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', quantity: 1, priceAtSale: 0 }] });
  const products = productsData?.products || [];
  const customers = customersData?.customers || [];

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-ink">Orders</h2>
          <p className="mt-1 text-gray-600">Manual orders and WooCommerce intake.</p>
        </div>
        <button className="rounded bg-brand px-4 py-2 font-semibold text-white" onClick={() => setCreating(true)}>New order</button>
      </div>
      <select className="rounded border border-line bg-white px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        {['PENDING', 'PAID', 'SHIPPED', 'CANCELLED'].map((item) => <option key={item}>{item}</option>)}
      </select>
      <DataTable
        columns={[
          { key: 'createdAt', header: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString() },
          { key: 'customer', header: 'Customer', render: (row) => row.customer?.name || 'Walk-in' },
          { key: 'source', header: 'Source' },
          { key: 'status', header: 'Status' },
          { key: 'total', header: 'Total', render: (row) => `$${Number(row.total).toFixed(2)}` },
        ]}
        rows={data?.orders || []}
        loading={isLoading}
        actions={(row) => (
          <select className="rounded border border-line px-2 py-1" value={row.status} onChange={(e) => statusMutation.mutate({ id: row.id, nextStatus: e.target.value })}>
            {['PENDING', 'PAID', 'SHIPPED', 'CANCELLED'].map((item) => <option key={item}>{item}</option>)}
          </select>
        )}
      />
      <Modal open={creating} title="New order" onClose={() => setCreating(false)} footer={(
        <div className="flex justify-end gap-3">
          <button className="rounded border border-line px-4 py-2" onClick={() => setCreating(false)}>Cancel</button>
          <button className="rounded bg-brand px-4 py-2 font-semibold text-white" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Create</button>
        </div>
      )}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium">Customer</span>
              <select className="w-full rounded border border-line px-3 py-2" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Walk-in</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Status</span>
              <select className="w-full rounded border border-line px-3 py-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['PENDING', 'PAID', 'SHIPPED', 'CANCELLED'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Payment method</span>
              <input className="w-full rounded border border-line px-3 py-2" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} />
            </label>
          </div>
          <div className="space-y-3">
            {form.items.map((item, index) => (
              <div key={index} className="grid gap-3 rounded border border-line p-3 sm:grid-cols-3">
                <select className="rounded border border-line px-3 py-2" value={item.productId} onChange={(e) => {
                  const product = products.find((p) => p.id === e.target.value);
                  updateItem(index, { productId: e.target.value, priceAtSale: product?.sellPrice || 0 });
                }}>
                  <option value="">Custom item</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                <input className="rounded border border-line px-3 py-2" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} />
                <input className="rounded border border-line px-3 py-2" type="number" min="0" step="0.01" value={item.priceAtSale} onChange={(e) => updateItem(index, { priceAtSale: e.target.value })} />
              </div>
            ))}
            <button className="rounded border border-line px-3 py-2" onClick={addItem}>Add item</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
