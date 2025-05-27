import { query } from '../db';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

export const createUser = async (email: string, password_raw: string): Promise<User | null> => {
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password_raw, saltRounds);
  const sql = 'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at';
  try {
    const result = await query(sql, [email, password_hash]);
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (error) {
    console.error('Error creating user:', error);
    // Consider more specific error handling or re-throwing
    if (error.code === '23505') { // Unique violation for email
        throw new Error('User with this email already exists.');
    }
    throw error; // Re-throw other errors
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const sql = 'SELECT id, email, password_hash, created_at FROM users WHERE email = $1';
  try {
    const result = await query(sql, [email]);
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error; // Re-throw
  }
};
