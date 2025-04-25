import { z } from "zod";

// Types for message types and statuses
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ContactRequestStatus = 'pending' | 'accepted' | 'rejected';

// Define the User type
export interface DynamoUser {
  id: string;
  username: string;
  email: string;
  phoneNumber: string;
  profilePicture: string | null;
  status: string;
  lastSeen: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  verificationCode?: string | null;
  verified: boolean;
}

// Define the Message type
export interface DynamoMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Define the ContactRequest type
export interface DynamoContactRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: ContactRequestStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Define the Contact type
export interface DynamoContact {
  id: string;
  userId: string;
  contactId: string;
  createdAt: string; // ISO date string
}

// Define the VerificationCode type
export interface DynamoVerificationCode {
  phoneNumber: string;
  code: string;
  createdAt: string; // ISO date string
  expiresAt: string; // ISO date string
}

// Zod schemas for validation
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  phoneNumber: z.string(),
  profilePicture: z.string().nullable(),
  status: z.string(),
  lastSeen: z.string(), // ISO date string
  createdAt: z.string(), // ISO date string
  updatedAt: z.string(), // ISO date string
  verificationCode: z.string().nullable().optional(),
  verified: z.boolean()
});

export const insertUserSchema = userSchema.omit({ 
  id: true, 
  lastSeen: true, 
  createdAt: true, 
  updatedAt: true, 
  verified: true,
  verificationCode: true
}).extend({
  profilePicture: z.string().nullable().optional(),
  status: z.string().optional(),
});

export const messageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  content: z.string(),
  type: z.enum(['text', 'image', 'video', 'audio', 'document']),
  status: z.enum(['sent', 'delivered', 'read']),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const insertMessageSchema = messageSchema.omit({ 
  id: true, 
  status: true, 
  createdAt: true, 
  updatedAt: true 
});

export const contactRequestSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected']),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const insertContactRequestSchema = contactRequestSchema.omit({ 
  id: true, 
  status: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateContactRequestSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected'])
});

export const contactSchema = z.object({
  id: z.string(),
  userId: z.string(),
  contactId: z.string(),
  createdAt: z.string()
});

export const otpRequestSchema = z.object({
  phoneNumber: z.string()
});

export const otpVerificationSchema = z.object({
  phoneNumber: z.string(),
  verificationCode: z.string()
});

// Type aliases
export type DynamoInsertUser = z.infer<typeof insertUserSchema>;
export type DynamoInsertMessage = z.infer<typeof insertMessageSchema>;
export type DynamoInsertContactRequest = z.infer<typeof insertContactRequestSchema>;
export type DynamoUpdateContactRequest = z.infer<typeof updateContactRequestSchema>;
export type DynamoOTPRequest = z.infer<typeof otpRequestSchema>;
export type DynamoOTPVerification = z.infer<typeof otpVerificationSchema>;