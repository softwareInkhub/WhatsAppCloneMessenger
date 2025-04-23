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
      
      try {
        // Try Firebase authentication first
        const container = document.getElementById(recaptchaContainerId);
        
        // Make sure the container exists before creating recaptchaVerifier
        if (!container) {
          console.error('Recaptcha container not found');
          throw new Error('Recaptcha container not found');
        }
        
        const recaptchaVerifier = createRecaptchaVerifier(recaptchaContainerId);
        const confirmationResult = await sendOTP(formattedPhoneNumber, recaptchaVerifier);
        return confirmationResult;
      } catch (firebaseError: any) {
        console.error('Firebase auth error:', firebaseError);
        
        // If we hit a billing error or other Firebase issue, fall back to our backend OTP
        if (firebaseError.code === 'auth/billing-not-enabled' || 
            firebaseError.code === 'auth/quota-exceeded' ||
            firebaseError.code === 'auth/captcha-check-failed' ||
            firebaseError.message === 'Recaptcha container not found') {
          
          console.log('Falling back to server OTP verification');
          
          // Call our backend OTP API
          const response = await apiRequest('POST', '/auth/request-otp', {
            phoneNumber: formattedPhoneNumber
          });
          
          // The apiRequest will throw if not ok, but let's check anyway
          if (!response.ok) {
            throw new Error('Failed to send verification code');
          }
          
          // Process the response based on content type
          const contentType = response.headers.get('content-type');
          let data = {};
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            // If not JSON, just use a simple object
            data = { message: 'Verification code sent' };
          }
          
          // Return a mock confirmation object that will be handled in confirmVerificationCode
          return {
            confirm: async (code: string) => {
              // This will be handled by our backend in confirmVerificationCode
              return { 
                user: { 
                  phoneNumber: formattedPhoneNumber 
                }
              };
            },
            // Flag to indicate we're using the fallback method
            _isFallback: true,
            _phoneNumber: formattedPhoneNumber,
            // In development, include the code (if available) for testing
            _devCode: (data as any).code || '123456' 
          };
        }
        
        // Re-throw other Firebase errors
        throw firebaseError;
      }
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
      let phoneNumber;
      let isVerified = false;
      
      // Check if we're using the fallback method
      if (confirmationResult._isFallback) {
        console.log('Using fallback OTP verification method');
        phoneNumber = confirmationResult._phoneNumber;
        
        // Verify the OTP with our backend
        const response = await apiRequest('POST', '/auth/verify-otp', {
          phoneNumber,
          verificationCode
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Invalid code' }));
          throw new Error(errorData.error || 'Invalid verification code');
        }
        
        // Get data from response, safely
        let data;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            console.log('Non-JSON response from verify-otp:', text);
            data = { isNewUser: true, phoneNumber };
          }
        } catch (error) {
          console.error('Error parsing response:', error);
          data = { isNewUser: true, phoneNumber };
        }
        
        // If the response contains user data, the user exists
        if (data.id) {
          console.log('User found in database:', data);
          setCurrentUser(data);
          localStorage.setItem('currentUser', JSON.stringify(data));
          isVerified = true;
          return data;
        } else if (data.isNewUser) {
          // User needs to be registered
          console.log('New user needs registration', data);
          isVerified = true;
          // Create a pseudo-firebase user to track verification state
          setFirebaseUser({ 
            phoneNumber, 
            isAnonymous: false, 
            uid: 'local-auth-' + Date.now() 
          } as any);
          return null;
        } else {
          throw new Error('Failed to verify OTP code');
        }
      } else {
        // Use Firebase authentication
        const firebaseUser = await verifyOTP(confirmationResult, verificationCode);
        phoneNumber = firebaseUser.phoneNumber;
        setFirebaseUser(firebaseUser);
        
        // Check if the user exists in the backend
        const response = await apiRequest('POST', '/auth/verify-otp', {
          phoneNumber,
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
      }
    } catch (error: any) {
      console.error('Verification error:', error);
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
      if (!firebaseUser && !userData.phoneNumber) {
        throw new Error('Phone verification required before registration');
      }
      
      // Determine verification source - either Firebase or our fallback method
      const isFirebaseVerified = firebaseUser && !firebaseUser.uid.startsWith('local-auth-');
      const phoneNumber = firebaseUser?.phoneNumber || userData.phoneNumber;
      
      console.log('Registering user with phone:', phoneNumber, 'Firebase verified:', isFirebaseVerified);
      
      const response = await apiRequest('POST', '/auth/register', {
        ...userData,
        phoneNumber,
        verified: isFirebaseVerified // Only mark as fully verified if done through Firebase
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Registration failed' }));
        throw new Error(errorData.error || 'Registration failed');
      }
      
      const newUser = await response.json();
      setCurrentUser(newUser);
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      return newUser;
    } catch (error: any) {
      console.error('Registration error:', error);
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
      await apiRequest('POST', '/auth/logout');
      
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