import { v4 as uuidv4 } from 'uuid';
import { 
  User, InsertUser, 
  Message, InsertMessage, 
  ContactRequest, InsertContactRequest, UpdateContactRequest,
  Contact
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<User>): Promise<User | undefined>;
  searchUsersByUsername(username: string): Promise<User[]>;
  
  // OTP verification
  storeVerificationCode(phoneNumber: string, code: string): Promise<void>;
  verifyOTP(phoneNumber: string, code: string): Promise<boolean>;
  
  // Contact requests
  createContactRequest(request: InsertContactRequest & { senderId: string }): Promise<ContactRequest>;
  getContactRequest(id: string): Promise<ContactRequest | undefined>;
  getContactRequestsByUser(userId: string, status?: 'pending' | 'accepted' | 'rejected'): Promise<ContactRequest[]>;
  updateContactRequestStatus(id: string, status: UpdateContactRequest): Promise<ContactRequest | undefined>;
  
  // Contacts
  getContacts(userId: string): Promise<User[]>;
  addContact(userId: string, contactId: string): Promise<Contact>;
  
  // Messages
  createMessage(message: InsertMessage & { senderId: string }): Promise<Message>;
  getMessagesByUsers(user1Id: string, user2Id: string): Promise<Message[]>;
  updateMessageStatus(id: string, status: 'sent' | 'delivered' | 'read'): Promise<Message | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private messages: Map<string, Message>;
  private contactRequests: Map<string, ContactRequest>;
  private contacts: Map<string, Contact>;
  private verificationCodes: Map<string, string>; // phoneNumber -> code

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.contactRequests = new Map();
    this.contacts = new Map();
    this.verificationCodes = new Map();
  }

  // User management
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.phoneNumber === phoneNumber
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = uuidv4();
    const now = new Date();
    
    const user: User = {
      id,
      ...userData,
      profilePicture: userData.profilePicture || null,
      status: userData.status || "Hey, I'm using WhatsPe!",
      lastSeen: now,
      createdAt: now,
      updatedAt: now,
      verificationCode: null,
      verified: true // Since they went through OTP verification
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      ...userData,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async searchUsersByUsername(username: string): Promise<User[]> {
    const lowercaseUsername = username.toLowerCase();
    return Array.from(this.users.values()).filter(
      (user) => user.username.toLowerCase().includes(lowercaseUsername)
    );
  }

  // OTP verification
  async storeVerificationCode(phoneNumber: string, code: string): Promise<void> {
    this.verificationCodes.set(phoneNumber, code);
    
    // Find if user already exists, and update verification code
    const existingUser = await this.getUserByPhone(phoneNumber);
    if (existingUser) {
      await this.updateUser(existingUser.id, { verificationCode: code });
    }
  }

  async verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
    const storedCode = this.verificationCodes.get(phoneNumber);
    if (!storedCode) return false;
    
    const isValid = storedCode === code;
    
    if (isValid) {
      // Clear code after successful verification
      this.verificationCodes.delete(phoneNumber);
      
      // Update user verification status if exists
      const existingUser = await this.getUserByPhone(phoneNumber);
      if (existingUser) {
        await this.updateUser(existingUser.id, { 
          verified: true,
          verificationCode: null
        });
      }
    }
    
    return isValid;
  }

  // Contact requests
  async createContactRequest(request: InsertContactRequest & { senderId: string }): Promise<ContactRequest> {
    const id = uuidv4();
    const now = new Date();
    
    const contactRequest: ContactRequest = {
      id,
      senderId: request.senderId,
      receiverId: request.receiverId,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    
    this.contactRequests.set(id, contactRequest);
    return contactRequest;
  }

  async getContactRequest(id: string): Promise<ContactRequest | undefined> {
    return this.contactRequests.get(id);
  }

  async getContactRequestsByUser(userId: string, status?: 'pending' | 'accepted' | 'rejected'): Promise<ContactRequest[]> {
    return Array.from(this.contactRequests.values()).filter(
      (request) => {
        if (status) {
          return (request.receiverId === userId || request.senderId === userId) && request.status === status;
        }
        return request.receiverId === userId || request.senderId === userId;
      }
    );
  }

  async updateContactRequestStatus(id: string, { status }: UpdateContactRequest): Promise<ContactRequest | undefined> {
    const request = await this.getContactRequest(id);
    if (!request) return undefined;
    
    const updatedRequest = {
      ...request,
      status,
      updatedAt: new Date()
    };
    
    this.contactRequests.set(id, updatedRequest);
    
    // If accepted, create mutual contacts
    if (status === 'accepted') {
      await this.addContact(request.senderId, request.receiverId);
      await this.addContact(request.receiverId, request.senderId);
    }
    
    return updatedRequest;
  }

  // Contacts
  async getContacts(userId: string): Promise<User[]> {
    const contactsList = Array.from(this.contacts.values()).filter(
      (contact) => contact.userId === userId
    );
    
    const contactPromises = contactsList.map((contact) => 
      this.getUser(contact.contactId)
    );
    
    const contacts = await Promise.all(contactPromises);
    return contacts.filter((contact): contact is User => !!contact);
  }

  async addContact(userId: string, contactId: string): Promise<Contact> {
    const id = uuidv4();
    const now = new Date();
    
    const contact: Contact = {
      id,
      userId,
      contactId,
      createdAt: now
    };
    
    this.contacts.set(id, contact);
    return contact;
  }

  // Messages
  async createMessage(message: InsertMessage & { senderId: string }): Promise<Message> {
    const id = uuidv4();
    const now = new Date();
    
    const newMessage: Message = {
      id,
      ...message,
      status: 'sent',
      createdAt: now,
      updatedAt: now
    };
    
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async getMessagesByUsers(user1Id: string, user2Id: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (message) => 
        (message.senderId === user1Id && message.receiverId === user2Id) ||
        (message.senderId === user2Id && message.receiverId === user1Id)
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateMessageStatus(id: string, status: 'sent' | 'delivered' | 'read'): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = {
      ...message,
      status,
      updatedAt: new Date()
    };
    
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }
}

import { DynamoDBStorage } from './dynamo-storage';
import { log } from './vite';

// Choose the storage implementation based on environment
const USE_DYNAMODB = true; // Set to true to use DynamoDB, false to use in-memory storage

// Create the appropriate storage instance
export const storage = USE_DYNAMODB 
  ? new DynamoDBStorage() 
  : new MemStorage();

// Log the selected storage implementation
log(`Using ${USE_DYNAMODB ? 'DynamoDB' : 'in-memory'} storage implementation`);
