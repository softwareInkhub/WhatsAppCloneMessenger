"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCallSchema = exports.insertCallSchema = exports.callSchema = exports.CallStatus = exports.otpVerificationSchema = exports.otpRequestSchema = exports.updateContactRequestSchema = exports.insertContactRequestSchema = exports.insertMessageSchema = exports.insertUserSchema = exports.contacts = exports.contactRequests = exports.messages = exports.users = exports.contactRequestStatusEnum = exports.messageStatusEnum = exports.messageTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Define message types and status enums
exports.messageTypeEnum = (0, pg_core_1.pgEnum)('message_type', ['text', 'image', 'video', 'audio', 'document']);
exports.messageStatusEnum = (0, pg_core_1.pgEnum)('message_status', ['sent', 'delivered', 'read']);
exports.contactRequestStatusEnum = (0, pg_core_1.pgEnum)('contact_request_status', ['pending', 'accepted', 'rejected']);
// User schema
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    phoneNumber: (0, pg_core_1.text)("phone_number").notNull().unique(),
    profilePicture: (0, pg_core_1.text)("profile_picture"),
    status: (0, pg_core_1.text)("status").default("Hey, I'm using WhatsPe!"),
    lastSeen: (0, pg_core_1.timestamp)("last_seen", { withTimezone: true }).defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
    verificationCode: (0, pg_core_1.text)("verification_code"),
    verified: (0, pg_core_1.boolean)("verified").default(false),
});
// Messages schema
exports.messages = (0, pg_core_1.pgTable)("messages", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    senderId: (0, pg_core_1.uuid)("sender_id").notNull().references(() => exports.users.id),
    receiverId: (0, pg_core_1.uuid)("receiver_id").notNull().references(() => exports.users.id),
    content: (0, pg_core_1.text)("content").notNull(),
    type: (0, exports.messageTypeEnum)("type").default('text'),
    status: (0, exports.messageStatusEnum)("status").default('sent'),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
// Contact requests schema
exports.contactRequests = (0, pg_core_1.pgTable)("contact_requests", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    senderId: (0, pg_core_1.uuid)("sender_id").notNull().references(() => exports.users.id),
    receiverId: (0, pg_core_1.uuid)("receiver_id").notNull().references(() => exports.users.id),
    status: (0, exports.contactRequestStatusEnum)("status").default('pending'),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
// Contacts (accepted contact requests) schema
exports.contacts = (0, pg_core_1.pgTable)("contacts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => exports.users.id),
    contactId: (0, pg_core_1.uuid)("contact_id").notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
});
// Zod schemas for validation
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users, {
    email: zod_1.z.string().email(),
    phoneNumber: zod_1.z.string().min(10),
    username: zod_1.z.string().min(3),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastSeen: true,
    verificationCode: true,
    verified: true
});
exports.insertMessageSchema = zod_1.z.object({
    receiverId: zod_1.z.string().uuid(),
    content: zod_1.z.string().min(1),
    type: zod_1.z.enum(['text', 'image', 'video', 'audio', 'document']).default('text'),
    status: zod_1.z.enum(['sent', 'delivered', 'read']).optional().default('sent'),
});
// We need to exclude senderId from validation because it's added server-side
exports.insertContactRequestSchema = zod_1.z.object({
    receiverId: zod_1.z.string().uuid()
});
exports.updateContactRequestSchema = (0, drizzle_zod_1.createInsertSchema)(exports.contactRequests, {
    status: zod_1.z.enum(['pending', 'accepted', 'rejected']),
}).pick({
    status: true
});
// OTP verification schema
exports.otpRequestSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().min(10),
});
exports.otpVerificationSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().min(10),
    verificationCode: zod_1.z.string().length(6),
});
var CallStatus;
(function (CallStatus) {
    CallStatus["INITIATING"] = "initiating";
    CallStatus["RINGING"] = "ringing";
    CallStatus["CONNECTED"] = "connected";
    CallStatus["ENDED"] = "ended";
    CallStatus["MISSED"] = "missed";
    CallStatus["REJECTED"] = "rejected";
})(CallStatus || (exports.CallStatus = CallStatus = {}));
exports.callSchema = zod_1.z.object({
    id: zod_1.z.string(),
    callerId: zod_1.z.string(),
    receiverId: zod_1.z.string(),
    type: zod_1.z.enum(['audio', 'video']),
    status: zod_1.z.nativeEnum(CallStatus),
    startTime: zod_1.z.string().optional(),
    endTime: zod_1.z.string().optional(),
    duration: zod_1.z.number().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.insertCallSchema = exports.callSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.updateCallSchema = exports.callSchema
    .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
})
    .partial();
