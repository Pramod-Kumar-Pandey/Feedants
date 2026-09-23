const mongoose = require('mongoose');

/**
 * Establishes the MongoDB connection.
 *
 * Note: registration/join logic relies on multi-document transactions
 * (Competition counter + Participation insert must be atomic together),
 * so MONGO_URI must point at a replica set (Atlas clusters are replica
 * sets by default; locally you can run a single-node rs.initiate()).
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set in the environment');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    maxPoolSize: 50, // tune based on expected concurrent load
    serverSelectionTimeoutMS: 10000,
  });

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] disconnected');
  });

  console.log('[MongoDB] connected:', mongoose.connection.name);
}

module.exports = connectDB;
