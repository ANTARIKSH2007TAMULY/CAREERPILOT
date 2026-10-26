import mongoose from 'mongoose';

let isConnected = false;

mongoose.connection.on('connected', () => {
  isConnected = true;
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
});

export const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/careerpilot';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    isConnected = false;
    console.error('MongoDB connection failed. Continuing with fallback mode if available.');
    console.error(error.message);
  }
};

export const isMongoConnected = () => mongoose.connection.readyState === 1 || isConnected;
