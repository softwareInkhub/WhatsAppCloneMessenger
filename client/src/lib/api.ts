import { apiRequest } from "./queryClient";
import { 
  InsertUser, 
  InsertMessage, 
  InsertContactRequest, 
  OTPRequest, 
  OTPVerification 
} from "@shared/schema";

// Auth API
export const requestOTP = async (data: OTPRequest) => {
  console.log("Requesting OTP for", data.phoneNumber);
  const res = await apiRequest("POST", "/api/auth/request-otp", data);
  console.log("OTP request response received");
  return res.json();
};

export const verifyOTP = async (data: OTPVerification) => {
  const res = await apiRequest("POST", "/api/auth/verify-otp", data);
  return res.json();
};

export const registerUser = async (userData: InsertUser) => {
  const res = await apiRequest("POST", "/api/auth/register", userData);
  return res.json();
};

// User API
export const searchUsers = async (query: string) => {
  const res = await apiRequest("GET", `/api/users/search?query=${encodeURIComponent(query)}`, undefined);
  return res.json();
};

// Contacts API
export const sendContactRequest = async (receiverId: string, userId: string) => {
  const res = await apiRequest(
    "POST", 
    `/api/contacts/request?userId=${userId}`, 
    { receiverId }
  );
  return res.json();
};

export const acceptContactRequest = async (requestId: string, userId: string) => {
  const res = await apiRequest(
    "POST", 
    `/api/contacts/accept/${requestId}?userId=${userId}`, 
    {}
  );
  return res.json();
};

export const rejectContactRequest = async (requestId: string, userId: string) => {
  const res = await apiRequest(
    "POST", 
    `/api/contacts/reject/${requestId}?userId=${userId}`, 
    {}
  );
  return res.json();
};

export const getContacts = async (userId: string) => {
  const res = await apiRequest("GET", `/api/contacts?userId=${userId}`, undefined);
  return res.json();
};

export const getPendingContactRequests = async (userId: string) => {
  const res = await apiRequest("GET", `/api/contacts/requests/pending?userId=${userId}`, undefined);
  return res.json();
};

// Messages API
export const sendMessage = async (message: Omit<InsertMessage, "senderId">, userId: string) => {
  const res = await apiRequest(
    "POST", 
    `/api/messages?userId=${userId}`, 
    message
  );
  return res.json();
};

export const getMessages = async (contactId: string, userId: string) => {
  const res = await apiRequest("GET", `/api/messages/${contactId}?userId=${userId}`, undefined);
  return res.json();
};
