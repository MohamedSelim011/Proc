/**
 * Utility functions for JWT token handling
 */

import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

/**
 * Decode JWT token without verification (client-side only)
 * Note: This doesn't verify the signature, only decodes the payload
 */
export function decodeJWT(token: string): any | null {
  try {
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired (client-side)
 */
export function isTokenExpired(token: string): boolean {
  try {
    if (!token) return true;
    
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return true;
    
    // exp is in seconds, Date.now() is in milliseconds
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    
    return currentTime >= expirationTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
}

/**
 * Get user role from localStorage or JWT token
 */
export function getUserRole(): string | null {
  // First try to get from localStorage
  const role = localStorage.getItem('role');
  if (role) return role;
  
  // If not found, try to decode from JWT token
  const token = localStorage.getItem('token');
  if (token) {
    const decoded = decodeJWT(token);
    if (decoded && decoded.role) {
      // Store it for future use
      localStorage.setItem('role', decoded.role);
      return decoded.role;
    }
  }
  
  return null;
}

/**
 * Get user data from localStorage or JWT token
 */
export function getUserData(): {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  department?: string;
  employeeId?: string;
  company?: string[];
  companyId?: string;
} | null {
  // First try to get from localStorage
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.id) return user;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
    }
  }
  
  // If not found, try to decode from JWT token
  const token = localStorage.getItem('token');
  if (token) {
    const decoded = decodeJWT(token);
    if (decoded) {
      const userData = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        department: decoded.department,
        employeeId: decoded.employeeId,
        company: decoded.company,
        companyId: decoded.companyId,
      };
      
      // Store it for future use
      localStorage.setItem('user', JSON.stringify(userData));
      if (decoded.role) {
        localStorage.setItem('role', decoded.role);
      }
      
      return userData;
    }
  }
  
  return null;
}

/**
 * Server-side JWT verification
 * Verifies and decodes JWT token from request headers or cookies
 */
export function verifyJWT(token: string): {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  employeeId?: string;
  company?: string[];
  companyId?: string;
} | null {
  try {
    if (!token) return null;
    
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || 'REQUESTOR',
      department: decoded.department,
      employeeId: decoded.employeeId,
      company: decoded.company,
      companyId: decoded.companyId,
    };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      console.error('JWT token has expired:', error.expiredAt);
      // Return a special indicator that token is expired
      throw new Error('TOKEN_EXPIRED');
    }
    // Invalid signatures are expected after secret rotation or stale browser tokens.
    // Treat as unauthenticated without noisy stack logs.
    if (error?.name === 'JsonWebTokenError') {
      return null;
    }
    console.error('Error verifying JWT:', error);
    return null;
  }
}

/**
 * Get authenticated user from NextRequest
 * Checks Authorization header or cookies for JWT token
 */
export function getAuthenticatedUser(request: NextRequest): {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  employeeId?: string;
  company?: string[];
  companyId?: string;
} | null {
  try {
    // Try Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return verifyJWT(token);
    }
    
    // Try cookie
    const token = request.cookies.get('token')?.value;
    if (token) {
      return verifyJWT(token);
    }
    
    return null;
  } catch (error: any) {
    if (error.message === 'TOKEN_EXPIRED') {
      // Re-throw to be handled by the route handler
      throw error;
    }
    return null;
  }
}

/**
 * Require authentication - returns user or throws error response
 */
export function requireAuth(request: NextRequest): {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  employeeId?: string;
  company?: string[];
  companyId?: string;
} {
  const user = getAuthenticatedUser(request);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

