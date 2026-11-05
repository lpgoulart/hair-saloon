import { AppShell } from '../components/ui.jsx';

const NAV = [
  { to: '/account/book', label: 'Book a visit' },
  { to: '/account/appointments', label: 'My appointments' },
  { to: '/account/profile', label: 'Profile' },
];

export default function ClientLayout() {
  return <AppShell nav={NAV} area="Client area" />;
}
