import { useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { fmtDay, fmtTime, money } from '../lib/format.js';
import { Empty, ErrorNote, Modal, PageHead, Panel, Stars, Status } from '../components/ui.jsx';
import { isStylist, useAuth } from '../lib/auth.jsx';

export default function StaffClients() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const list = useApi('/clients', { q });
  const rows = list.data || [];
  const stylist = isStylist(useAuth().user);
  return (
    <>
      <PageHead title={stylist ? 'Your clients' : 'Clients'}
        sub={stylist ? `${rows.length} clients you have had in your chair; visits and spend count only your appointments` : `${rows.length} clients, sorted by lifetime spend`} />
      <Panel>
        <label className="field"><span>Search by name, email or phone</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <ErrorNote error={list.error} />
        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Client</th><th>Contact</th><th className="num">Visits</th><th className="num">Spent</th><th>Last visit</th><th>Next visit</th><th className="num">No-shows</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td><button type="button" className="linkish" onClick={() => setOpen(c)}>{c.name}</button></td>
                    <td><span className="muted">{c.email}</span><br />{c.phone}</td>
                    <td className="num">{c.visits}</td>
                    <td className="num">{money(c.spentCents)}</td>
                    <td>{c.lastVisit ? fmtDay(c.lastVisit) : '—'}</td>
                    <td>{c.nextVisit ? `${fmtDay(c.nextVisit)}, ${fmtTime(c.nextVisit)}` : '—'}</td>
                    <td className="num">{c.noShows || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>{list.loading ? 'Loading…' : 'No clients found.'}</Empty>}
      </Panel>
      {open && <ClientHistory client={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ClientHistory({ client, onClose }) {
  const h = useApi('/appointments', { clientId: client.id, order: 'desc' });
  return (
    <Modal title={client.name} onClose={onClose} wide>
      <p className="muted">{client.email} {client.phone && <>&middot; {client.phone}</>} &middot; {client.visits} visits &middot; {money(client.spentCents)} spent</p>
      {h.data?.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Service</th><th>Stylist</th><th className="num">Price</th><th>Status</th><th>Rating</th><th>Staff notes</th></tr></thead>
            <tbody>
              {h.data.map((a) => (
                <tr key={a.id}>
                  <td>{fmtDay(a.startAt)}, {fmtTime(a.startAt)}</td>
                  <td>{a.serviceName}</td><td>{a.staffName}</td>
                  <td className="num">{money(a.priceCents)}</td>
                  <td><Status value={a.status} /></td>
                  <td>{a.status === 'completed' ? <Stars value={a.rating} /> : '—'}</td>
                  <td>{a.staffNotes || <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty>{h.loading ? 'Loading…' : 'No visits yet.'}</Empty>}
    </Modal>
  );
}
