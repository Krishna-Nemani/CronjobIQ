import { createUser, findUserByEmail, User } from '../user_service';
import { query } from '../../db'; // This will be the mocked version
import bcrypt from 'bcryptjs';

// Mock the db module
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(), // Not used in these specific functions but good to have if testing login later
}));

describe('user_service', () => {
  // Typed mock for query
  const mockQuery = query as jest.MockedFunction<typeof query>;
  const mockHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    mockQuery.mockClear();
    mockHash.mockClear();
  });

  describe('createUser', () => {
    it('should hash the password and insert a new user into the database', async () => {
      const email = 'test@example.com';
      const passwordRaw = 'password123';
      const hashedPassword = 'hashedpassword123';
      const mockUserResult: Omit<User, 'password_hash'> = { // DB returns user without password_hash
        id: 1,
        email: email,
        created_at: new Date(),
      };

      mockHash.mockResolvedValue(hashedPassword);
      mockQuery.mockResolvedValue({ rows: [mockUserResult], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });

      const user = await createUser(email, passwordRaw);

      expect(mockHash).toHaveBeenCalledWith(passwordRaw, 10);
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        [email, hashedPassword]
      );
      expect(user).toEqual(mockUserResult);
    });

    it('should return null if the database insertion fails to return a user', async () => {
      mockHash.mockResolvedValue('hashedpassword');
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'INSERT', oid: 0, fields: [] }); // No user returned

      const user = await createUser('test@example.com', 'password123');
      expect(user).toBeNull();
    });
    
    it('should throw an error if the email already exists (unique violation)', async () => {
        const email = 'exists@example.com';
        const passwordRaw = 'password123';
        
        mockHash.mockResolvedValue('hashedpassword');
        // Simulate a unique violation error from PostgreSQL (code 23505)
        mockQuery.mockRejectedValue({ code: '23505', message: 'unique_violation' });

        await expect(createUser(email, passwordRaw)).rejects.toThrow('User with this email already exists.');
        expect(mockHash).toHaveBeenCalledWith(passwordRaw, 10);
        expect(mockQuery).toHaveBeenCalledWith(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, 'hashedpassword']
        );
    });

    it('should re-throw other database errors', async () => {
        mockHash.mockResolvedValue('hashedpassword');
        mockQuery.mockRejectedValue(new Error('Some other DB error'));

        await expect(createUser('test@example.com', 'password123')).rejects.toThrow('Some other DB error');
    });
  });

  describe('findUserByEmail', () => {
    it('should return a user if found by email', async () => {
      const email = 'found@example.com';
      const mockUser: User = {
        id: 1,
        email: email,
        password_hash: 'hashedpassword',
        created_at: new Date(),
      };
      mockQuery.mockResolvedValue({ rows: [mockUser], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const user = await findUserByEmail(email);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
        [email]
      );
      expect(user).toEqual(mockUser);
    });

    it('should return null if no user is found by email', async () => {
      const email = 'notfound@example.com';
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const user = await findUserByEmail(email);

      expect(user).toBeNull();
    });

    it('should throw an error if the database query fails', async () => {
      const email = 'error@example.com';
      const dbError = new Error('Database query failed');
      mockQuery.mockRejectedValue(dbError);

      await expect(findUserByEmail(email)).rejects.toThrow(dbError);
    });
  });
});
