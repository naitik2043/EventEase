import { api, saveSession, clearSession, getSession } from './api.js';

const state = {
  ...getSession(),
  tab: 'events',
  events: [],
  registrations: [],
  waitlist: [],
  analytics: null,
  loading: false,
  search: '',
  category: 'All',
  modal: null,
  selectedEvent: null,
  adminEventId: ''
};

const appRoot = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-region');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(new Date(value))
    : 'Date to be announced';
}

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function toLocalDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast toast-${type}`;
  item.textContent = message;
  toastRoot.append(item);
  window.setTimeout(() => item.remove(), 3600);
}

function setLoading(value) {
  state.loading = value;
  document.querySelectorAll('[data-loading-label]').forEach((node) => {
    node.textContent = value ? 'Please wait…' : node.dataset.loadingLabel;
  });
  document.querySelectorAll('button[type="submit"]').forEach((button) => {
    button.disabled = value;
  });
}

function authButton() {
  if (state.user) {
    return `<div class="user-chip"><span class="avatar">${escapeHtml(state.user.name?.slice(0, 1).toUpperCase() || 'U')}</span><span>${escapeHtml(state.user.name)}</span><button class="text-button" data-action="logout">Sign out</button></div>`;
  }
  return '<button class="button button-primary button-small" data-action="open-auth">Sign in</button>';
}

function shell(content) {
  const admin = state.user?.role === 'Admin';
  appRoot.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="#" data-action="home"><span class="brand-mark">E</span><span>event<span class="brand-accent">ease</span></span></a>
        <nav class="main-nav">
          <button class="nav-link ${state.tab === 'events' ? 'active' : ''}" data-tab="events">Explore events</button>
          ${state.user ? `<button class="nav-link ${state.tab === 'bookings' ? 'active' : ''}" data-tab="bookings">My bookings</button><button class="nav-link ${state.tab === 'waitlist' ? 'active' : ''}" data-tab="waitlist">Waitlist</button>` : ''}
          ${admin ? `<button class="nav-link ${state.tab === 'admin' ? 'active' : ''}" data-tab="admin">Admin studio</button>` : ''}
        </nav>
        <div class="topbar-actions"><a class="docs-link" href="/docs.html" target="_blank" rel="noreferrer">API docs ↗</a>${authButton()}</div>
      </header>
      <main class="page-content">${content}</main>
      <footer class="footer"><div class="brand footer-brand"><span class="brand-mark">E</span><span>event<span class="brand-accent">ease</span></span></div><span>Thoughtful event management, from discovery to check-in.</span><span>© ${new Date().getFullYear()} EventEase · MIT</span></footer>
    </div>
    ${state.modal ? renderModal() : ''}
  `;
}

function renderEvents() {
  const categories = ['All', ...new Set(state.events.map((event) => event.category).filter(Boolean))];
  const filtered = state.events.filter((event) => {
    const matchesSearch = !state.search || `${event.eventName} ${event.description} ${event.venue}`.toLowerCase().includes(state.search.toLowerCase());
    const matchesCategory = state.category === 'All' || event.category === state.category;
    return matchesSearch && matchesCategory;
  });

  return `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span> DISCOVER YOUR NEXT EXPERIENCE</div>
        <h1>Good things happen<br>when <span class="gradient-text">we get together.</span></h1>
        <p>Find meaningful events, save your seat, and keep every ticket in one calm, organised place.</p>
        <div class="hero-meta"><span>✦ Curated experiences</span><span>↗ Secure reservations</span><span>⌁ Simple check-in</span></div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div>
        <div class="hero-card card-back"><span>YOUR NEXT</span><strong>big idea.</strong><i>✦</i></div>
        <div class="hero-card card-front"><div class="ticket-top"><span>EVENT PASS</span><span class="ticket-dot"></span></div><div class="ticket-glyph">✳</div><strong>Make it<br>memorable.</strong><div class="ticket-bottom"><span>DISCOVER · CONNECT · CREATE</span><span>EE / 026</span></div></div>
        <div class="floating-tag tag-top">✦  Find your people</div><div class="floating-tag tag-bottom">01 / 03 — Your next event</div>
      </div>
    </section>

    <section class="section-heading">
      <div><div class="eyebrow">THE LINEUP</div><h2>Explore events</h2><p class="muted">A little inspiration for your calendar.</p></div>
      <div class="event-count"><strong>${filtered.length.toString().padStart(2, '0')}</strong><span>events found</span></div>
    </section>
    <section class="filter-bar">
      <label class="search-field"><span>⌕</span><input id="event-search" type="search" placeholder="Search events, topics or venues…" value="${escapeHtml(state.search)}"></label>
      <div class="category-filters">${categories.map((category) => `<button class="filter-pill ${state.category === category ? 'selected' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('')}</div>
    </section>
    <section class="event-grid">
      ${filtered.length ? filtered.map(renderEventCard).join('') : '<div class="empty-state wide"><div class="empty-icon">✳</div><h3>No events found</h3><p>Try another search or category.</p></div>'}
    </section>
  `;
}

const artClasses = ['art-lilac', 'art-peach', 'art-mint', 'art-blue'];
const artSymbols = ['✳', '◈', '✦', '⌁'];
function renderEventCard(event, index = 0) {
  const availability = Number(event.availableSeats || 0);
  return `
    <article class="event-card">
      <div class="event-art ${artClasses[index % artClasses.length]}">
        <span class="art-index">EVENT / ${String(index + 1).padStart(2, '0')}</span>
        <span class="art-symbol">${artSymbols[index % artSymbols.length]}</span>
        <span class="art-category">${escapeHtml(event.category)}</span>
      </div>
      <div class="event-card-body">
        <div class="event-date-line"><span>◷ ${escapeHtml(formatDate(event.eventDate))}</span><span class="seat-state ${availability === 0 ? 'sold-out' : ''}">${availability > 0 ? `${availability} seats left` : 'Fully booked'}</span></div>
        <h3>${escapeHtml(event.eventName)}</h3>
        <p class="event-description">${escapeHtml(event.description || 'A chance to learn, connect and experience something new.')}</p>
        <div class="event-venue">⌖ ${escapeHtml(event.venue)}</div>
        <div class="event-card-footer"><div class="event-price"><strong>${money(event.registrationFee)}</strong><span>/ seat</span></div><select class="event-seat-picker" data-seat-count aria-label="Number of seats">${Array.from({ length: Math.min(20, Math.max(1, event.totalSeats || 1)) }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join('')}</select><button class="button button-dark button-small" data-action="book" data-id="${event._id}">${availability ? 'Reserve ↗' : 'Waitlist ↗'}</button></div>
      </div>
    </article>
  `;
}

function renderBookings() {
  const active = state.registrations.filter((item) => item.registrationStatus === 'Confirmed');
  const past = state.registrations.filter((item) => item.registrationStatus === 'Cancelled');
  return `
    <section class="dashboard-intro"><div><div class="eyebrow">YOUR EVENT SPACE</div><h1>My bookings<span class="gradient-text">.</span></h1><p>All your confirmed seats, tickets and event details.</p></div><div class="dashboard-stat"><strong>${active.length}</strong><span>active bookings</span></div></section>
    <section class="content-panel">
      <div class="panel-heading"><div><h2>Confirmed tickets</h2><p class="muted">Your next experiences, ready when you are.</p></div><span class="count-badge">${active.length}</span></div>
      ${active.length ? `<div class="booking-list">${active.map((item) => `
        <article class="booking-row">
          <div class="booking-date"><strong>${new Date(item.eventId?.eventDate || item.registrationDate).getDate()}</strong><span>${new Date(item.eventId?.eventDate || item.registrationDate).toLocaleString('en-IN', {month:'short'}).toUpperCase()}</span></div>
          <div class="booking-main"><h3>${escapeHtml(item.eventId?.eventName || 'Event')}</h3><p>⌖ ${escapeHtml(item.eventId?.venue || 'Venue pending')} · ${formatDate(item.eventId?.eventDate)}</p><small>Booking ref ${escapeHtml(String(item._id).slice(-8).toUpperCase())} · ${item.numberOfSeats} seat(s)</small></div>
          <div class="booking-actions"><button class="button button-outline button-small" data-action="ticket" data-id="${item._id}">View ticket</button><button class="text-button danger-text" data-action="cancel-booking" data-id="${item._id}">Cancel</button></div>
        </article>`).join('')}</div>` : '<div class="empty-state"><div class="empty-icon">⌁</div><h3>Your calendar is waiting</h3><p>Explore events and reserve your first seat.</p><button class="button button-primary" data-tab="events">Explore events</button></div>'}
    </section>
    ${past.length ? `<section class="content-panel"><div class="panel-heading"><div><h2>Past / cancelled</h2><p class="muted">A record of previous booking activity.</p></div><span class="count-badge">${past.length}</span></div><div class="booking-list">${past.map((item) => `<div class="booking-row compact"><div class="booking-main"><h3>${escapeHtml(item.eventId?.eventName || 'Event')}</h3><p>${formatDate(item.eventId?.eventDate)} · ${item.numberOfSeats} seat(s)</p></div><span class="status-pill status-cancelled">Cancelled</span></div>`).join('')}</div></section>` : ''}
  `;
}

function renderWaitlist() {
  return `
    <section class="dashboard-intro"><div><div class="eyebrow">THE NEXT IN LINE</div><h1>Your waitlist<span class="gradient-text">.</span></h1><p>When a spot opens up, EventEase promotes the oldest eligible request automatically.</p></div><div class="dashboard-stat"><strong>${state.waitlist.filter((item) => item.status === 'Waiting').length}</strong><span>active requests</span></div></section>
    <section class="content-panel">
      <div class="panel-heading"><div><h2>Waitlist activity</h2><p class="muted">Requests are processed in first-in, first-out order.</p></div></div>
      ${state.waitlist.length ? `<div class="booking-list">${state.waitlist.map((item) => `
        <article class="booking-row">
          <div class="waitlist-number">#${String(item._id).slice(-4).toUpperCase()}</div>
          <div class="booking-main"><h3>${escapeHtml(item.eventId?.eventName || 'Event')}</h3><p>${formatDate(item.eventId?.eventDate)} · ${item.numberOfSeats} seat(s)</p><small>Joined ${formatDate(item.joinedAt)}</small></div>
          <span class="status-pill ${item.status === 'Promoted' ? 'status-confirmed' : item.status === 'Waiting' ? 'status-waiting' : 'status-cancelled'}">${escapeHtml(item.status)}</span>
          ${item.status === 'Promoted' && item.promotedRegistrationId?._id ? `<button class="button button-outline button-small" data-action="ticket" data-id="${item.promotedRegistrationId._id}">View ticket</button>` : ''}
          ${item.status === 'Waiting' ? `<button class="text-button danger-text" data-action="cancel-waitlist" data-id="${item._id}">Leave waitlist</button>` : ''}
        </article>`).join('')}</div>` : '<div class="empty-state"><div class="empty-icon">↗</div><h3>No waitlist requests</h3><p>When an event is fully booked for your group size, you can join its waitlist from the event card.</p></div>'}
    </section>
  `;
}

function renderAdmin() {
  const metrics = state.analytics?.metrics || {};
  const maxRegistrations = Math.max(1, ...(state.analytics?.topEvents || []).map((event) => event.bookingStats?.registrations || 0));
  return `
    <section class="dashboard-intro"><div><div class="eyebrow">CONTROL ROOM</div><h1>Admin studio<span class="gradient-text">.</span></h1><p>A clearer picture of your events, attendees and operations.</p></div><span class="admin-badge">✦ ADMIN ACCESS</span></section>
    <section class="metric-grid">
      ${metricCard('Total users', metrics.totalUsers, '↗', 'Audience')}
      ${metricCard('Upcoming events', metrics.upcomingEvents, '✳', 'On the calendar')}
      ${metricCard('Confirmed seats', metrics.confirmedSeats, '⌁', 'Reservations')}
      ${metricCard('Active waitlist', metrics.activeWaitlistRequests, '↗', 'Waiting requests')}
      ${metricCard('Confirmed revenue', money(metrics.grossConfirmedRevenue), '₹', 'Gross booking value')}
    </section>
    <div class="admin-layout">
      <section class="content-panel"><div class="panel-heading"><div><h2>Create an event</h2><p class="muted">Publish a new experience to the event catalogue.</p></div><span class="panel-icon">＋</span></div>
        <form id="create-event-form" class="form-grid">
          <label class="field field-full">Event name<input name="eventName" required minlength="3" maxlength="120" placeholder="e.g. Product Design Summit"></label>
          <label class="field">Category<input name="category" required minlength="2" maxlength="60" placeholder="Technology"></label>
          <label class="field">Venue<input name="venue" required minlength="2" maxlength="200" placeholder="City / venue"></label>
          <label class="field field-full">Description<textarea name="description" maxlength="2000" rows="3" placeholder="What should attendees expect?"></textarea></label>
          <label class="field">Event date & time<input name="eventDate" type="datetime-local" required></label>
          <label class="field">Total seats<input name="totalSeats" type="number" min="1" max="100000" required></label>
          <label class="field">Fee per seat (₹)<input name="registrationFee" type="number" min="0" step="0.01" required></label>
          <div class="field field-full"><button class="button button-primary" type="submit">Publish event ↗</button></div>
        </form>
      </section>
      <section class="content-panel"><div class="panel-heading"><div><h2>Event performance</h2><p class="muted">Top events by confirmed registrations.</p></div></div>
        ${state.analytics?.topEvents?.length ? `<div class="chart-list">${state.analytics.topEvents.map((event) => {
          const count = event.bookingStats?.registrations || 0;
          const width = Math.round((count / maxRegistrations) * 100);
          return `<div class="chart-item"><div class="chart-label"><span>${escapeHtml(event.eventName)}</span><strong>${count}</strong></div><div class="chart-track"><span style="width:${width}%"></span></div><small>${escapeHtml(event.category || '')} · ${event.bookingStats?.seats || 0} seats booked</small></div>`;
        }).join('')}</div>` : '<div class="empty-state small-empty"><p>No booking data yet. Performance will appear here after the first registration.</p></div>'}
      </section>
    </div>
    <section class="content-panel"><div class="panel-heading"><div><h2>Manage events</h2><p class="muted">Edit details, inspect event performance, or remove events with no active bookings.</p></div><span class="count-badge">${state.events.length}</span></div>
      ${state.events.length ? `<div class="table-wrap"><table class="event-admin-table"><thead><tr><th>Event</th><th>Date</th><th>Availability</th><th>Actions</th></tr></thead><tbody>${state.events.map((event) => `
        <tr>
          <td><strong>${escapeHtml(event.eventName)}</strong><small>${escapeHtml(event.category)} · ${escapeHtml(event.venue)}</small></td>
          <td>${escapeHtml(formatDate(event.eventDate))}</td>
          <td>${event.availableSeats} / ${event.totalSeats} seats</td>
          <td><div class="row-actions">
            <button class="button button-outline button-small" data-action="edit-event" data-id="${event._id}">Edit</button>
            <button class="button button-outline button-small" data-action="event-analytics" data-id="${event._id}">Analytics</button>
            <button class="button button-danger button-small" data-action="delete-event" data-id="${event._id}">Delete</button>
          </div></td>
        </tr>`).join('')}</tbody></table></div>` : '<div class="inline-note">No events have been created yet.</div>'}
    </section>
    <section class="content-panel"><div class="panel-heading"><div><h2>Attendee operations</h2><p class="muted">Choose an event to review registrations and check tickets in.</p></div></div>
      <div class="admin-tools"><select id="admin-event-select"><option value="">Select an event</option>${state.events.map((event) => `<option value="${event._id}" ${state.adminEventId === event._id ? 'selected' : ''}>${escapeHtml(event.eventName)}</option>`).join('')}</select><button class="button button-outline button-small" data-action="load-attendees">Load attendees</button></div>
      <div id="attendee-results" class="attendee-results"><div class="inline-note">Choose an event to view attendee registrations.</div></div>
      <div class="checkin-box"><div><strong>Quick ticket check-in</strong><p>Enter the attendee's ticket code to validate and mark entry.</p></div><form id="checkin-form" class="checkin-form"><input name="ticketCode" placeholder="Paste ticket code" minlength="32" required><button class="button button-dark button-small" type="submit">Verify ticket</button></form></div>
    </section>
    <p class="admin-footnote">Analytics reflect confirmed registrations only. Revenue is a booking total, not a payment-provider settlement report.</p>
  `;
}

function metricCard(label, value = 0, icon = '✦', note = '') {
  return `<article class="metric-card"><div class="metric-card-top"><span>${escapeHtml(label)}</span><span class="metric-icon">${icon}</span></div><strong>${escapeHtml(value ?? 0)}</strong><small>${escapeHtml(note)}</small></article>`;
}

function renderModal() {
  if (state.modal === 'auth') {
    return `<div class="modal-scrim" data-action="close-modal"><section class="modal-card auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onclick="event.stopPropagation()"><button class="modal-close" data-action="close-modal" aria-label="Close">×</button><div class="eyebrow">WELCOME TO EVENTEASE</div><h2 id="auth-title">${state.authMode === 'register' ? 'Make room for more.' : 'Good to see you again.'}</h2><p class="muted">${state.authMode === 'register' ? 'Create an account and start saving your place.' : 'Sign in to pick up where you left off.'}</p>
      <div class="auth-switch"><button class="${state.authMode !== 'register' ? 'active' : ''}" data-auth-mode="login">Sign in</button><button class="${state.authMode === 'register' ? 'active' : ''}" data-auth-mode="register">Create account</button></div>
      <form id="auth-form" class="form-stack">
        ${state.authMode === 'register' ? '<label class="field">Full name<input name="name" required minlength="2" maxlength="80" autocomplete="name"></label>' : ''}
        <label class="field">Email address<input name="email" type="email" required autocomplete="email"></label>
        <label class="field">Password<input name="password" type="password" required minlength="8" autocomplete="${state.authMode === 'register' ? 'new-password' : 'current-password'}"></label>
        <button type="submit" class="button button-primary button-full" data-loading-label="${state.authMode === 'register' ? 'Create account ↗' : 'Sign in ↗'}">${state.authMode === 'register' ? 'Create account ↗' : 'Sign in ↗'}</button>
      </form>
      <small class="form-footnote">By continuing, you agree to use EventEase responsibly. Admin access is provisioned separately.</small>
    </section></div>`;
  }

  if (state.modal === 'ticket') {
    const ticket = state.modalData;
    return `<div class="modal-scrim" data-action="close-modal"><section class="modal-card ticket-modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="modal-close" data-action="close-modal">×</button><div class="ticket-header"><span class="eyebrow">YOUR EVENT PASS</span><span class="status-pill status-confirmed">CONFIRMED</span></div><h2>${escapeHtml(ticket.event?.eventName)}</h2><p class="muted">${formatDate(ticket.event?.eventDate)} · ${escapeHtml(ticket.event?.venue)}</p><div class="qr-frame"><img src="${escapeHtml(ticket.qrImageUrl)}" alt="QR code ticket for EventEase booking"><span>Show this code at the event entrance</span></div><div class="ticket-code"><span>SECURE TICKET CODE</span><strong>${escapeHtml(ticket.ticketCode)}</strong></div><div class="ticket-detail-grid"><div><small>Seats</small><strong>${ticket.numberOfSeats}</strong></div><div><small>Booking amount</small><strong>${money(ticket.totalAmount)}</strong></div><div><small>Booking reference</small><strong>${escapeHtml(String(ticket.registrationId).slice(-8).toUpperCase())}</strong></div></div><p class="form-footnote">The QR contains an opaque ticket code. Only an authenticated EventEase Admin can validate or check it in.</p><button class="button button-dark button-full" data-action="close-modal">Done</button></section></div>`;
  }

  if (state.modal === 'edit-event') {
    const item = state.modalData;
    return `<div class="modal-scrim" data-action="close-modal"><section class="modal-card edit-event-modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="modal-close" data-action="close-modal">×</button><div class="eyebrow">EVENT MANAGEMENT</div><h2>Edit event</h2><p class="muted">Available seats are recalculated by the server. You cannot reduce total capacity below already reserved seats.</p>
      <form id="edit-event-form" class="form-grid">
        <input type="hidden" name="eventId" value="${escapeHtml(item._id)}">
        <label class="field field-full">Event name<input name="eventName" required minlength="3" maxlength="120" value="${escapeHtml(item.eventName)}"></label>
        <label class="field">Category<input name="category" required minlength="2" maxlength="60" value="${escapeHtml(item.category)}"></label>
        <label class="field">Venue<input name="venue" required minlength="2" maxlength="200" value="${escapeHtml(item.venue)}"></label>
        <label class="field field-full">Description<textarea name="description" maxlength="2000" rows="3">${escapeHtml(item.description || '')}</textarea></label>
        <label class="field">Event date & time<input name="eventDate" type="datetime-local" required value="${toLocalDateTimeInput(item.eventDate)}"></label>
        <label class="field">Total seats<input name="totalSeats" type="number" min="1" max="100000" required value="${item.totalSeats}"></label>
        <label class="field">Fee per seat (₹)<input name="registrationFee" type="number" min="0" step="0.01" required value="${item.registrationFee}"></label>
        <div class="field field-full modal-actions"><button type="button" class="button button-outline" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary">Save changes ↗</button></div>
      </form>
    </section></div>`;
  }

  if (state.modal === 'event-analytics') {
    const { event, analytics } = state.modalData;
    return `<div class="modal-scrim" data-action="close-modal"><section class="modal-card" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="modal-close" data-action="close-modal">×</button><div class="eyebrow">EVENT PERFORMANCE</div><h2>${escapeHtml(event.eventName)}</h2><p class="muted">${formatDate(event.eventDate)} · ${escapeHtml(event.venue)}</p>
      <div class="metric-grid event-analytics-grid">
        ${metricCard('Registrations', analytics.registrations, '↗', 'Confirmed')}
        ${metricCard('Seats booked', analytics.confirmedSeats, '⌁', 'Reserved')}
        ${metricCard('Occupancy', `${analytics.occupancyRate}%`, '◒', 'Capacity used')}
        ${metricCard('Check-ins', analytics.checkIns, '✓', 'Attendees arrived')}
        ${metricCard('Waiting list', analytics.waitingListEntries, '↗', 'Queue requests')}
      </div>
      <div class="inline-note">Gross confirmed booking value: <strong>${money(analytics.grossConfirmedRevenue)}</strong>. This is not a payment-settlement report.</div>
      <button class="button button-dark button-full" data-action="close-modal" style="margin-top:16px">Done</button>
    </section></div>`;
  }

  if (state.modal === 'confirm-cancel') {
    return `<div class="modal-scrim" data-action="close-modal"><section class="modal-card confirm-modal" onclick="event.stopPropagation()"><div class="empty-icon danger-icon">!</div><h2>Cancel this booking?</h2><p class="muted">Your seats will be released. The next eligible waitlist request may be promoted automatically.</p><div class="modal-actions"><button class="button button-outline" data-action="close-modal">Keep booking</button><button class="button button-danger" data-action="confirm-cancel" data-id="${state.modalData}">Cancel booking</button></div></section></div>`;
  }
  return '';
}

async function loadEvents() {
  const response = await api('/api/events?limit=100');
  state.events = response.events || [];
}

async function loadRegistrations() {
  const response = await api('/api/registrations/my');
  state.registrations = response.registrations || [];
}

async function loadWaitlist() {
  const response = await api('/api/registrations/waitlist/my');
  state.waitlist = response.waitlist || [];
}

async function loadAdminEvents() {
  const response = await api('/api/events/admin/all?limit=100');
  state.events = response.events || [];
}

async function loadAnalytics() {
  if (state.user?.role !== 'Admin') return;
  state.analytics = await api('/api/analytics/overview');
}

async function render() {
  try {
    if (state.tab === 'events') {
      await loadEvents();
      shell(renderEvents());
    } else if (state.tab === 'bookings') {
      await loadRegistrations();
      shell(renderBookings());
    } else if (state.tab === 'waitlist') {
      await loadWaitlist();
      shell(renderWaitlist());
    } else if (state.tab === 'admin' && state.user?.role === 'Admin') {
      await Promise.all([loadAdminEvents(), loadAnalytics()]);
      shell(renderAdmin());
    } else {
      state.tab = 'events';
      await loadEvents();
      shell(renderEvents());
    }
  } catch (error) {
    shell(`<section class="error-state"><div class="empty-icon">!</div><h2>We couldn't load this view.</h2><p>${escapeHtml(error.message)}</p><button class="button button-primary" data-action="retry">Try again</button></section>`);
  }
}

async function requireAuth() {
  if (state.user && state.token) return true;
  state.authMode = 'login';
  state.modal = 'auth';
  shell(state.tab === 'events' ? renderEvents() : '<div></div>');
  return false;
}

async function bookEvent(eventId, numberOfSeats = 1) {
  if (!await requireAuth()) return;
  try {
    await api('/api/registrations', {
      method: 'POST',
      body: { eventId, numberOfSeats }
    });
    toast('Your booking is confirmed. Check My bookings for the ticket.');
    state.tab = 'bookings';
    await render();
  } catch (error) {
    if (error.status === 409) {
      const join = window.confirm(`${error.message}\n\nWould you like to join the waitlist instead?`);
      if (join) await joinWaitlist(eventId, numberOfSeats);
      return;
    }
    toast(error.message, 'error');
  }
}

async function joinWaitlist(eventId, numberOfSeats = 1) {
  if (!await requireAuth()) return;
  try {
    await api('/api/registrations/waitlist', {
      method: 'POST',
      body: { eventId, numberOfSeats }
    });
    toast('You are on the waitlist. We will promote eligible requests as seats open.');
    state.tab = 'waitlist';
    await render();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function saveEvent(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const eventId = data.eventId;
  delete data.eventId;
  data.totalSeats = Number(data.totalSeats);
  data.registrationFee = Number(data.registrationFee);
  data.eventDate = new Date(data.eventDate).toISOString();

  try {
    await api(`/api/events/${eventId}`, { method: 'PUT', body: data });
    state.modal = null;
    toast('Event details updated.');
    await render();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function deleteEvent(eventId) {
  const event = state.events.find((item) => item._id === eventId);
  const confirmed = window.confirm(`Delete "${event?.eventName || 'this event'}"? This is only allowed when there are no confirmed registrations.`);
  if (!confirmed) return;

  try {
    await api(`/api/events/${eventId}`, { method: 'DELETE' });
    toast('Event deleted.');
    if (state.adminEventId === eventId) state.adminEventId = '';
    await render();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function showEventAnalytics(eventId) {
  try {
    const result = await api(`/api/events/${eventId}/analytics`);
    state.modal = 'event-analytics';
    state.modalData = result;
    shell(renderAdmin());
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function loadAttendees() {
  const select = document.querySelector('#admin-event-select');
  const target = document.querySelector('#attendee-results');
  if (!select || !target || !select.value) {
    toast('Select an event first.', 'error');
    return;
  }
  state.adminEventId = select.value;
  target.innerHTML = '<div class="inline-note">Loading attendees…</div>';
  try {
    const [registrations, waitlist] = await Promise.all([
      api(`/api/registrations/event/${select.value}`),
      api(`/api/registrations/event/${select.value}/waitlist`)
    ]);
    const rows = registrations.registrations || [];
    target.innerHTML = `
      <div class="attendee-summary"><span><strong>${rows.filter((item) => item.registrationStatus === 'Confirmed').length}</strong> confirmed</span><span><strong>${waitlist.results}</strong> waiting</span><span><strong>${rows.filter((item) => item.checkedInAt).length}</strong> checked in</span></div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Attendee</th><th>Seats</th><th>Status</th><th>Check-in</th></tr></thead><tbody>${rows.map((item) => `<tr><td><strong>${escapeHtml(item.userId?.name || 'Attendee')}</strong><small>${escapeHtml(item.userId?.email || '')}</small></td><td>${item.numberOfSeats}</td><td><span class="status-pill ${item.registrationStatus === 'Confirmed' ? 'status-confirmed' : 'status-cancelled'}">${escapeHtml(item.registrationStatus)}</span></td><td>${item.checkedInAt ? `<span class="checked-label">✓ ${formatDate(item.checkedInAt)}</span>` : '<span class="muted">Not yet</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="inline-note">No registrations for this event yet.</div>'}
      ${waitlist.results ? `<div class="waitlist-note"><strong>Waitlist queue</strong><p>${waitlist.waitlist.map((item, index) => `#${index + 1} ${escapeHtml(item.userId?.name || 'Attendee')} · ${item.numberOfSeats} seat(s)`).join('<br>')}</p></div>` : ''}
    `;
  } catch (error) {
    target.innerHTML = `<div class="inline-note error-text">${escapeHtml(error.message)}</div>`;
  }
}

async function showTicket(registrationId) {
  try {
    const result = await api(`/api/registrations/${registrationId}/ticket`);
    state.modal = 'ticket';
    state.modalData = result.ticket;
    shell(renderBookings());
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function cancelBooking(registrationId) {
  try {
    const response = await api(`/api/registrations/${registrationId}/cancel`, { method: 'PATCH' });
    const promoted = response.promotedFromWaitlist?.length || 0;
    toast(promoted
      ? `Booking cancelled. ${promoted} waitlist request(s) promoted.`
      : 'Booking cancelled and seats released.');
    state.modal = null;
    state.tab = 'bookings';
    await render();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function submitAuth(form) {
  const formData = new FormData(form);
  const body = Object.fromEntries(formData.entries());
  const endpoint = state.authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  setLoading(true);
  try {
    const response = await api(endpoint, { method: 'POST', body });
    saveSession(response);
    state.token = response.token;
    state.user = response.user;
    state.modal = null;
    state.tab = 'events';
    toast(`Welcome ${response.user.name}.`);
    await render();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    setLoading(false);
  }
}

async function submitCreateEvent(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  data.totalSeats = Number(data.totalSeats);
  data.registrationFee = Number(data.registrationFee);
  data.eventDate = new Date(data.eventDate).toISOString();
  try {
    await api('/api/events', { method: 'POST', body: data });
    toast('Event published successfully.');
    form.reset();
    await render();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function checkIn(form) {
  const formData = new FormData(form);
  try {
    const response = await api('/api/registrations/check-in', {
      method: 'POST',
      body: { ticketCode: formData.get('ticketCode') }
    });
    toast(`Checked in: ${response.checkIn.attendee?.name || 'attendee'}.`);
    form.reset();
    if (state.adminEventId) await loadAttendees();
  } catch (error) {
    toast(error.message, 'error');
  }
}

document.addEventListener('click', async (event) => {
  const tab = event.target.closest('[data-tab]');
  if (tab) {
    state.tab = tab.dataset.tab;
    state.modal = null;
    await render();
    return;
  }

  const authMode = event.target.closest('[data-auth-mode]');
  if (authMode) {
    state.authMode = authMode.dataset.authMode;
    shell(renderEvents());
    return;
  }

  const category = event.target.closest('[data-category]');
  if (category) {
    state.category = category.dataset.category;
    shell(renderEvents());
    return;
  }

  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  if (action === 'open-auth') {
    state.authMode = 'login';
    state.modal = 'auth';
    shell(state.tab === 'events' ? renderEvents() : '<div></div>');
  } else if (action === 'close-modal') {
    state.modal = null;
    await render();
  } else if (action === 'logout') {
    clearSession();
    state.token = '';
    state.user = null;
    state.tab = 'events';
    toast('You have signed out.');
    await render();
  } else if (action === 'home' || action === 'retry') {
    state.tab = 'events';
    await render();
  } else if (action === 'book') {
    const eventCard = target.closest('.event-card');
    const seats = Number(eventCard?.querySelector('[data-seat-count]')?.value || 1);
    await bookEvent(target.dataset.id, seats);
  } else if (action === 'ticket') {
    await showTicket(target.dataset.id);
  } else if (action === 'cancel-waitlist') {
    try {
      await api(`/api/registrations/waitlist/${target.dataset.id}`, { method: 'DELETE' });
      toast('You have left the waitlist.');
      await render();
    } catch (error) {
      toast(error.message, 'error');
    }
  } else if (action === 'cancel-booking') {
    state.modal = 'confirm-cancel';
    state.modalData = target.dataset.id;
    shell(renderBookings());
  } else if (action === 'confirm-cancel') {
    await cancelBooking(target.dataset.id);
  } else if (action === 'load-attendees') {
    await loadAttendees();
  } else if (action === 'edit-event') {
    const selected = state.events.find((item) => item._id === target.dataset.id);
    if (selected) {
      state.modal = 'edit-event';
      state.modalData = selected;
      shell(renderAdmin());
    }
  } else if (action === 'delete-event') {
    await deleteEvent(target.dataset.id);
  } else if (action === 'event-analytics') {
    await showEventAnalytics(target.dataset.id);
  }
});

document.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (event.target.id === 'auth-form') await submitAuth(event.target);
  if (event.target.id === 'create-event-form') await submitCreateEvent(event.target);
  if (event.target.id === 'checkin-form') await checkIn(event.target);
  if (event.target.id === 'edit-event-form') await saveEvent(event.target);
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'event-search') {
    const cursor = event.target.selectionStart;
    state.search = event.target.value;
    const filtered = state.events.filter((item) => {
      const matchesSearch = `${item.eventName} ${item.description} ${item.venue}`.toLowerCase().includes(state.search.toLowerCase());
      const matchesCategory = state.category === 'All' || item.category === state.category;
      return matchesSearch && matchesCategory;
    });
    const grid = document.querySelector('.event-grid');
    if (grid) grid.innerHTML = filtered.length
      ? filtered.map(renderEventCard).join('')
      : '<div class="empty-state wide"><div class="empty-icon">✳</div><h3>No events found</h3><p>Try another search or category.</p></div>';
    const count = document.querySelector('.event-count strong');
    if (count) count.textContent = filtered.length.toString().padStart(2, '0');
    const search = document.querySelector('#event-search');
    if (search && cursor !== null) search.setSelectionRange(cursor, cursor);
  }
});

await render();
