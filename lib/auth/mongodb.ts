import { MongoClient } from 'mongodb';

// Keep module evaluation build-safe; a production sign-in fails closed when the
// deployment has not supplied its real Mongo URI rather than persisting data.
const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/sync';

declare global {
  // eslint-disable-next-line no-var
  var ravenAuthMongoClient: MongoClient | undefined;
}

export const ravenAuthMongoClient =
  global.ravenAuthMongoClient ?? new MongoClient(uri, { ignoreUndefined: true });

if (process.env.NODE_ENV !== 'production') {
  global.ravenAuthMongoClient = ravenAuthMongoClient;
}
