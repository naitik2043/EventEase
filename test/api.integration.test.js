import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import app from '../app.js';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Waitlist from '../models/Waitlist.js';

const mongoTestUri = process.env.MONGO_TEST_URI;
const integrationTest = mongoTestUri ? test : test.skip;

integrationTest(
  'EventEase HTTP API integration suite (MongoDB replica set required)',
  async (t) => {
    const uri = new URL(mongoTestUri);
    const databaseName = decodeURIComponent(uri.pathname.replace(/^\//, ''));

    assert.match(
      databaseName,
      /test/i,
      'MONGO_TEST_URI must point to an isolated database with "test" in its name.'
    );

    await mongoose.connect(mongoTestUri, { serverSelectionTimeoutMS: 15000 });
    await Promise.all([User.init(), Event.init(), Registration.init(), Waitlist.init()]);

    await Promise.all([
      User.deleteMany({}),
      Event.deleteMany({}),
      Registration.deleteMany({}),
      Waitlist.deleteMany({})
    ]);

    const server = app.listen(0);
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    async function request(endpoint, options = {}) {
      const headers = { 'content-type': 'application/json' };
      if (options.token) headers.authorization = `Bearer ${options.token}`;

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      return {
        status: response.status,
        headers: response.headers,
        body: await response.json()
      };
    }

    t.after(async () => {
      await new Promise((resolve) => server.close(resolve));
      await Promise.all([
        User.deleteMany({}),
        Event.deleteMany({}),
        Registration.deleteMany({}),
        Waitlist.deleteMany({})
      ]);
      await mongoose.disconnect();
    });

    const adminEmail = 'integration.admin@example.com';
    const adminPassword = 'AdminPass123!';
    const userEmail = 'integration.user@example.com';
    const userPassword = 'UserPass123!';

    await User.create({
      name: 'Integration Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'Admin'
    });

    let adminToken;
    let userToken;
    let eventId;
    let registrationId;

    await t.test('public registration always assigns the User role', async () => {
      const response = await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Integration User',
          email: userEmail,
          password: userPassword,
          role: 'Admin'
        }
      });

      assert.equal(response.status, 201);
      assert.equal(response.body.user.role, 'User');
      assert.ok(response.body.token);
      userToken = response.body.token;
    });

    await t.test('Admin can log in and receive an Admin token', async () => {
      const response = await request('/api/auth/login', {
        method: 'POST',
        body: { email: adminEmail, password: adminPassword }
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.user.role, 'Admin');
      adminToken = response.body.token;
    });

    await t.test('invalid credentials are rejected', async () => {
      const response = await request('/api/auth/login', {
        method: 'POST',
        body: { email: userEmail, password: 'WrongPassword123!' }
      });

      assert.equal(response.status, 401);
    });

    await t.test('protected routes reject requests without a JWT', async () => {
      const response = await request('/api/registrations/my');
      assert.equal(response.status, 401);
    });

    await t.test('normal users cannot create events', async () => {
      const response = await request('/api/events', {
        method: 'POST',
        token: userToken,
        body: {
          eventName: 'Forbidden Event',
          category: 'Technology',
          eventDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          venue: 'Test Venue',
          totalSeats: 10,
          registrationFee: 100
        }
      });

      assert.equal(response.status, 403);
    });

    await t.test('Admin can create an event and the public can discover it', async () => {
      const response = await request('/api/events', {
        method: 'POST',
        token: adminToken,
        body: {
          eventName: 'Integration Test Workshop',
          description: 'A test event for API integration coverage.',
          category: 'Technology',
          eventDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          venue: 'Integration Test Hall',
          totalSeats: 10,
          registrationFee: 125
        }
      });

      assert.equal(response.status, 201);
      eventId = response.body.event._id;
      assert.equal(response.body.event.availableSeats, 10);

      const listResponse = await request('/api/events?search=Integration&category=Technology');
      assert.equal(listResponse.status, 200);
      assert.ok(listResponse.body.events.some((event) => event._id === eventId));

      const adminCatalogue = await request('/api/events/admin/all?limit=100', {
        token: adminToken
      });
      assert.equal(adminCatalogue.status, 200);
      assert.ok(adminCatalogue.body.events.some((event) => event._id === eventId));
    });

    await t.test('user can book seats and event capacity is decremented', async () => {
      const response = await request('/api/registrations', {
        method: 'POST',
        token: userToken,
        body: { eventId, numberOfSeats: 2 }
      });

      assert.equal(response.status, 201);
      assert.equal(response.body.registration.totalAmount, 250);
      assert.equal(response.body.registration.registrationStatus, 'Confirmed');
      registrationId = response.body.registration._id;

      const event = await Event.findById(eventId);
      assert.equal(event.availableSeats, 8);
    });


    await t.test('booking owner can retrieve an opaque QR ticket', async () => {
      const response = await request(`/api/registrations/${registrationId}/ticket`, {
        token: userToken
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.ticket.ticketCode.length, 48);
      assert.match(response.body.ticket.qrPayload, /^EVENTEASE:TICKET:/);
      assert.match(response.body.ticket.qrImageUrl, /^https:\/\/api\.qrserver\.com\//);
    });

    await t.test('duplicate registration is rejected', async () => {
      const response = await request('/api/registrations', {
        method: 'POST',
        token: userToken,
        body: { eventId, numberOfSeats: 1 }
      });

      assert.equal(response.status, 409);
    });

    await t.test('user can view and cancel a registration; seats are restored', async () => {
      const listResponse = await request('/api/registrations/my', {
        token: userToken
      });
      assert.equal(listResponse.status, 200);
      assert.equal(listResponse.body.results, 1);

      const cancellation = await request(
        `/api/registrations/${registrationId}/cancel`,
        { method: 'PATCH', token: userToken }
      );

      assert.equal(cancellation.status, 200);
      assert.equal(cancellation.body.registration.registrationStatus, 'Cancelled');
      assert.equal(cancellation.body.availableSeats, 10);
    });

    await t.test('cancelled registrations cannot be recreated for the same event', async () => {
      const response = await request('/api/registrations', {
        method: 'POST',
        token: userToken,
        body: { eventId, numberOfSeats: 1 }
      });

      assert.equal(response.status, 409);
    });

    await t.test('insufficient seat capacity is rejected without changing the event', async () => {
      const created = await request('/api/events', {
        method: 'POST',
        token: adminToken,
        body: {
          eventName: 'Limited Seat Event',
          category: 'Technology',
          eventDate: new Date(Date.now() + 45 * 86400000).toISOString(),
          venue: 'Small Hall',
          totalSeats: 1,
          registrationFee: 50
        }
      });

      assert.equal(created.status, 201);
      const limitedEventId = created.body.event._id;

      const booking = await request('/api/registrations', {
        method: 'POST',
        token: userToken,
        body: { eventId: limitedEventId, numberOfSeats: 2 }
      });

      assert.equal(booking.status, 409);
      const event = await Event.findById(limitedEventId);
      assert.equal(event.availableSeats, 1);
      assert.equal(await Registration.countDocuments({ eventId: limitedEventId }), 0);
    });


    await t.test('waitlist entries are promoted in FIFO order when seats are released', async () => {
      const secondUser = await User.create({
        name: 'Waitlist Attendee',
        email: 'waitlist.attendee@example.com',
        password: 'WaitlistPass123!',
        role: 'User'
      });

      const secondLogin = await request('/api/auth/login', {
        method: 'POST',
        body: { email: secondUser.email, password: 'WaitlistPass123!' }
      });
      assert.equal(secondLogin.status, 200);
      const secondToken = secondLogin.body.token;

      const created = await request('/api/events', {
        method: 'POST',
        token: adminToken,
        body: {
          eventName: 'Waitlist Promotion Workshop',
          category: 'Technology',
          eventDate: new Date(Date.now() + 70 * 86400000).toISOString(),
          venue: 'Queue Test Hall',
          totalSeats: 1,
          registrationFee: 90
        }
      });
      assert.equal(created.status, 201);
      const waitlistEventId = created.body.event._id;

      const firstBooking = await request('/api/registrations', {
        method: 'POST',
        token: userToken,
        body: { eventId: waitlistEventId, numberOfSeats: 1 }
      });
      assert.equal(firstBooking.status, 201);
      const firstRegistrationId = firstBooking.body.registration._id;

      const queueEntry = await request('/api/registrations/waitlist', {
        method: 'POST',
        token: secondToken,
        body: { eventId: waitlistEventId, numberOfSeats: 1 }
      });
      assert.equal(queueEntry.status, 201);
      assert.equal(queueEntry.body.waitlistEntry.status, 'Waiting');

      const waitingAnalytics = await request(`/api/events/${waitlistEventId}/analytics`, {
        token: adminToken
      });
      assert.equal(waitingAnalytics.status, 200);
      assert.equal(waitingAnalytics.body.analytics.waitingListEntries, 1);

      const waitingOverview = await request('/api/analytics/overview', {
        token: adminToken
      });
      assert.ok(waitingOverview.body.metrics.activeWaitlistRequests >= 1);

      const leaveQueue = await request(
        `/api/registrations/waitlist/${queueEntry.body.waitlistEntry._id}`,
        { method: 'DELETE', token: secondToken }
      );
      assert.equal(leaveQueue.status, 200);
      assert.equal(leaveQueue.body.waitlistEntry.status, 'Cancelled');

      const rejoinQueue = await request('/api/registrations/waitlist', {
        method: 'POST',
        token: secondToken,
        body: { eventId: waitlistEventId, numberOfSeats: 1 }
      });
      assert.equal(rejoinQueue.status, 201);
      assert.equal(rejoinQueue.body.waitlistEntry.status, 'Waiting');

      const cancellation = await request(
        `/api/registrations/${firstRegistrationId}/cancel`,
        { method: 'PATCH', token: userToken }
      );
      assert.equal(cancellation.status, 200);
      assert.equal(cancellation.body.promotedFromWaitlist, 1);
      assert.equal(cancellation.body.availableSeats, 0);

      const myQueue = await request('/api/registrations/waitlist/my', {
        token: secondToken
      });
      assert.equal(myQueue.status, 200);
      assert.equal(myQueue.body.waitlist[0].status, 'Promoted');

      const myBookings = await request('/api/registrations/my', {
        token: secondToken
      });
      assert.equal(myBookings.status, 200);
      assert.equal(myBookings.body.registrations.length, 1);
      assert.equal(myBookings.body.registrations[0].registrationStatus, 'Confirmed');

      const crossUserTicket = await request(
        `/api/registrations/${myBookings.body.registrations[0]._id}/ticket`,
        { token: userToken }
      );
      assert.equal(crossUserTicket.status, 403);

      const userCheckIn = await request('/api/registrations/check-in', {
        method: 'POST',
        token: userToken,
        body: { ticketCode: 'a'.repeat(48) }
      });
      assert.equal(userCheckIn.status, 403);

      const ticket = await request(
        `/api/registrations/${myBookings.body.registrations[0]._id}/ticket`,
        { token: secondToken }
      );
      assert.equal(ticket.status, 200);

      const checkIn = await request('/api/registrations/check-in', {
        method: 'POST',
        token: adminToken,
        body: { ticketCode: ticket.body.ticket.ticketCode }
      });
      assert.equal(checkIn.status, 200);
      assert.ok(checkIn.body.checkIn.checkedInAt);

      const duplicateCheckIn = await request('/api/registrations/check-in', {
        method: 'POST',
        token: adminToken,
        body: { ticketCode: ticket.body.ticket.ticketCode }
      });
      assert.equal(duplicateCheckIn.status, 409);

      const checkedInCancellation = await request(
        `/api/registrations/${myBookings.body.registrations[0]._id}/cancel`,
        { method: 'PATCH', token: secondToken }
      );
      assert.equal(checkedInCancellation.status, 409);

      const analytics = await request(`/api/events/${waitlistEventId}/analytics`, {
        token: adminToken
      });
      assert.equal(analytics.status, 200);
      assert.equal(analytics.body.analytics.registrations, 1);
      assert.equal(analytics.body.analytics.checkIns, 1);
      assert.equal(analytics.body.analytics.occupancyRate, 100);
      assert.equal(analytics.body.analytics.waitingListEntries, 0);

      const queueForAdmin = await request(
        `/api/registrations/event/${waitlistEventId}/waitlist`,
        { token: adminToken }
      );
      assert.equal(queueForAdmin.status, 200);
      assert.equal(queueForAdmin.body.results, 0);

      const overview = await request('/api/analytics/overview', {
        token: adminToken
      });
      assert.equal(overview.status, 200);
      assert.ok(overview.body.metrics.totalUsers >= 3);
      assert.ok(overview.body.metrics.confirmedRegistrations >= 1);
    });

    await t.test('concurrent users cannot book more seats than event capacity', async () => {
      const created = await request('/api/events', {
        method: 'POST',
        token: adminToken,
        body: {
          eventName: 'Concurrent Booking Event',
          category: 'Technology',
          eventDate: new Date(Date.now() + 50 * 86400000).toISOString(),
          venue: 'Concurrency Hall',
          totalSeats: 3,
          registrationFee: 75
        }
      });

      assert.equal(created.status, 201);
      const concurrentEventId = created.body.event._id;

      const password = 'ConcurrentPass123!';
      const accounts = await Promise.all(
        Array.from({ length: 8 }, (_, index) => User.create({
          name: `Concurrent User ${index + 1}`,
          email: `concurrent-user-${index + 1}@example.com`,
          password,
          role: 'User'
        }))
      );

      const tokens = await Promise.all(accounts.map(async (account) => {
        const login = await request('/api/auth/login', {
          method: 'POST',
          body: { email: account.email, password }
        });
        assert.equal(login.status, 200);
        return login.body.token;
      }));

      const results = await Promise.all(tokens.map((token) => request('/api/registrations', {
        method: 'POST',
        token,
        body: { eventId: concurrentEventId, numberOfSeats: 1 }
      })));

      assert.equal(results.filter((result) => result.status === 201).length, 3);
      assert.equal(results.filter((result) => result.status === 409).length, 5);

      const finalEvent = await Event.findById(concurrentEventId);
      const confirmed = await Registration.find({
        eventId: concurrentEventId,
        registrationStatus: 'Confirmed'
      });

      assert.equal(finalEvent.availableSeats, 0);
      assert.equal(confirmed.length, 3);
      assert.equal(
        confirmed.reduce((total, registration) => total + registration.numberOfSeats, 0),
        3
      );
    });

    await t.test('events with confirmed registrations cannot be deleted', async () => {
      const created = await request('/api/events', {
        method: 'POST',
        token: adminToken,
        body: {
          eventName: 'Protected Event',
          category: 'Technology',
          eventDate: new Date(Date.now() + 60 * 86400000).toISOString(),
          venue: 'Main Hall',
          totalSeats: 5,
          registrationFee: 0
        }
      });

      assert.equal(created.status, 201);
      const protectedEventId = created.body.event._id;

      const booking = await request('/api/registrations', {
        method: 'POST',
        token: userToken,
        body: { eventId: protectedEventId, numberOfSeats: 1 }
      });
      assert.equal(booking.status, 201);

      const deletion = await request(`/api/events/${protectedEventId}`, {
        method: 'DELETE',
        token: adminToken
      });

      assert.equal(deletion.status, 409);
      assert.ok(await Event.findById(protectedEventId));
    });

    await t.test('Admin can adjust total capacity without losing reserved seat accounting', async () => {
      const created = await request('/api/events', {
        method: 'POST',
        token: adminToken,
        body: {
          eventName: 'Capacity Adjustment Workshop',
          category: 'Technology',
          eventDate: new Date(Date.now() + 80 * 86400000).toISOString(),
          venue: 'Capacity Hall',
          totalSeats: 4,
          registrationFee: 40
        }
      });
      assert.equal(created.status, 201);
      const capacityEventId = created.body.event._id;

      const booking = await request('/api/registrations', {
        method: 'POST',
        token: userToken,
        body: { eventId: capacityEventId, numberOfSeats: 2 }
      });
      assert.equal(booking.status, 201);

      const forbiddenUpdate = await request(`/api/events/${capacityEventId}`, {
        method: 'PUT',
        token: userToken,
        body: { totalSeats: 5 }
      });
      assert.equal(forbiddenUpdate.status, 403);

      const update = await request(`/api/events/${capacityEventId}`, {
        method: 'PUT',
        token: adminToken,
        body: { totalSeats: 6 }
      });
      assert.equal(update.status, 200);
      assert.equal(update.body.event.totalSeats, 6);
      assert.equal(update.body.event.availableSeats, 4);

      const invalidCapacity = await request(`/api/events/${capacityEventId}`, {
        method: 'PUT',
        token: adminToken,
        body: { totalSeats: 1 }
      });
      assert.equal(invalidCapacity.status, 400);
    });

    await t.test('Admin event deletion also removes waiting queue entries', async () => {
      const created = await request('/api/events', {
        method: 'POST',
        token: adminToken,
        body: {
          eventName: 'Queue Cleanup Event',
          category: 'Technology',
          eventDate: new Date(Date.now() + 90 * 86400000).toISOString(),
          venue: 'Queue Cleanup Hall',
          totalSeats: 1,
          registrationFee: 35
        }
      });
      assert.equal(created.status, 201);
      const cleanupEventId = created.body.event._id;

      const booking = await request('/api/registrations', {
        method: 'POST',
        token: userToken,
        body: { eventId: cleanupEventId, numberOfSeats: 1 }
      });
      assert.equal(booking.status, 201);

      const waitlist = await request('/api/registrations/waitlist', {
        method: 'POST',
        token: (await request('/api/auth/login', {
          method: 'POST',
          body: { email: adminEmail, password: adminPassword }
        })).body.token,
        body: { eventId: cleanupEventId, numberOfSeats: 2 }
      });
      // An Admin may also join the attendee waitlist because this endpoint
      // is authenticated, not role-restricted.
      assert.equal(waitlist.status, 201);

      const cancellation = await request(
        `/api/registrations/${booking.body.registration._id}/cancel`,
        { method: 'PATCH', token: userToken }
      );
      assert.equal(cancellation.status, 200);
      assert.equal(cancellation.body.promotedFromWaitlist, 0);

      assert.equal(await Waitlist.countDocuments({ eventId: cleanupEventId, status: 'Waiting' }), 1);

      const deletion = await request(`/api/events/${cleanupEventId}`, {
        method: 'DELETE',
        token: adminToken
      });
      assert.equal(deletion.status, 200);
      assert.equal(await Waitlist.countDocuments({ eventId: cleanupEventId }), 0);
      assert.equal(await Event.findById(cleanupEventId), null);
    });
  }
);
