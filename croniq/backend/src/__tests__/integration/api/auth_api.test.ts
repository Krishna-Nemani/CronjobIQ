import request from 'supertest';
import app from '../../../index'; // Import the Express app
import { clearAllTables, closeTestDBConnection } from '../db_test_helper'; // DB helper
import pool from '../../../db'; // Direct pool import for checking connection if needed

// Set JWT_SECRET for tests if not already set in a .env.test or similar
// This is crucial because the app relies on it.
// Ensure this matches what your app expects or set it in jest.setup.js / .env.test
process.env.JWT_SECRET = 'test_jwt_secret_for_auth_api_tests_1234567890';


describe('Auth API Endpoints', () => {
  
  beforeAll(async () => {
    // Ensure NODE_ENV is test (Jest should do this, but double check)
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Tests must be run with NODE_ENV=test');
    }
    // Optional: Verify connection to test DB if needed, though db.ts logs it.
    // try {
    //   const client = await pool.connect();
    //   console.log(`auth_api.test: Connected to test DB: ${client.database}`);
    //   client.release();
    // } catch (err) {
    //   console.error('auth_api.test: Failed to connect to test DB for initial check', err);
    //   throw err; // Fail fast if DB connection is an issue
    // }
  });

  beforeEach(async () => {
    await clearAllTables(); // Clear data before each test
  });

  afterAll(async () => {
    await closeTestDBConnection(); // Close pool after all tests in this file
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser@example.com',
          password: 'password123',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User created successfully');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('email', 'testuser@example.com');
      expect(res.body.user).not.toHaveProperty('password_hash'); // Ensure password hash is not returned
    });

    it('should fail to register a user with an existing email', async () => {
      // First, register a user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
        });

      // Then, try to register the same user again
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
        });
      expect(res.statusCode).toEqual(409); // Conflict
      expect(res.body).toHaveProperty('message', 'User with this email already exists.');
    });

    it('should fail to register with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'password123',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Email and password are required.');
    });
    
    it('should fail to register with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Email and password are required.');
    });

    it('should fail with password too short', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'shortpass@example.com', password: '123' });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('message', 'Password must be at least 6 characters long.');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user to login with
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'loginuser@example.com',
          password: 'password123',
        });
    });

    it('should login an existing user successfully and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'password123',
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
    });

    it('should fail to login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'wrongpassword',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid credentials. Password incorrect.');
    });

    it('should fail to login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nouser@example.com',
          password: 'password123',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid credentials. User not found.');
    });
  });

  describe('Protected Route Access (/api/profile)', () => {
    let token = '';

    beforeEach(async () => {
      // Register and login a user to get a token
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'protected@example.com', password: 'password123' });
      
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'protected@example.com', password: 'password123' });
      token = loginRes.body.token;
    });

    it('should allow access to a protected route with a valid token', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'This is a protected route.');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', 'protected@example.com');
    });

    it('should deny access to a protected route without a token', async () => {
      const res = await request(app)
        .get('/api/profile');
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Access denied. No token provided.');
    });

    it('should deny access to a protected route with an invalid token', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(res.statusCode).toEqual(403); // Or 401 depending on JWT library's error for malformed/invalid signature
      expect(res.body).toHaveProperty('message', 'Forbidden. Invalid token.');
    });

    // Optional: Test for expired token if you can manipulate time or token expiry for testing
  });
});
