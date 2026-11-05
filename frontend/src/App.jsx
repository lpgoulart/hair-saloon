import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './lib/auth.jsx';
import Landing from './pages/Landing.jsx';
import { Login, Register } from './pages/AuthPages.jsx';
import ClientLayout from './client/ClientLayout.jsx';
import ClientAppointments from './client/ClientAppointments.jsx';
import ClientBook from './client/ClientBook.jsx';
import ClientProfile from './client/ClientProfile.jsx';
import StaffLayout from './staff/StaffLayout.jsx';
import StaffStats from './staff/StaffStats.jsx';
import StaffSchedule from './staff/StaffSchedule.jsx';
import StaffAppointments from './staff/StaffAppointments.jsx';
import StaffClients from './staff/StaffClients.jsx';
import StaffServices from './staff/StaffServices.jsx';
import StaffToday from './staff/StaffToday.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/book" element={<Navigate to="/account/book" replace />} />

      <Route path="/account" element={<RequireAuth role="client"><ClientLayout /></RequireAuth>}>
        <Route index element={<Navigate to="/account/appointments" replace />} />
        <Route path="appointments" element={<ClientAppointments />} />
        <Route path="book" element={<ClientBook />} />
        <Route path="profile" element={<ClientProfile />} />
      </Route>

      <Route path="/staff" element={<RequireAuth role="staff"><StaffLayout /></RequireAuth>}>
        <Route index element={<StaffToday />} />
        <Route path="schedule" element={<StaffSchedule />} />
        <Route path="appointments" element={<StaffAppointments />} />
        <Route path="clients" element={<StaffClients />} />
        <Route path="services" element={<StaffServices />} />
        <Route path="stats" element={<StaffStats />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
