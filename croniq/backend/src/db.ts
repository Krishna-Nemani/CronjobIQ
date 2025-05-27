import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // Load .env file first

let poolConfig: PoolConfig;

if (process.env.NODE_ENV === 'test') {
  // Configuration for the test database
  // Ensure these environment variables are set in your .env.test or testing environment
  poolConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
    user: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASSWORD,
    database: process.env.TEST_DB_NAME,
  };
  console.log('Using TEST database configuration.');
} else {
  // Configuration for the development/production database
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
  console.log('Using REGULAR database configuration. NODE_ENV:', process.env.NODE_ENV);
}

if (!poolConfig.database) {
    console.error("Database name is not configured. Check your .env file and DB_NAME/TEST_DB_NAME variables.");
    // Potentially throw an error or exit if the database name is critical for startup
    // For now, we'll log the error. The Pool constructor will likely throw if 'database' is undefined.
}


const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log(`Database pool connected to ${poolConfig.database} on ${poolConfig.host}:${poolConfig.port}`);
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client in database pool', err);
  // process.exit(-1); // Consider if this is too drastic
});


export const query = (text: string, params?: any[]) => pool.query(text, params);

// Function to get a client from the pool, e.g., for transactions
export const getClient = () => pool.connect();

// Export the pool itself if direct access is needed (e.g., for graceful shutdown or advanced uses)
export default pool;
