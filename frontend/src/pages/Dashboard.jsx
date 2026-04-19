import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../utils/api.js';
import Loading from '../components/Loading.jsx';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => unwrap(await api.get('/reports/sales')),
  });
  const { data: inventory } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: async () => unwrap(await api.get('/reports/inventory')),
  });

  if (isLoading) return <Loading label="Loading dashboard" />;

  const summary = data?.summary || {};

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Dashboard</h2>
        <p className="mt-1 text-gray-600">Sales, inventory, and customer movement.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Revenue', money(summary.revenue)],
          ['Orders', summary.orders || 0],
          ['Average order', money(summary.avgOrderValue)],
          ['Low stock', inventory?.lowStockCount || 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-line bg-white p-5 shadow-soft">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded border border-line bg-white p-5 shadow-soft">
          <h3 className="font-semibold text-ink">Top products</h3>
          <div className="mt-4 space-y-3">
            {(data?.topProducts || []).map((item) => (
              <div key={`${item.sku}-${item.product}`} className="flex items-center justify-between border-b border-line pb-3 last:border-0">
                <div>
                  <p className="font-medium">{item.product}</p>
                  <p className="text-sm text-gray-500">{item.sku} · {item.quantity} sold</p>
                </div>
                <span className="font-semibold">{money(item.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded border border-line bg-white p-5 shadow-soft">
          <h3 className="font-semibold text-ink">Top customers</h3>
          <div className="mt-4 space-y-3">
            {(data?.topCustomers || []).map((customer) => (
              <div key={customer.id} className="flex items-center justify-between border-b border-line pb-3 last:border-0">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-gray-500">{customer.loyaltyPoints} points</p>
                </div>
                <span className="font-semibold">{money(customer.totalSpent)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
