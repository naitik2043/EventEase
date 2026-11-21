
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

async function seedAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      'Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in your .env file first.'
    );
  }

  if (ADMIN_PASSWORD.length < 12 || ADMIN_PASSWORD.length > 72) {
    throw new Error('ADMIN_PASSWORD must contain between 12 and 72 characters.');
  }

  await connectDB();

  const email = ADMIN_EMAIL.trim().toLowerCase();

  let admin = await User.findOne({ email }).select('+password');

  if (admin) {
    // Update existing account
    admin.name = ADMIN_NAME.trim();
    admin.email = email;
    admin.role = 'Admin';
    admin.password = ADMIN_PASSWORD;

    await admin.save();

    console.log(`Existing account ${email} updated successfully.`);
    console.log('Role changed to Admin.');
    console.log('Password updated from .env.');
  } else {
    // Create new Admin account
    admin = await User.create({
      name: ADMIN_NAME.trim(),
      email,
      password: ADMIN_PASSWORD,
      role: 'Admin'
    });

    console.log(`Admin account created: ${admin.email}`);
  }

  console.log('--------------------------------');
  console.log('Admin setup completed successfully.');
  console.log(`Email: ${email}`);
  console.log('Role: Admin');
  console.log('Now log in using your .env credentials.');
}

seedAdmin()
  .catch((error) => {
    console.error('Admin seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
