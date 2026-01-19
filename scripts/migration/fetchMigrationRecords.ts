import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL || '');

export interface MigrationRecord {
  oldUserId: string;
  email: string;
  permissions: string[];
  isAnonymous: boolean;
  clerkUserId: string;
  status: string;
}

export async function fetchMigrationRecords(): Promise<MigrationRecord[]> {
  const records = await convex.query('migrations/fetchRecords');
  return records as unknown as MigrationRecord[];
}
