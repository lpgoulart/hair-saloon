import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BookingFlow from '../components/BookingFlow.jsx';
import { PageHead, Panel, Status } from '../components/ui.jsx';
import { fmtLongDay, fmtTime, money } from '../lib/format.js';

export default function ClientBook() {
  const [params] = useSearchParams();
  const [done, setDone] = useState(null);
  const initial = {
    serviceId: params.get('service'), staffId: params.get('staff'), date: params.get('date'), time: params.get('time'),
  };

  if (done) {
    return (
      <>
        <PageHead title="You are booked" sub="A confirmation is in your appointments. You can move or cancel it there." />
        <Panel>
          <div className="next">
            <p className="next-when display">{fmtLongDay(done.startAt)} &middot; {fmtTime(done.startAt)}</p>
            <p className="next-what"><strong>{done.serviceName}</strong> with {done.staffName} &middot; {money(done.priceCents)}</p>
            <Status value={done.status} />
            <div className="row-gap">
              <Link to="/account/appointments" className="btn">See my appointments</Link>
              <button type="button" className="btn ghost" onClick={() => setDone(null)}>Book another</button>
            </div>
          </div>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHead title="Book a visit" sub="Every time shown is free right now in the studio's book." />
      <Panel>
        <BookingFlow initial={initial} onDone={setDone} />
      </Panel>
    </>
  );
}
