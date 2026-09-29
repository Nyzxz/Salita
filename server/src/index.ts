import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';

const PORT = Number(process.env.PORT ?? 4000);

async function startServer(): Promise<void> {
  if (process.env.MONGO_URI) {
    await connectDB();
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('MONGO_URI is required in production.');
  } else {
    console.warn('MONGO_URI is not set; starting with in-memory demo data.');
  }

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Filipino Language Explorer API listening on http://localhost:${PORT}`);
  });
}

void startServer().catch((error: unknown) => {
  console.error('Failed to start Filipino Language Explorer API:', error);
  process.exitCode = 1;
});
