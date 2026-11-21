import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, clearSession, getSession, saveSession } from './api.js';

const ART_CLASSES = ['art-lilac', 'art-peach', 'art-mint', 'art-blue'];
const ART_SYMBOLS = ['✳', '◈', '✦', '⌁'];

function escapeText(value) {
  return value == null ? '' : String(value);
}

function formatDate(value) {
  if (!value) return 'Date to be announced';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function Brand({ footer = false }) {
  return (
    <a className={'brand' + (footer ? ' footer-brand' : '')} href="/" aria-label="EventEase home">
      <span className="brand-mark">E</span>
      <span>event<span className="brand-accent">ease</span></span>
    </a>
  );
}

function Eyebrow({ children, dot = false }) {
  return (
    <div className="eyebrow">
      {dot && <span className="eyebrow-dot" />}
      {children}
    </div>
  );
}

function EmptyState({ icon = '✳', title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function MetricCard({ label, value = 0, icon = '✦', note = '' }) {
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value ?? 0}</strong>
      <small>{note}</small>
    </article>
  );
}

function StatusPill({ status }) {
  const classes = {
    Confirmed: 'status-confirmed',
    Cancelled: 'status-cancelled',
    Waiting: 'status-waiting',
    Promoted: 'status-confirmed'
  };
  return <span className={'status-pill ' + (classes[status] || 'status-waiting')}>{status}</span>;
}

function EventCard({ event, index, onBook, seatCount, onSeatChange }) {
  const available = Number(event.availableSeats || 0);
  const maxSeats = Math.min(20, Math.max(1, Number(event.totalSeats || 1)));
  return (
    <article className="event-card">
      <div className={'event-art ' + ART_CLASSES[index % ART_CLASSES.length]}>
        <span className="art-index">EVENT / {String(index + 1).padStart(2, '0')}</span>
        <span className="art-symbol">{ART_SYMBOLS[index % ART_SYMBOLS.length]}</span>
        <span className="art-category">{event.category}</span>
      </div>
      <div className="event-card-body">
        <div className="event-date-line">
          <span>◷ {formatDate(event.eventDate)}</span>
          <span className={'seat-state' + (available === 0 ? ' sold-out' : '')}>
            {available > 0 ? available + ' seats left' : 'Fully booked'}
          </span>
        </div>
        <h3>{event.eventName}</h3>
        <p className="event-description">
          {event.description || 'A chance to learn, connect and experience something new.'}
        </p>
        <div className="event-venue">⌖ {event.venue}</div>
        <div className="event-card-footer">
          <div className="event-price">
            <strong>{formatMoney(event.registrationFee)}</strong>
            <span>/ seat</span>
          </div>
          <select
            className="event-seat-picker"
            aria-label={'Number of seats for ' + event.eventName}
            value={seatCount || 1}
            onChange={(eventChange) => onSeatChange(event._id, Number(eventChange.target.value))}
          >
            {Array.from({ length: maxSeats }, (_, value) => (
              <option key={value + 1} value={value + 1}>{value + 1}</option>
            ))}
          </select>
          <button className="button button-dark button-small" onClick={() => onBook(event._id, seatCount || 1)}>
            {available > 0 ? 'Reserve ↗' : 'Waitlist ↗'}
          </button>
        </div>
      </div>
    </article>
  );
}

function ModalFrame({ children, onClose, className = '' }) {
  return (
    <div className="modal-scrim" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={'modal-card ' + className} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">×</button>
        {children}
      </section>
    </div>
  );
}

function AuthModal({ mode, setMode, onSubmit, busy, onClose }) {
  return (
    <ModalFrame onClose={onClose} className="auth-modal">
      <Eyebrow>WELCOME TO EVENTEASE</Eyebrow>
      <h2>{mode === 'register' ? 'Make room for more.' : 'Good to see you again.'}</h2>
      <p className="muted">
        {mode === 'register'
          ? 'Create an account and start saving your place.'
          : 'Sign in to pick up where you left off.'}
      </p>
      <div className="auth-switch">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button>
      </div>
      <form className="form-stack" onSubmit={onSubmit}>
        {mode === 'register' && (
          <label className="field">
            Full name
            <input name="name" required minLength="2" maxLength="80" autoComplete="name" />
          </label>
        )}
        <label className="field">
          Email address
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="field">
          Password
          <input
            name="password"
            type="password"
            required
            minLength="8"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
        </label>
        <button className="button button-primary button-full" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'register' ? 'Create account ↗' : 'Sign in ↗'}
        </button>
      </form>
      <small className="form-footnote">Admin access is provisioned separately. Public registration always creates a normal attendee account.</small>
    </ModalFrame>
  );
}

function TicketModal({ ticket, onClose }) {
  return (
    <ModalFrame onClose={onClose} className="ticket-modal">
      <div className="ticket-header">
        <Eyebrow>YOUR EVENT PASS</Eyebrow>
        <StatusPill status="Confirmed" />
      </div>
      <h2>{ticket.event?.eventName}</h2>
      <p className="muted">{formatDate(ticket.event?.eventDate)} · {ticket.event?.venue}</p>
      <div className="qr-frame">
        <img src={ticket.qrImageUrl} alt="QR code ticket for EventEase booking" />
        <span>Show this code at the event entrance</span>
      </div>
      <div className="ticket-code">
        <span>SECURE TICKET CODE</span>
        <strong>{ticket.ticketCode}</strong>
      </div>
      <div className="ticket-detail-grid">
        <div><small>Seats</small><strong>{ticket.numberOfSeats}</strong></div>
        <div><small>Booking amount</small><strong>{formatMoney(ticket.totalAmount)}</strong></div>
        <div><small>Booking reference</small><strong>{String(ticket.registrationId).slice(-8).toUpperCase()}</strong></div>
      </div>
      <p className="form-footnote">
        The QR contains an opaque ticket code. Only an authenticated EventEase Admin can validate or check it in.
      </p>
      <button className="button button-dark button-full" onClick={onClose}>Done</button>
    </ModalFrame>
  );
}

function ApiNotice({ message }) {
  if (!message) return null;
  return (
    <section className="api-notice" role="status">
      <span className="api-notice-icon">i</span>
      <div>
        <strong>Frontend is live — backend setup is pending</strong>
        <p>{message}</p>
      </div>
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState(getSession);
  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [apiUnavailable, setApiUnavailable] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [seatCounts, setSeatCounts] = useState({});
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [adminEventId, setAdminEventId] = useState('');
  const [attendeeData, setAttendeeData] = useState(null);
  const [attendeeError, setAttendeeError] = useState('');
  const [toast, setToast] = useState(null);
  const user = session.user;
  const isAdmin = user?.role === 'Admin';

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadEvents = useCallback(async () => {
    try {
      const response = await api('/api/events?limit=100');
      setEvents(response.events || []);
      setApiUnavailable('');
    } catch (error) {
      if (error.status === 503) {
        setEvents([]);
        setApiUnavailable('The production API is waiting for a MongoDB replica-set connection. Configure MONGO_URI in Vercel Project Settings to enable live events, sign-in, bookings and Admin operations.');
        return;
      }
      throw error;
    }
  }, []);

  const loadAdminEvents = useCallback(async () => {
    const response = await api('/api/events/admin/all?limit=100');
    setEvents(response.events || []);
  }, []);

  const loadRegistrations = useCallback(async () => {
    const response = await api('/api/registrations/my');
    setRegistrations(response.registrations || []);
  }, []);

  const loadWaitlist = useCallback(async () => {
    const response = await api('/api/registrations/waitlist/my');
    setWaitlist(response.waitlist || []);
  }, []);

  const loadAnalytics = useCallback(async () => {
    const response = await api('/api/analytics/overview');
    setAnalytics(response);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadView() {
      try {
        if (tab === 'events') {
          await loadEvents();
        } else if (tab === 'bookings' && session.token) {
          await loadRegistrations();
        } else if (tab === 'waitlist' && session.token) {
          await loadWaitlist();
        } else if (tab === 'admin' && session.token && isAdmin) {
          await Promise.all([loadAdminEvents(), loadAnalytics()]);
        }
      } catch (error) {
        if (active) notify(error.message, 'error');
      }
    }
    loadView();
    return () => { active = false; };
  }, [tab, session.token, isAdmin, loadEvents, loadRegistrations, loadWaitlist, loadAdminEvents, loadAnalytics, notify]);

  const categories = useMemo(
    () => ['All', ...new Set(events.map((event) => event.category).filter(Boolean))],
    [events]
  );

  const filteredEvents = useMemo(() => events.filter((event) => {
    const haystack = [event.eventName, event.description, event.venue].join(' ').toLowerCase();
    return (!search || haystack.includes(search.toLowerCase()))
      && (category === 'All' || event.category === category);
  }), [events, search, category]);

  function selectTab(nextTab) {
    if (['bookings', 'waitlist', 'admin'].includes(nextTab) && !session.token) {
      setAuthMode('login');
      setModal('auth');
      return;
    }
    if (nextTab === 'admin' && !isAdmin) {
      notify('Admin access is required for this section.', 'error');
      return;
    }
    setTab(nextTab);
    setModal(null);
  }

  function requireAuth() {
    if (session.token && session.user) return true;
    setAuthMode('login');
    setModal('auth');
    return false;
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    setLoading(true);
    try {
      const response = await api(endpoint, { method: 'POST', body });
      saveSession(response);
      setSession({ token: response.token, user: response.user });
      setModal(null);
      setTab('events');
      notify('Welcome ' + response.user.name + '.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    clearSession();
    setSession({ token: '', user: null });
    setTab('events');
    setModal(null);
    setRegistrations([]);
    setWaitlist([]);
    notify('You have signed out.');
  }

  async function joinWaitlist(eventId, numberOfSeats = 1) {
    if (!requireAuth()) return;
    try {
      await api('/api/registrations/waitlist', {
        method: 'POST',
        body: { eventId, numberOfSeats }
      });
      notify('You are on the waitlist. Eligible requests are promoted as seats open.');
      setTab('waitlist');
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function bookEvent(eventId, numberOfSeats = 1) {
    if (!requireAuth()) return;
    try {
      await api('/api/registrations', {
        method: 'POST',
        body: { eventId, numberOfSeats }
      });
      notify('Your booking is confirmed. Find the ticket in My bookings.');
      setTab('bookings');
    } catch (error) {
      if (error.status === 409 && window.confirm(error.message + '\n\nWould you like to join the waitlist instead?')) {
        await joinWaitlist(eventId, numberOfSeats);
        return;
      }
      notify(error.message, 'error');
    }
  }

  async function cancelBooking(item) {
    const confirmed = window.confirm('Cancel this booking? The next eligible waitlist request may be promoted automatically.');
    if (!confirmed) return;
    try {
      const response = await api('/api/registrations/' + item._id + '/cancel', { method: 'PATCH' });
      const promoted = response.promotedFromWaitlist || 0;
      notify(promoted ? 'Booking cancelled. ' + promoted + ' waitlist request(s) promoted.' : 'Booking cancelled and seats released.');
      await loadRegistrations();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function cancelWaitlist(entry) {
    try {
      await api('/api/registrations/waitlist/' + entry._id, { method: 'DELETE' });
      notify('You have left the waitlist.');
      await loadWaitlist();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function showTicket(registrationId) {
    try {
      const response = await api('/api/registrations/' + registrationId + '/ticket');
      setModalData(response.ticket);
      setModal('ticket');
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function handleCreateEvent(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const data = Object.fromEntries(form.entries());
    data.totalSeats = Number(data.totalSeats);
    data.registrationFee = Number(data.registrationFee);
    data.eventDate = new Date(data.eventDate).toISOString();
    try {
      await api('/api/events', { method: 'POST', body: data });
      formElement.reset();
      notify('Event published successfully.');
      await loadAdminEvents();
      await loadAnalytics();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function handleUpdateEvent(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    const eventId = data.eventId;
    delete data.eventId;
    data.totalSeats = Number(data.totalSeats);
    data.registrationFee = Number(data.registrationFee);
    data.eventDate = new Date(data.eventDate).toISOString();
    try {
      await api('/api/events/' + eventId, { method: 'PUT', body: data });
      setModal(null);
      notify('Event details updated.');
      await loadAdminEvents();
      await loadAnalytics();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function handleDeleteEvent(eventItem) {
    if (!window.confirm('Delete "' + eventItem.eventName + '"? Events with confirmed registrations cannot be deleted.')) return;
    try {
      await api('/api/events/' + eventItem._id, { method: 'DELETE' });
      notify('Event deleted.');
      if (adminEventId === eventItem._id) {
        setAdminEventId('');
        setAttendeeData(null);
      }
      await loadAdminEvents();
      await loadAnalytics();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function showEventAnalytics(eventItem) {
    try {
      const result = await api('/api/events/' + eventItem._id + '/analytics');
      setModalData(result);
      setModal('event-analytics');
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function loadAttendees() {
    if (!adminEventId) {
      notify('Select an event first.', 'error');
      return;
    }
    setAttendeeError('');
    setAttendeeData(null);
    try {
      const [registrationsResult, waitlistResult] = await Promise.all([
        api('/api/registrations/event/' + adminEventId),
        api('/api/registrations/event/' + adminEventId + '/waitlist')
      ]);
      setAttendeeData({
        registrations: registrationsResult.registrations || [],
        waitlist: waitlistResult.waitlist || []
      });
    } catch (error) {
      setAttendeeError(error.message);
    }
  }

  async function handleCheckIn(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const code = new FormData(formElement).get('ticketCode');
    try {
      const response = await api('/api/registrations/check-in', {
        method: 'POST',
        body: { ticketCode: code }
      });
      notify('Checked in: ' + (response.checkIn.attendee?.name || 'attendee') + '.');
      formElement.reset();
      if (adminEventId) await loadAttendees();
      await loadAnalytics();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  const pageContent = (() => {
    if (tab === 'events') {
      return (
        <>
          <section className="hero">
            <div className="hero-copy">
              <Eyebrow dot>DISCOVER YOUR NEXT EXPERIENCE</Eyebrow>
              <h1>Good things happen<br />when <span className="gradient-text">we get together.</span></h1>
              <p>Find meaningful events, save your seat, and keep every ticket in one calm, organised place.</p>
              <div className="hero-meta">
                <span>✦ Curated experiences</span>
                <span>↗ Secure reservations</span>
                <span>⌁ Simple check-in</span>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <div className="hero-card card-back"><span>YOUR NEXT</span><strong>big idea.</strong><i>✦</i></div>
              <div className="hero-card card-front">
                <div className="ticket-top"><span>EVENT PASS</span><span className="ticket-dot" /></div>
                <div className="ticket-glyph">✳</div>
                <strong>Make it<br />memorable.</strong>
                <div className="ticket-bottom"><span>DISCOVER · CONNECT · CREATE</span><span>EE / 026</span></div>
              </div>
              <div className="floating-tag tag-top">✦ Find your people</div>
              <div className="floating-tag tag-bottom">01 / 03 — Your next event</div>
            </div>
          </section>
          <ApiNotice message={apiUnavailable} />
          <section className="section-heading">
            <div>
              <Eyebrow>THE LINEUP</Eyebrow>
              <h2>Explore events</h2>
              <p className="muted">A little inspiration for your calendar.</p>
            </div>
            <div className="event-count"><strong>{String(filteredEvents.length).padStart(2, '0')}</strong><span>events found</span></div>
          </section>
          <section className="filter-bar">
            <label className="search-field">
              <span>⌕</span>
              <input type="search" placeholder="Search events, topics or venues…" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <div className="category-filters">
              {categories.map((item) => (
                <button key={item} className={'filter-pill' + (category === item ? ' selected' : '')} onClick={() => setCategory(item)}>{item}</button>
              ))}
            </div>
          </section>
          <section className="event-grid">
            {filteredEvents.length ? filteredEvents.map((event, index) => (
              <EventCard
                key={event._id}
                event={event}
                index={index}
                seatCount={seatCounts[event._id] || 1}
                onSeatChange={(id, value) => setSeatCounts((current) => ({ ...current, [id]: value }))}
                onBook={bookEvent}
              />
            )) : (
              <div className="empty-state wide">
                <div className="empty-icon">✳</div>
                <h3>{apiUnavailable ? 'Event catalogue is waiting to connect' : 'No events found'}</h3>
                <p>{apiUnavailable ? 'Once the production database is connected, upcoming events will appear here.' : 'Try another search or category.'}</p>
              </div>
            )}
          </section>
        </>
      );
    }

    if (tab === 'bookings') {
      const active = registrations.filter((item) => item.registrationStatus === 'Confirmed');
      const past = registrations.filter((item) => item.registrationStatus === 'Cancelled');
      return (
        <>
          <DashboardIntro
            eyebrow="YOUR EVENT SPACE"
            title="My bookings"
            description="All your confirmed seats, tickets and event details."
            stat={active.length}
            statLabel="active bookings"
          />
          <section className="content-panel">
            <div className="panel-heading">
              <div><h2>Confirmed tickets</h2><p className="muted">Your next experiences, ready when you are.</p></div>
              <span className="count-badge">{active.length}</span>
            </div>
            {active.length ? (
              <div className="booking-list">
                {active.map((item) => <BookingRow key={item._id} item={item} onTicket={showTicket} onCancel={cancelBooking} />)}
              </div>
            ) : (
              <EmptyState
                icon="⌁"
                title="Your calendar is waiting"
                description="Explore events and reserve your first seat."
                action={<button className="button button-primary" onClick={() => selectTab('events')}>Explore events</button>}
              />
            )}
          </section>
          {past.length > 0 && (
            <section className="content-panel">
              <div className="panel-heading"><div><h2>Past / cancelled</h2><p className="muted">A record of previous booking activity.</p></div><span className="count-badge">{past.length}</span></div>
              <div className="booking-list">
                {past.map((item) => (
                  <div className="booking-row compact" key={item._id}>
                    <div className="booking-main">
                      <h3>{item.eventId?.eventName || 'Event'}</h3>
                      <p>{formatDate(item.eventId?.eventDate)} · {item.numberOfSeats} seat(s)</p>
                    </div>
                    <StatusPill status="Cancelled" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      );
    }

    if (tab === 'waitlist') {
      const waiting = waitlist.filter((item) => item.status === 'Waiting').length;
      return (
        <>
          <DashboardIntro
            eyebrow="THE NEXT IN LINE"
            title="Your waitlist"
            description="When a spot opens up, EventEase promotes the oldest eligible request automatically."
            stat={waiting}
            statLabel="active requests"
          />
          <section className="content-panel">
            <div className="panel-heading"><div><h2>Waitlist activity</h2><p className="muted">Requests are processed in first-in, first-out order.</p></div></div>
            {waitlist.length ? (
              <div className="booking-list">
                {waitlist.map((item) => (
                  <div className="booking-row" key={item._id}>
                    <div className="waitlist-number">#{String(item._id).slice(-4).toUpperCase()}</div>
                    <div className="booking-main">
                      <h3>{item.eventId?.eventName || 'Event'}</h3>
                      <p>{formatDate(item.eventId?.eventDate)} · {item.numberOfSeats} seat(s)</p>
                      <small>Joined {formatDate(item.joinedAt)}</small>
                    </div>
                    <StatusPill status={item.status} />
                    {item.status === 'Promoted' && item.promotedRegistrationId?._id && (
                      <button className="button button-outline button-small" onClick={() => showTicket(item.promotedRegistrationId._id)}>View ticket</button>
                    )}
                    {item.status === 'Waiting' && (
                      <button className="text-button danger-text" onClick={() => cancelWaitlist(item)}>Leave waitlist</button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="↗"
                title="No waitlist requests"
                description="When an event is fully booked for your group size, you can join its waitlist from the event card."
              />
            )}
          </section>
        </>
      );
    }

    if (tab === 'admin' && isAdmin) {
      const metrics = analytics?.metrics || {};
      const topEvents = analytics?.topEvents || [];
      const maxRegistrations = Math.max(1, ...topEvents.map((item) => item.bookingStats?.registrations || 0));
      return (
        <>
          <DashboardIntro
            eyebrow="CONTROL ROOM"
            title="Admin studio"
            description="A clearer picture of your events, attendees and operations."
            badge="✦ ADMIN ACCESS"
          />
          <section className="metric-grid">
            <MetricCard label="Total users" value={metrics.totalUsers} icon="↗" note="Audience" />
            <MetricCard label="Upcoming events" value={metrics.upcomingEvents} icon="✳" note="On the calendar" />
            <MetricCard label="Confirmed seats" value={metrics.confirmedSeats} icon="⌁" note="Reservations" />
            <MetricCard label="Active waitlist" value={metrics.activeWaitlistRequests} icon="↗" note="Waiting requests" />
            <MetricCard label="Confirmed revenue" value={formatMoney(metrics.grossConfirmedRevenue)} icon="₹" note="Gross booking value" />
          </section>

          <div className="admin-layout">
            <section className="content-panel">
              <div className="panel-heading"><div><h2>Create an event</h2><p className="muted">Publish a new experience to the event catalogue.</p></div><span className="panel-icon">＋</span></div>
              <EventForm onSubmit={handleCreateEvent} submitLabel="Publish event ↗" />
            </section>
            <section className="content-panel">
              <div className="panel-heading"><div><h2>Event performance</h2><p className="muted">Top events by confirmed registrations.</p></div></div>
              {topEvents.length ? (
                <div className="chart-list">
                  {topEvents.map((item) => {
                    const count = item.bookingStats?.registrations || 0;
                    return (
                      <div className="chart-item" key={item._id}>
                        <div className="chart-label"><span>{item.eventName}</span><strong>{count}</strong></div>
                        <div className="chart-track"><span style={{ width: ((count / maxRegistrations) * 100) + '%' }} /></div>
                        <small>{item.category || ''} · {item.bookingStats?.seats || 0} seats booked</small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state small-empty"><p>No booking data yet. Performance will appear here after the first registration.</p></div>
              )}
            </section>
          </div>

          <section className="content-panel">
            <div className="panel-heading"><div><h2>Manage events</h2><p className="muted">Edit details, inspect performance, or remove events without active bookings.</p></div><span className="count-badge">{events.length}</span></div>
            {events.length ? (
              <div className="table-wrap">
                <table className="event-admin-table">
                  <thead><tr><th>Event</th><th>Date</th><th>Availability</th><th>Actions</th></tr></thead>
                  <tbody>
                    {events.map((item) => (
                      <tr key={item._id}>
                        <td><strong>{item.eventName}</strong><small>{item.category} · {item.venue}</small></td>
                        <td>{formatDate(item.eventDate)}</td>
                        <td>{item.availableSeats} / {item.totalSeats} seats</td>
                        <td>
                          <div className="row-actions">
                            <button className="button button-outline button-small" onClick={() => { setModalData(item); setModal('edit-event'); }}>Edit</button>
                            <button className="button button-outline button-small" onClick={() => showEventAnalytics(item)}>Analytics</button>
                            <button className="button button-danger button-small" onClick={() => handleDeleteEvent(item)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="inline-note">No events have been created yet.</div>}
          </section>

          <section className="content-panel">
            <div className="panel-heading"><div><h2>Attendee operations</h2><p className="muted">Review registrations, waitlists and ticket check-ins.</p></div></div>
            <div className="admin-tools">
              <select value={adminEventId} onChange={(event) => { setAdminEventId(event.target.value); setAttendeeData(null); }}>
                <option value="">Select an event</option>
                {events.map((item) => <option key={item._id} value={item._id}>{item.eventName}</option>)}
              </select>
              <button className="button button-outline button-small" onClick={loadAttendees}>Load attendees</button>
            </div>
            {attendeeError && <div className="inline-note error-text">{attendeeError}</div>}
            {attendeeData && <AttendeeResults data={attendeeData} />}
            {!attendeeData && !attendeeError && <div className="inline-note">Choose an event to view attendee registrations.</div>}
            <div className="checkin-box">
              <div><strong>Quick ticket check-in</strong><p>Enter an attendee ticket code to validate it and mark entry.</p></div>
              <form className="checkin-form" onSubmit={handleCheckIn}>
                <input name="ticketCode" placeholder="Paste ticket code" minLength="32" maxLength="64" required />
                <button className="button button-dark button-small" type="submit">Verify ticket</button>
              </form>
            </div>
          </section>
          <p className="admin-footnote">Revenue represents confirmed booking value, not payment-provider settlement. Check-ins require a valid confirmed ticket.</p>
        </>
      );
    }

    return (
      <div className="error-state">
        <div className="empty-icon">!</div>
        <h2>That workspace is unavailable.</h2>
        <p>Sign in with the appropriate account or return to event discovery.</p>
        <button className="button button-primary" onClick={() => setTab('events')}>Explore events</button>
      </div>
    );
  })();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="main-nav" aria-label="Main navigation">
          <button className={'nav-link' + (tab === 'events' ? ' active' : '')} onClick={() => selectTab('events')}>Explore events</button>
          {user && <button className={'nav-link' + (tab === 'bookings' ? ' active' : '')} onClick={() => selectTab('bookings')}>My bookings</button>}
          {user && <button className={'nav-link' + (tab === 'waitlist' ? ' active' : '')} onClick={() => selectTab('waitlist')}>Waitlist</button>}
          {isAdmin && <button className={'nav-link' + (tab === 'admin' ? ' active' : '')} onClick={() => selectTab('admin')}>Admin studio</button>}
        </nav>
        <div className="topbar-actions">
          <a className="docs-link" href="/docs.html" target="_blank" rel="noreferrer">API docs ↗</a>
          {user ? (
            <div className="user-chip">
              <span className="avatar">{user.name?.slice(0, 1).toUpperCase() || 'U'}</span>
              <span>{user.name}</span>
              <button className="text-button" onClick={handleLogout}>Sign out</button>
            </div>
          ) : (
            <button className="button button-primary button-small" onClick={() => { setAuthMode('login'); setModal('auth'); }}>Sign in</button>
          )}
        </div>
      </header>

      <main className="page-content">{pageContent}</main>
      <footer className="footer">
        <Brand footer />
        <span>Thoughtful event management, from discovery to check-in.</span>
        <span>© {new Date().getFullYear()} EventEase · MIT</span>
      </footer>

      {modal === 'auth' && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onSubmit={handleAuthSubmit}
          busy={loading}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'ticket' && modalData && (
        <TicketModal ticket={modalData} onClose={() => setModal(null)} />
      )}
      {modal === 'edit-event' && modalData && (
        <ModalFrame onClose={() => setModal(null)} className="edit-event-modal">
          <Eyebrow>EVENT MANAGEMENT</Eyebrow>
          <h2>Edit event</h2>
          <p className="muted">Available seats are recalculated by the server. Capacity cannot be reduced below already reserved seats.</p>
          <EventForm event={modalData} onSubmit={handleUpdateEvent} submitLabel="Save changes ↗" />
        </ModalFrame>
      )}
      {modal === 'event-analytics' && modalData && (
        <ModalFrame onClose={() => setModal(null)}>
          <Eyebrow>EVENT PERFORMANCE</Eyebrow>
          <h2>{modalData.event.eventName}</h2>
          <p className="muted">{formatDate(modalData.event.eventDate)} · {modalData.event.venue}</p>
          <div className="metric-grid event-analytics-grid">
            <MetricCard label="Registrations" value={modalData.analytics.registrations} icon="↗" note="Confirmed" />
            <MetricCard label="Seats booked" value={modalData.analytics.confirmedSeats} icon="⌁" note="Reserved" />
            <MetricCard label="Occupancy" value={modalData.analytics.occupancyRate + '%'} icon="◒" note="Capacity used" />
            <MetricCard label="Check-ins" value={modalData.analytics.checkIns} icon="✓" note="Attendees arrived" />
          </div>
          <div className="inline-note">Gross confirmed booking value: <strong>{formatMoney(modalData.analytics.grossConfirmedRevenue)}</strong>. This is not a payment-settlement report.</div>
          <button className="button button-dark button-full" style={{ marginTop: 16 }} onClick={() => setModal(null)}>Done</button>
        </ModalFrame>
      )}
      {toast && <div className={'toast ' + (toast.type === 'error' ? 'toast-error' : '')}>{toast.message}</div>}
    </div>
  );
}

function DashboardIntro({ eyebrow, title, description, stat, statLabel, badge }) {
  return (
    <section className="dashboard-intro">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}<span className="gradient-text">.</span></h1>
        <p>{description}</p>
      </div>
      {badge ? <span className="admin-badge">{badge}</span> : (
        <div className="dashboard-stat"><strong>{stat}</strong><span>{statLabel}</span></div>
      )}
    </section>
  );
}

function EventForm({ event, onSubmit, submitLabel }) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      {event && <input type="hidden" name="eventId" value={event._id} />}
      <label className="field field-full">Event name
        <input name="eventName" required minLength="3" maxLength="120" defaultValue={event?.eventName || ''} placeholder="e.g. Product Design Summit" />
      </label>
      <label className="field">Category
        <input name="category" required minLength="2" maxLength="60" defaultValue={event?.category || ''} placeholder="Technology" />
      </label>
      <label className="field">Venue
        <input name="venue" required minLength="2" maxLength="200" defaultValue={event?.venue || ''} placeholder="City / venue" />
      </label>
      <label className="field field-full">Description
        <textarea name="description" maxLength="2000" rows="3" defaultValue={event?.description || ''} placeholder="What should attendees expect?" />
      </label>
      <label className="field">Event date &amp; time
        <input name="eventDate" type="datetime-local" required defaultValue={toDateTimeInput(event?.eventDate)} />
      </label>
      <label className="field">Total seats
        <input name="totalSeats" type="number" min="1" max="100000" required defaultValue={event?.totalSeats || ''} />
      </label>
      <label className="field">Fee per seat (₹)
        <input name="registrationFee" type="number" min="0" step="0.01" required defaultValue={event?.registrationFee ?? 0} />
      </label>
      <div className="field field-full">
        <button className="button button-primary" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}

function BookingRow({ item, onTicket, onCancel }) {
  const date = new Date(item.eventId?.eventDate || item.registrationDate);
  return (
    <article className="booking-row">
      <div className="booking-date">
        <strong>{date.getDate()}</strong>
        <span>{date.toLocaleString('en-IN', { month: 'short' }).toUpperCase()}</span>
      </div>
      <div className="booking-main">
        <h3>{item.eventId?.eventName || 'Event'}</h3>
        <p>⌖ {item.eventId?.venue || 'Venue pending'} · {formatDate(item.eventId?.eventDate)}</p>
        <small>Booking ref {String(item._id).slice(-8).toUpperCase()} · {item.numberOfSeats} seat(s)</small>
      </div>
      <div className="booking-actions">
        <button className="button button-outline button-small" onClick={() => onTicket(item._id)}>View ticket</button>
        <button className="text-button danger-text" onClick={() => onCancel(item)}>Cancel</button>
      </div>
    </article>
  );
}

function AttendeeResults({ data }) {
  const rows = data.registrations || [];
  const confirmed = rows.filter((item) => item.registrationStatus === 'Confirmed').length;
  const checkedIn = rows.filter((item) => item.checkedInAt).length;
  const queue = data.waitlist || [];
  return (
    <>
      <div className="attendee-summary">
        <span><strong>{confirmed}</strong> confirmed</span>
        <span><strong>{queue.length}</strong> waiting</span>
        <span><strong>{checkedIn}</strong> checked in</span>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Attendee</th><th>Seats</th><th>Status</th><th>Check-in</th></tr></thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item._id}>
                  <td><strong>{item.userId?.name || 'Attendee'}</strong><small>{item.userId?.email || ''}</small></td>
                  <td>{item.numberOfSeats}</td>
                  <td><StatusPill status={item.registrationStatus} /></td>
                  <td>{item.checkedInAt ? <span className="checked-label">✓ {formatDate(item.checkedInAt)}</span> : <span className="muted">Not yet</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="inline-note">No registrations for this event yet.</div>}
      {queue.length > 0 && (
        <div className="waitlist-note">
          <strong>Waitlist queue</strong>
          <p>{queue.map((item, index) => (
            <React.Fragment key={item._id}>
              #{index + 1} {item.userId?.name || 'Attendee'} · {item.numberOfSeats} seat(s)<br />
            </React.Fragment>
          ))}</p>
        </div>
      )}
    </>
  );
}
