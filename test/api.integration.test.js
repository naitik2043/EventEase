import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import app from '../app.js';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';

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
    await Promise.all([User.init(), Event.init(), Registration.init()]);

    await Promise.all([
      User.deleteMany({}),
      Event.deleteMany({}),
      Registration.deleteMany({})
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
        Registration.deleteMany({})
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
  }
);
