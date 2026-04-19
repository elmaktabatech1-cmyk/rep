import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTable from '../components/DataTable.jsx';
import Loading from '../components/Loading.jsx';
import { api, buildQuery, unwrap } from '../utils/api.js';

export default function Reports() {
  const [range, setRange] = useState({ from: '', to: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['sales-report', range],
    queryFn: async () => unwrap(await api.get(`/reports/sales${buildQuery(range)}`)),
  });
  const { data: inventory } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: async () => unwrap(await api.get('/reports/inventory')),
  });
  const { data: profitLoss } = useQuery({
    queryKey: ['profit-loss', range],
    queryFn: async () => unwrap(await api.get(`/expenses/profit-loss${buildQuery(range)}`)),
  });

  if (isLoading) return <Loading label="Loading reports" />;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Reports</h2>
        <p className="mt-1 text-gray-600">Sales performance, inventory valuation, and profit.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <input className="rounded border border-line bg-white px-3 py-2" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <input className="rounded border border-line bg-white px-3 py-2" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Revenue', data?.summary?.revenue],
          ['Expenses', profitLoss?.totalExpenses],
          ['Net profit', profitLoss?.netProfit],
          ['Inventory retail value', inventory?.totalRetailValue],
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-line bg-white p-5 shadow-soft">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-ink">${Number(value || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>
      <DataTable
        columns={[
          { key: 'sku', header: 'SKU' },
          { key: 'name', header: 'Product' },
          { key: 'category', header: 'Category' },
          { key: 'stockQty', header: 'Stock' },
          { key: 'minStockAlert', header: 'Minimum' },
          { key: 'sellPrice', header: 'Sell price', render: (row) => `$${Number(row.sellPrice).toFixed(2)}` },
        ]}
        rows={inventory?.products || []}
      />
    </section>
  );
}
