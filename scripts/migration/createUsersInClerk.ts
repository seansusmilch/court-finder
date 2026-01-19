import { Clerk } from '@clerk/clerk-sdk-node';

const clerk = new Clerk({
  secretKey: process.env.CLERK_SECRET_KEY,
});

interface OldUser {
  _id: string;
  email: string | null;
  permissions: string[];
  isAnonymous: boolean | null;
}

interface ClerkUser {
  id: string;
  emailAddresses: { emailAddress: string }[];
  publicMetadata: { role?: string };
}

function mapPermissionsToRole(permissions: string[]): 'user' | 'admin' | null {
  if (permissions.includes('admin.access')) {
    return 'admin';
  }
  if (permissions.length > 0) {
    return 'user';
  }
  return null;
}

export async function createUsersInClerk(
  oldUsers: OldUser[]
): Promise<{ success: ClerkUser[]; failed: { user: OldUser; error: string }[] }> {
  const success: ClerkUser[] = [];
  const failed: { user: OldUser; error: string }[] = [];

  console.log(`Starting to create ${oldUsers.length} users in Clerk...`);

  for (const oldUser of oldUsers) {
    if (!oldUser.email || oldUser.isAnonymous) {
      console.log(`Skipping anonymous or email-less user: ${oldUser._id}`);
      continue;
    }

    try {
      const role = mapPermissionsToRole(oldUser.permissions);

      const metadata: Record<string, string> = {};
      if (role) {
        metadata.role = role;
      }

      const clerkUser = await clerk.users.createUser({
        emailAddress: [oldUser.email],
        skipPasswordChecks: true,
        publicMetadata: metadata,
        skipPasswordRequirement: true,
      });

      console.log(`✓ Created Clerk user for ${oldUser.email} (role: ${role || 'user (default)'})`);
      success.push({
        id: clerkUser.id,
        emailAddresses: clerkUser.emailAddresses.map((e: any) => ({
          emailAddress: e.emailAddress,
        })),
        publicMetadata: metadata,
      });

      await clerk.users.setPassword(clerkUser.id, {
        password: generateRandomPassword(),
      });

      await clerk.users.verifyEmailAddress(clerkUser.id);
      console.log(`  → Password reset initiated for ${oldUser.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`✗ Failed to create user ${oldUser.email}: ${errorMessage}`);
      failed.push({ user: oldUser, error: errorMessage });
    }
  }

  console.log(`\nSummary: ${success.length} created, ${failed.length} failed`);

  return { success, failed };
}

function generateRandomPassword(): string {
  const length = 16;
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export async function main() {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    console.error('CLERK_SECRET_KEY environment variable is required');
    process.exit(1);
  }

  console.log('Fetching migration records from Convex...');

  const { fetchMigrationRecords } = await import('./fetchMigrationRecords');
  const migrationRecords = await fetchMigrationRecords();

  if (migrationRecords.length === 0) {
    console.log('No migration records found. Run prepareMigration first.');
    return;
  }

  console.log(`Found ${migrationRecords.length} users to migrate`);

  const oldUsers: OldUser[] = migrationRecords.map((record) => ({
    _id: record.oldUserId,
    email: record.email,
    permissions: record.permissions || [],
    isAnonymous: record.isAnonymous || false,
  }));

  const { success, failed } = await createUsersInClerk(oldUsers);

  console.log('\nClerk User IDs:');
  success.forEach((user) => {
    const email = user.emailAddresses[0]?.emailAddress || 'N/A';
    console.log(`  ${email}: ${user.id}`);
  });

  if (failed.length > 0) {
    console.log('\nFailed users:');
    failed.forEach(({ user, error }) => {
      console.log(`  ${user.email || user._id}: ${error}`);
    });
  }

  console.log('\nNext steps:');
  console.log('1. Run mapUsersToClerk.ts to map old user IDs to Clerk user IDs');
  console.log('2. Run validate.ts to verify the migration');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
