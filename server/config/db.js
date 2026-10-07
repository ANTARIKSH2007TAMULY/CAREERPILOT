import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 2000);

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/careerpilot';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed. Startup aborted because MongoDB is required.');
    console.error(error.message);
    throw error;
  }
};

export const isMongoConnected = () => mongoose.connection.readyState === 1 || isConnected;
