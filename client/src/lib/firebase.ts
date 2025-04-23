import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  PhoneAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';

// Initialize Firebase with environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: '', // Not required for phone auth
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/**
 * Creates an invisible reCAPTCHA verifier
 * @param containerId HTML element ID where reCAPTCHA will be rendered
 * @returns RecaptchaVerifier instance
 */
export function createRecaptchaVerifier(containerId: string) {
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved, allow sign-in
    }
  });
}

/**
 * Sends an OTP to the given phone number
 * @param phoneNumber Phone number with country code (e.g. +1234567890)
 * @param recaptchaVerifier reCAPTCHA verifier instance
 * @returns A confirmation result that can be used to complete sign in
 */
export async function sendOTP(phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return confirmationResult;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
}

/**
 * Verifies the OTP entered by the user
 * @param confirmationResult Confirmation result from sendOTP
 * @param otpCode OTP code entered by the user
 * @returns User credential
 */
export async function verifyOTP(confirmationResult: any, otpCode: string) {
  try {
    const result = await confirmationResult.confirm(otpCode);
    return result.user;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
}

/**
 * Gets the current user from Firebase Authentication
 * @returns The current Firebase user or null if not signed in
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Subscribes to auth state changes
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Signs out the current user
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export { auth };