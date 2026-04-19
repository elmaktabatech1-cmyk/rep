import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { api, buildQuery, getErrorMessage } from '../utils/api.js';
import { useStore } from '../store/useStore.js';

const emptyProduct = { sku: '', name: '', category: '', costPrice: 0, sellPrice: 0, stockQty: 0, minStockAlert: 5, warrantyMonths: 0 };

export default function Products() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const queryClient = useQueryClient();
  const pushToast = useStore((state) => state.pushToast);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: async () => (await api.get(`/products${buildQuery({ search })}`)).data,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        costPrice: Number(form.costPrice),
        sellPrice: Number(form.sellPrice),
        stockQty: Number(form.stockQty),
        minStockAlert: Number(form.minStockAlert),
        warrantyMonths: Number(form.warrantyMonths),
        compatibility: form.compatibilityText ? form.compatibilityText.split(',').map((v) => v.trim()).filter(Boolean) : [],
        images: form.imagesText ? form.imagesText.split(',').map((v) => v.trim()).filter(Boolean) : [],
      };
      if (editing?.id) return api.patch(`/products/${editing.id}`, payload);
      return api.post('/products', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditing(null);
      setForm(emptyProduct);
      pushToast({ type: 'success', title: 'Product saved' });
    },
    onError: (error) => pushToast({ type: 'error', title: 'Save failed', message: getErrorMessage(error) }),
  });

  const columns = useMemo(() => [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category' },
    { key: 'stockQty', header: 'Stock' },
    { key: 'sellPrice', header: 'Price', render: (row) => `$${Number(row.sellPrice).toFixed(2)}` },
    { key: 'isActive', header: 'Status', render: (row) => row.isActive ? 'Active' : 'Inactive' },
  ], []);

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      ...product,
      compatibilityText: Array.isArray(product.compatibility) ? product.compatibility.join(', ') : '',
      imagesText: Array.isArray(product.images) ? product.images.join(', ') : '',
    });
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-ink">Products</h2>
          <p className="mt-1 text-gray-600">Catalog, pricing, compatibility, and stock alerts.</p>
        </div>
        <button className="rounded bg-brand px-4 py-2 font-semibold text-white" onClick={() => { setEditing({}); setForm(emptyProduct); }}>New product</button>
      </div>
      <input className="w-full rounded border border-line bg-white px-3 py-2 sm:max-w-sm" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
      <DataTable columns={columns} rows={data?.products || []} loading={isLoading} actions={(row) => (
        <button className="rounded border border-line px-3 py-1 hover:bg-field" onClick={() => openEdit(row)}>Edit</button>
      )} />
      <Modal open={Boolean(editing)} title={editing?.id ? 'Edit product' : 'New product'} onClose={() => setEditing(null)} footer={(
        <div className="flex justify-end gap-3">
          <button className="rounded border border-line px-4 py-2" onClick={() => setEditing(null)}>Cancel</button>
          <button className="rounded bg-brand px-4 py-2 font-semibold text-white disabled:opacity-60" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</button>
        </div>
      )}>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['sku', 'SKU'], ['name', 'Name'], ['category', 'Category'], ['costPrice', 'Cost price'], ['sellPrice', 'Sell price'], ['stockQty', 'Stock quantity'], ['minStockAlert', 'Minimum stock'], ['warrantyMonths', 'Warranty months'],
          ].map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
              <input className="w-full rounded border border-line px-3 py-2" type={['costPrice', 'sellPrice', 'stockQty', 'minStockAlert', 'warrantyMonths'].includes(key) ? 'number' : 'text'} value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} disabled={editing?.id && key === 'sku'} />
            </label>
          ))}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-gray-700">Compatibility, comma separated</span>
            <input className="w-full rounded border border-line px-3 py-2" value={form.compatibilityText || ''} onChange={(e) => setForm({ ...form, compatibilityText: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-gray-700">Image URLs, comma separated</span>
            <input className="w-full rounded border border-line px-3 py-2" value={form.imagesText || ''} onChange={(e) => setForm({ ...form, imagesText: e.target.value })} />
          </label>
        </div>
      </Modal>
    </section>
  );
}
