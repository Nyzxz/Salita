import mongoose from 'mongoose';

let connectionPromise: Promise<typeof mongoose> | null = null;

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected.');
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected; the driver will attempt to reconnect.');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

export function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    return Promise.reject(new Error('MONGO_URI is required to connect to MongoDB.'));
  }

  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose);
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      })
      .catch((error: unknown) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}