import { AppShell } from '../components/ui.jsx';
import { isStylist, useAuth } from '../lib/auth.jsx';

const NAV = [
  { to: '/staff', label: 'Today', end: true },
  { to: '/staff/schedule', label: 'Schedule' },
  { to: '/staff/appointments', label: 'Appointments' },
  { to: '/staff/clients', label: 'Clients' },
  { to: '/staff/services', label: 'Services' },
  { to: '/staff/stats', label: 'Statistics' },
];

export default function StaffLayout() {
  const { user } = useAuth();
  // A stylist's area shows only their own chair; the manager's shows the whole studio.
  return <AppShell nav={NAV} area={isStylist(user) ? `${user.title || 'Stylist'} · your chair` : 'Studio manager · all stylists'} />;
}
