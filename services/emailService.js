import { log } from '../utils/logger.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    log('info', 'email_not_configured', { recipientPresent: Boolean(to) });
    return { sent: false, reason: 'Email provider is not configured.' };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to: [to], subject, text })
    });

    if (!response.ok) {
      log('warn', 'email_delivery_failed', {
        statusCode: response.status,
        recipientDomain: String(to).split('@').at(-1)
      });
      return { sent: false, reason: 'Email provider rejected the request.' };
    }

    const result = await response.json();
    log('info', 'email_sent', {
      emailId: result.id,
      recipientDomain: String(to).split('@').at(-1)
    });
    return { sent: true, emailId: result.id };
  } catch (error) {
    log('warn', 'email_delivery_error', { message: error.message });
    return { sent: false, reason: 'Email provider is temporarily unavailable.' };
  }
}

export async function sendBookingConfirmation({ user, event, registration }) {
  if (!user?.email || !event) return { sent: false, reason: 'Recipient or event missing.' };

  const appUrl = (process.env.APP_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
  const text = [
    `Hello ${user.name || 'there'},`,
    '',
    `Your booking for "${event.eventName}" is confirmed.`,
    `Venue: ${event.venue}`,
    `Event date: ${new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    `Seats: ${registration.numberOfSeats}`,
    `Booking reference: ${registration._id}`,
    `Ticket code: ${registration.ticketCode}`,
    '',
    `Open your EventEase dashboard: ${appUrl}`,
    '',
    'Please keep your ticket code available for event check-in.',
    'EventEase'
  ].join('\n');

  return sendEmail({
    to: user.email,
    subject: `Booking confirmed: ${event.eventName}`,
    text
  });
}

export async function sendWaitlistPromotion({ user, event, registration }) {
  if (!user?.email || !event || !registration) {
    return { sent: false, reason: 'Recipient, event, or registration missing.' };
  }

  const appUrl = (process.env.APP_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
  const text = [
    `Hello ${user.name || 'there'},`,
    '',
    `A place has become available and your waitlist request for "${event.eventName}" has been promoted.`,
    `Venue: ${event.venue}`,
    `Event date: ${new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    `Seats: ${registration.numberOfSeats}`,
    `Ticket code: ${registration.ticketCode}`,
    '',
    `Open your EventEase dashboard: ${appUrl}`,
    '',
    'Your registration is now confirmed.',
    'EventEase'
  ].join('\n');

  return sendEmail({
    to: user.email,
    subject: `You have a place: ${event.eventName}`,
    text
  });
}
