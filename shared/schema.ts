import { pgTable, text, serial, integer, boolean, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define message types and status enums
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'video', 'audio', 'document']);
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read']);
export const contactRequestStatusEnum = pgEnum('contact_request_status', ['pending', 'accepted', 'rejected']);

// User schema
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").notNull().unique(),
  profilePicture: text("profile_picture"),
  status: text("status").default("Hey, I'm using WhatsPe!"),
  lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  verificationCode: text("verification_code"),
  verified: boolean("verified").default(false),
});

// Messages schema
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  receiverId: uuid("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  type: messageTypeEnum("type").default('text'),
  status: messageStatusEnum("status").default('sent'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Contact requests schema
export const contactRequests = pgTable("contact_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  receiverId: uuid("receiver_id").notNull().references(() => users.id),
  status: contactRequestStatusEnum("status").default('pending'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Contacts (accepted contact requests) schema
export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  contactId: uuid("contact_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  phoneNumber: z.string().min(10),
  username: z.string().min(3),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  lastSeen: true, 
  verificationCode: true, 
  verified: true
});

export const insertMessageSchema = createInsertSchema(messages, {
  content: z.string().min(1),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertContactRequestSchema = createInsertSchema(contactRequests, {
  receiverId: z.string().uuid(),
}).omit({ 
  id: true, 
  status: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateContactRequestSchema = createInsertSchema(contactRequests, {
  status: z.enum(['pending', 'accepted', 'rejected']),
}).pick({ 
  status: true 
});

// OTP verification schema
export const otpRequestSchema = z.object({
  phoneNumber: z.string().min(10),
});

export const otpVerificationSchema = z.object({
  phoneNumber: z.string().min(10),
  verificationCode: z.string().length(6),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type ContactRequest = typeof contactRequests.$inferSelect;
export type InsertContactRequest = z.infer<typeof insertContactRequestSchema>;
export type UpdateContactRequest = z.infer<typeof updateContactRequestSchema>;

export type Contact = typeof contacts.$inferSelect;

export type OTPRequest = z.infer<typeof otpRequestSchema>;
export type OTPVerification = z.infer<typeof otpVerificationSchema>;
