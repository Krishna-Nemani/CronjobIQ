import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file for middleware.");
  // Potentially exit or throw an error to prevent app from running without a secret
  // For now, we'll log and let it potentially fail at runtime if JWT_SECRET is missing
}

// Extend Express Request type to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: any; // You can define a more specific type for 'user' based on your JWT payload
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not available at the time of token verification.");
    return res.status(500).json({ message: 'Internal server error: JWT secret not configured.'});
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Add decoded payload to request object
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(403).json({ message: 'Forbidden. Token has expired.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ message: 'Forbidden. Invalid token.' });
    }
    // For other errors, it might be a server issue
    console.error("Error verifying token:", error);
    return res.status(500).json({ message: 'Internal server error during token verification.' });
  }
};
