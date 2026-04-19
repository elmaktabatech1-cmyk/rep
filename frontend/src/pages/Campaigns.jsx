import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { api, getErrorMessage } from '../utils/api.js';
import { useStore } from '../store/useStore.js';

const emptyCampaign = { name: '', channel: 'WHATSAPP', segmentId: '', message: '' };

export default function Campaigns() {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyCampaign);
  const queryClient = useQueryClient();
  const pushToast = useStore((state) => state.pushToast);

  const { data, isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: async () => (await api.get('/campaigns')).data });
  const { data: segmentsData } = useQuery({ queryKey: ['segments'], queryFn: async () => (await api.get('/campaigns/segments')).data.data });

  const createMutation = useMutation({
    mutationFn: async () => api.post('/campaigns', {
      name: form.name,
      channel: form.channel,
      segmentId: form.segmentId || null,
      targetSegment: form.segmentId ? null : { optInWhatsApp: form.channel === 'WHATSAPP', optInEmail: form.channel === 'EMAIL' },
      channelConfig: { message: form.message },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setCreating(false);
      setForm(emptyCampaign);
      pushToast({ type: 'success', title: 'Campaign saved' });
    },
    onError: (error) => pushToast({ type: 'error', title: 'Campaign failed', message: getErrorMessage(error) }),
  });

  const sendMutation = useMutation({
    mutationFn: async (id) => api.post(`/campaigns/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      pushToast({ type: 'success', title: 'Campaign sent' });
    },
    onError: (error) => pushToast({ type: 'error', title: 'Send failed', message: getErrorMessage(error) }),
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-ink">Campaigns</h2>
          <p className="mt-1 text-gray-600">WhatsApp and email outreach by customer segment.</p>
        </div>
        <button className="rounded bg-brand px-4 py-2 font-semibold text-white" onClick={() => setCreating(true)}>New campaign</button>
      </div>
      <DataTable
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'channel', header: 'Channel' },
          { key: 'status', header: 'Status' },
          { key: 'sentCount', header: 'Sent' },
          { key: 'convertedCount', header: 'Converted' },
        ]}
        rows={data?.campaigns || []}
        loading={isLoading}
        actions={(row) => row.status === 'DRAFT' ? <button className="rounded border border-line px-3 py-1 hover:bg-field" onClick={() => sendMutation.mutate(row.id)}>Send</button> : <span className="text-gray-500">Sent</span>}
      />
      <Modal open={creating} title="New campaign" onClose={() => setCreating(false)} footer={(
        <div className="flex justify-end gap-3">
          <button className="rounded border border-line px-4 py-2" onClick={() => setCreating(false)}>Cancel</button>
          <button className="rounded bg-brand px-4 py-2 font-semibold text-white" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Save</button>
        </div>
      )}>
        <div className="grid gap-4">
          <label><span className="mb-1 block text-sm font-medium">Name</span><input className="w-full rounded border border-line px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label><span className="mb-1 block text-sm font-medium">Channel</span><select className="w-full rounded border border-line px-3 py-2" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}><option>WHATSAPP</option><option>EMAIL</option></select></label>
          <label><span className="mb-1 block text-sm font-medium">Segment</span><select className="w-full rounded border border-line px-3 py-2" value={form.segmentId} onChange={(e) => setForm({ ...form, segmentId: e.target.value })}><option value="">All opted-in customers</option>{(segmentsData?.segments || []).map((segment) => <option key={segment.id} value={segment.id}>{segment.name}</option>)}</select></label>
          <label><span className="mb-1 block text-sm font-medium">Message</span><textarea className="w-full rounded border border-line px-3 py-2" rows="5" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
        </div>
      </Modal>
    </section>
  );
}
