/**
 * Utility functions for JWT token handling
 */

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

