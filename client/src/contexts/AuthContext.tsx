import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  auth, 
  subscribeToAuthChanges, 
  sendOTP, 
  verifyOTP, 
  createRecaptchaVerifier, 
  logoutUser 
} from '@/lib/firebase';
import { User } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sendVerificationCode: (phoneNumber: string, recaptchaContainerId: string) => Promise<any>;
  confirmVerificationCode: (confirmationResult: any, verificationCode: string) => Promise<User>;
  registerUser: (userData: { username: string; email: string; phoneNumber: string }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthProvider - Checking localStorage for user data');
    // Check if user data exists in local storage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('Found user in localStorage, restoring session:', userData);
        setCurrentUser(userData);
      } catch (e) {
        console.error('Failed to parse user data from localStorage:', e);
        localStorage.removeItem('currentUser');
      }
    }
    
    // Subscribe to Firebase auth state changes
    const unsubscribe = subscribeToAuthChanges((user) => {
      setFirebaseUser(user);
      setIsLoading(false);
      
      if (!user && currentUser) {
        // If Firebase user is null but we have a currentUser, fetch user data from API
        // This handles app refreshes when Firebase session might be lost but API session is valid
        fetchUserData();
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await apiRequest('GET', '/api/user');
      
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
      } else {
        // If API request fails, clear local user data
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to fetch user data');
    }
  };

  const sendVerificationCode = async (phoneNumber: string, recaptchaContainerId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Format the phone number for Firebase (add + if not present)
      const formattedPhoneNumber = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+${phoneNumber}`;
      
      // Create a reCAPTCHA verifier
      const recaptchaVerifier = createRecaptchaVerifier(recaptchaContainerId);
      
      // Send OTP to the phone number
      const confirmationResult = await sendOTP(formattedPhoneNumber, recaptchaVerifier);
      return confirmationResult;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send verification code';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmVerificationCode = async (confirmationResult: any, verificationCode: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Verify the OTP
      const firebaseUser = await verifyOTP(confirmationResult, verificationCode);
      setFirebaseUser(firebaseUser);
      
      // Check if the user exists in the backend
      const response = await apiRequest('POST', '/api/auth/verify-otp', {
        phoneNumber: firebaseUser.phoneNumber,
        code: "firebase-verified" // Special code to indicate Firebase verified the OTP
      });
      
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        return userData;
      } else if (response.status === 404) {
        // User not found, return null to indicate registration is needed
        return null;
      } else {
        throw new Error('Failed to verify user with backend');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to verify code';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (userData: { username: string; email: string; phoneNumber: string }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!firebaseUser) {
        throw new Error('Phone verification required before registration');
      }
      
      const response = await apiRequest('POST', '/api/auth/register', {
        ...userData,
        phoneNumber: firebaseUser.phoneNumber || userData.phoneNumber,
        verified: true // Phone already verified by Firebase
      });
      
      if (response.ok) {
        const newUser = await response.json();
        setCurrentUser(newUser);
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        return newUser;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(errorData.message || 'Registration failed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Sign out from Firebase
      await logoutUser();
      
      // Call backend logout API
      await apiRequest('POST', '/api/auth/logout');
      
      // Clear user state
      setCurrentUser(null);
      setFirebaseUser(null);
      localStorage.removeItem('currentUser');
    } catch (error: any) {
      const errorMessage = error.message || 'Logout failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentUser,
    firebaseUser,
    isAuthenticated: !!currentUser,
    isLoading,
    error,
    sendVerificationCode,
    confirmVerificationCode,
    registerUser,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}