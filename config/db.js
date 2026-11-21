import mongoose from 'mongoose';

export async function connectDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in .env');
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB Connected Successfully');
    console.log(`Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('MongoDB Connection Failed:', error.message);
    throw error;
  }
}