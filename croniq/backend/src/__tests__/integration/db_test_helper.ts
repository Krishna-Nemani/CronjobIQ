import pool from '../../db'; // Imports the pool configured by db.ts (which respects NODE_ENV=test)

export const clearAllTables = async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearAllTables can only be run in test environment.');
  }

  const client = await pool.connect();
  try {
    // Order matters due to foreign key constraints. Start with tables that are referenced by others.
    // Or, temporarily disable triggers if your DB supports it and it's simpler.
    // For PostgreSQL, you can use TRUNCATE ... RESTART IDENTITY CASCADE
    await client.query('TRUNCATE TABLE job_executions RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE job_notification_settings RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE notification_channels RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE monitored_jobs RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    console.log('Test database tables truncated.');
  } catch (error) {
    console.error('Error truncating tables:', error);
    throw error; // Re-throw to fail the test setup if clearing fails
  } finally {
    client.release();
  }
};

// Optional: A function to close the pool if needed after all tests run
// Jest typically handles process exit, but for explicit control:
export const closeTestDBConnection = async () => {
    if (process.env.NODE_ENV === 'test') {
        await pool.end();
        console.log('Test database pool connection ended.');
    }
};

// Example of seeding data if needed for specific test suites, though often done in test files directly.
// export const seedTestData = async () => {
//   const client = await pool.connect();
//   try {
//     // ... your seed logic ...
//   } finally {
//     client.release();
//   }
// };
