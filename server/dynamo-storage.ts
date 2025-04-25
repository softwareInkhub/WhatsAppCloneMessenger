import { v4 as uuidv4 } from 'uuid';
import { 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  UpdateCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";
import { dynamoDB, TableNames } from './dynamo-client';
import { 
  User, 
  Contact, 
  Message, 
  ContactRequest, 
  InsertUser, 
  InsertMessage, 
  InsertContactRequest, 
  UpdateContactRequest 
} from '@shared/schema';

import {
  DynamoUser,
  DynamoContact,
  DynamoMessage,
  DynamoContactRequest,
  DynamoInsertUser,
  DynamoInsertMessage,
  DynamoInsertContactRequest,
  DynamoUpdateContactRequest
} from '@shared/dynamo-schema';
import { IStorage } from './storage';
import { log } from './vite';

export class DynamoDBStorage implements IStorage {
  // User management
  async getUser(id: string): Promise<User | undefined> {
    const command = new GetCommand({
      TableName: TableNames.USERS,
      Key: { id }
    });
    
    try {
      const response = await dynamoDB.docClient.send(command);
      return response.Item as User;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const command = new QueryCommand({
      TableName: TableNames.USERS,
      IndexName: 'UsernameIndex',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: {
        ':username': username
      }
    });
    
    try {
      const response = await dynamoDB.docClient.send(command);
      return response.Items?.[0] as User;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const command = new QueryCommand({
      TableName: TableNames.USERS,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    });
    
    try {
      const response = await dynamoDB.docClient.send(command);
      return response.Items?.[0] as User;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const command = new QueryCommand({
      TableName: TableNames.USERS,
      IndexName: 'PhoneNumberIndex',
      KeyConditionExpression: 'phoneNumber = :phoneNumber',
      ExpressionAttributeValues: {
        ':phoneNumber': phoneNumber
      }
    });
    
    try {
      const response = await dynamoDB.docClient.send(command);
      return response.Items?.[0] as User;
    } catch (error) {
      console.error('Error getting user by phone:', error);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    const now = new Date();
    const nowIso = now.toISOString();
    
    // Create DynamoDB compatible user object
    const dynamoUser: DynamoUser = {
      id: uuidv4(),
      username: userData.username,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      profilePicture: userData.profilePicture || null,
      status: userData.status || "Hey, I'm using WhatsPe!",
      lastSeen: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      verified: true
    };
    
    const command = new PutCommand({
      TableName: TableNames.USERS,
      Item: dynamoUser
    });
    
    try {
      await dynamoDB.docClient.send(command);
      
      // Convert back to app schema for consistency
      const user: User = {
        id: dynamoUser.id,
        username: dynamoUser.username,
        email: dynamoUser.email,
        phoneNumber: dynamoUser.phoneNumber,
        profilePicture: dynamoUser.profilePicture,
        status: dynamoUser.status,
        verificationCode: dynamoUser.verificationCode || null,
        verified: dynamoUser.verified,
        lastSeen: now,
        createdAt: now,
        updatedAt: now
      };
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    // Build expression
    let updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': new Date().toISOString()
    };
    
    // Add each field to the update expression
    Object.entries(userData).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        updateExpression += `, ${key} = :${key}`;
        expressionAttributeValues[`:${key}`] = value;
      }
    });
    
    const command = new UpdateCommand({
      TableName: TableNames.USERS,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });
    
    try {
      const response = await dynamoDB.docClient.send(command);
      return response.Attributes as User;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async searchUsersByUsername(username: string): Promise<User[]> {
    // DynamoDB doesn't support LIKE queries, so we'll do a scan with a begins_with filter
    const command = new ScanCommand({
      TableName: TableNames.USERS,
      FilterExpression: 'begins_with(username, :username)',
      ExpressionAttributeValues: {
        ':username': username
      }
    });
    
    try {
      const response = await dynamoDB.docClient.send(command);
      return (response.Items || []) as User[];
    } catch (error) {
      console.error('Error searching users by username:', error);
      return [];
    }
  }
  
  // OTP verification
  async storeVerificationCode(phoneNumber: string, code: string): Promise<void> {
    // For development or local testing, just log the code without attempting DB storage
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local') {
      console.log(`DEVELOPMENT MODE: OTP code for ${phoneNumber} is ${code}`);
      
      // For local development, don't rely on DynamoDB
      if (process.env.LOCAL === 'true') {
        console.log('LOCAL MODE: Skipping DynamoDB operations');
        return;
      }
    }
    
    const command = new PutCommand({
      TableName: TableNames.VERIFICATION_CODES,
      Item: {
        phoneNumber,
        code,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes expiry
      }
    });
    
    try {
      console.log(`Attempting to store OTP code in DynamoDB for ${phoneNumber}`);
      await dynamoDB.docClient.send(command);
      console.log(`Successfully stored OTP code in DynamoDB for ${phoneNumber}`);
    } catch (error) {
      console.error('Error storing verification code:', error);
      // For development, don't throw error - just log it
      if (process.env.NODE_ENV === 'development') {
        console.log('Continuing despite DynamoDB error in development mode');
        return;
      }
      throw error;
    }
  }

  async verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
    // For development or local testing, accept fixed code
    if ((process.env.NODE_ENV === 'development' || process.env.LOCAL === 'true') && code === '123456') {
      console.log(`DEVELOPMENT MODE: Automatically validating OTP for ${phoneNumber}`);
      return true;
    }
    
    // For local development, don't rely on DynamoDB at all
    if (process.env.LOCAL === 'true') {
      console.log('LOCAL MODE: Skipping DynamoDB operations for OTP verification');
      return code === '123456'; // Only accept the fixed code in local mode
    }
    
    const command = new GetCommand({
      TableName: TableNames.VERIFICATION_CODES,
      Key: { phoneNumber }
    });
    
    try {
      console.log(`Attempting to verify OTP code in DynamoDB for ${phoneNumber}`);
      const response = await dynamoDB.docClient.send(command);
      const item = response.Item;
      
      if (!item) {
        console.log(`No verification code found for ${phoneNumber}`);
        return false;
      }
      
      // Check if code matches and hasn't expired
      if (item.code === code && new Date(item.expiresAt) > new Date()) {
        console.log(`Valid OTP verified for ${phoneNumber}`);
        return true;
      }
      
      console.log(`Invalid or expired OTP for ${phoneNumber}`);
      return false;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      // In development mode, accept code despite DynamoDB errors
      if (process.env.NODE_ENV === 'development') {
        console.log(`DEVELOPMENT MODE: Accepting OTP despite DynamoDB error for ${phoneNumber}`);
        return code === '123456'; // Only accept the fixed code
      }
      return false;
    }
  }
  
  // Contact requests
  async createContactRequest(request: InsertContactRequest & { senderId: string }): Promise<ContactRequest> {
    const now = new Date();
    const nowIso = now.toISOString();
    
    // Create a DynamoDB compatible contact request
    const dynamoContactRequest: DynamoContactRequest = {
      id: uuidv4(),
      senderId: request.senderId,
      receiverId: request.receiverId,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso
    };
    
    const command = new PutCommand({
      TableName: TableNames.CONTACT_REQUESTS,
      Item: dynamoContactRequest
    });
    
    try {
      await dynamoDB.docClient.send(command);
      
      // Convert to app schema
      const contactRequest: ContactRequest = {
        ...dynamoContactRequest,
        createdAt: now,
        updatedAt: now
      };
      
      return contactRequest;
    } catch (error) {
      console.error('Error creating contact request:', error);
      throw error;
    }
  }

  async getContactRequest(id: string): Promise<ContactRequest | undefined> {
    const command = new GetCommand({
      TableName: TableNames.CONTACT_REQUESTS,
      Key: { id }
    });
    
    try {
      const response = await dynamoDB.docClient.send(command);
      if (!response.Item) return undefined;
      
      // Convert from DynamoDB format to app format
      const dynamoRequest = response.Item as DynamoContactRequest;
      return {
        ...dynamoRequest,
        createdAt: new Date(dynamoRequest.createdAt),
        updatedAt: new Date(dynamoRequest.updatedAt)
      };
    } catch (error) {
      console.error('Error getting contact request:', error);
      return undefined;
    }
  }

  async getContactRequestsByUser(userId: string, status?: 'pending' | 'accepted' | 'rejected'): Promise<ContactRequest[]> {
    // Query by receiverId (for incoming requests)
    const receiverCommand = new QueryCommand({
      TableName: TableNames.CONTACT_REQUESTS,
      IndexName: 'ReceiverIdIndex',
      KeyConditionExpression: status 
        ? 'receiverId = :userId AND #status = :status' 
        : 'receiverId = :userId',
      ExpressionAttributeValues: status
        ? { ':userId': userId, ':status': status }
        : { ':userId': userId },
      ExpressionAttributeNames: {
        '#status': 'status'
      }
    });
    
    // Query by senderId (for outgoing requests)
    const senderCommand = new QueryCommand({
      TableName: TableNames.CONTACT_REQUESTS,
      IndexName: 'SenderIdIndex',
      KeyConditionExpression: status 
        ? 'senderId = :userId AND #status = :status' 
        : 'senderId = :userId',
      ExpressionAttributeValues: status
        ? { ':userId': userId, ':status': status }
        : { ':userId': userId },
      ExpressionAttributeNames: {
        '#status': 'status'
      }
    });
    
    try {
      const [receiverResponse, senderResponse] = await Promise.all([
        dynamoDB.docClient.send(receiverCommand),
        dynamoDB.docClient.send(senderCommand)
      ]);
      
      // Combine and convert requests
      const receiverRequests = (receiverResponse.Items || []).map(item => {
        const dynamoRequest = item as DynamoContactRequest;
        return {
          ...dynamoRequest,
          createdAt: new Date(dynamoRequest.createdAt),
          updatedAt: new Date(dynamoRequest.updatedAt)
        };
      });
      
      const senderRequests = (senderResponse.Items || []).map(item => {
        const dynamoRequest = item as DynamoContactRequest;
        return {
          ...dynamoRequest,
          createdAt: new Date(dynamoRequest.createdAt),
          updatedAt: new Date(dynamoRequest.updatedAt)
        };
      });
      
      return [...receiverRequests, ...senderRequests];
    } catch (error) {
      console.error('Error getting contact requests by user:', error);
      return [];
    }
  }

  async updateContactRequestStatus(id: string, { status }: UpdateContactRequest): Promise<ContactRequest | undefined> {
    const request = await this.getContactRequest(id);
    if (!request) return undefined;
    
    const now = new Date();
    const nowIso = now.toISOString();
    
    const command = new UpdateCommand({
      TableName: TableNames.CONTACT_REQUESTS,
      Key: { id },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': nowIso
      },
      ReturnValues: 'ALL_NEW'
    });
    
    try {
      const response = await dynamoDB.docClient.send(command);
      if (!response.Attributes) return undefined;
      
      // Convert to app schema
      const dynamoRequest = response.Attributes as DynamoContactRequest;
      const updatedRequest = {
        ...dynamoRequest,
        createdAt: new Date(dynamoRequest.createdAt),
        updatedAt: new Date(dynamoRequest.updatedAt)
      };
      
      // If accepted, create mutual contacts and handle any existing requests
      if (status === 'accepted') {
        try {
          // Add mutual contacts
          await Promise.all([
            this.addContact(request.senderId, request.receiverId),
            this.addContact(request.receiverId, request.senderId)
          ]);
          
          // Update any other pending requests between these users to rejected
          const allRequests = await this.getContactRequestsByUser(request.senderId);
          const otherPendingRequests = allRequests.filter(r => 
            r.id !== id && 
            r.status === 'pending' && 
            ((r.senderId === request.senderId && r.receiverId === request.receiverId) ||
             (r.senderId === request.receiverId && r.receiverId === request.senderId))
          );
          
          await Promise.all(
            otherPendingRequests.map(r => 
              this.updateContactRequestStatus(r.id, { status: 'rejected' })
            )
          );
        } catch (error) {
          console.error('Error handling contact request acceptance:', error);
          // If error is due to existing contact, we can ignore it
          if (!(error instanceof Error && error.message === 'Contact already exists')) {
            throw error;
          }
        }
      }
      
      return updatedRequest;
    } catch (error) {
      console.error('Error updating contact request status:', error);
      return undefined;
    }
  }
  
  // Contacts
  async getContacts(userId: string): Promise<User[]> {
    const command = new QueryCommand({
      TableName: TableNames.CONTACTS,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    });
    
    try {
      const response = await dynamoDB.docClient.send(command);
      if (!response.Items || response.Items.length === 0) return [];
      
      // Get unique contact IDs to prevent duplicates
      const contactIds = [...new Set(response.Items.map(item => item.contactId))];
      
      // Fetch all contact users in parallel
      const contactUsers = await Promise.all(
        contactIds.map(contactId => this.getUser(contactId))
      );
      
      // Filter out any undefined users and sort by username
      return contactUsers
        .filter((user): user is User => user !== undefined)
        .sort((a, b) => a.username.localeCompare(b.username));
    } catch (error) {
      console.error('Error getting contacts:', error);
      return [];
    }
  }

  async addContact(userId: string, contactId: string): Promise<Contact> {
    // First check if contact already exists
    const existingContacts = await this.getContacts(userId);
    if (existingContacts.some(contact => contact.id === contactId)) {
      throw new Error('Contact already exists');
    }

    const now = new Date();
    const nowIso = now.toISOString();
    
    // Create a DynamoDB compatible contact
    const dynamoContact: DynamoContact = {
      id: uuidv4(),
      userId,
      contactId,
      createdAt: nowIso
    };
    
    const command = new PutCommand({
      TableName: TableNames.CONTACTS,
      Item: dynamoContact,
      // Add condition to prevent duplicate contacts
      ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(contactId)'
    });
    
    try {
      await dynamoDB.docClient.send(command);
      
      // Convert to app schema
      const contact: Contact = {
        ...dynamoContact,
        createdAt: now
      };
      
      return contact;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }
  
  // Messages
  async createMessage(message: InsertMessage & { senderId: string }): Promise<Message> {
    const now = new Date();
    const nowIso = now.toISOString();
    
    // Create a DynamoDB compatible message
    const dynamoMessage: DynamoMessage = {
      id: uuidv4(),
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      type: message.type || 'text',
      status: message.status || 'sent',
      createdAt: nowIso,
      updatedAt: nowIso
    };
    
    const command = new PutCommand({
      TableName: TableNames.MESSAGES,
      Item: dynamoMessage
    });
    
    try {
      await dynamoDB.docClient.send(command);
      
      // Convert to app schema
      const appMessage: Message = {
        ...dynamoMessage,
        createdAt: now,
        updatedAt: now
      };
      
      return appMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async getMessagesByUsers(user1Id: string, user2Id: string): Promise<Message[]> {
    // Query messages where user1 is sender and user2 is receiver
    const command1 = new QueryCommand({
      TableName: TableNames.MESSAGES,
      IndexName: 'SenderReceiverIndex',
      KeyConditionExpression: 'senderId = :senderId AND receiverId = :receiverId',
      ExpressionAttributeValues: {
        ':senderId': user1Id,
        ':receiverId': user2Id
      }
    });
    
    // Query messages where user2 is sender and user1 is receiver
    const command2 = new QueryCommand({
      TableName: TableNames.MESSAGES,
      IndexName: 'SenderReceiverIndex',
      KeyConditionExpression: 'senderId = :senderId AND receiverId = :receiverId',
      ExpressionAttributeValues: {
        ':senderId': user2Id,
        ':receiverId': user1Id
      }
    });
    
    try {
      const [response1, response2] = await Promise.all([
        dynamoDB.docClient.send(command1),
        dynamoDB.docClient.send(command2)
      ]);
      
      // Combine and convert messages
      const messages1 = (response1.Items || []).map(item => {
        const dynamoMessage = item as DynamoMessage;
        return {
          ...dynamoMessage,
          createdAt: new Date(dynamoMessage.createdAt),
          updatedAt: new Date(dynamoMessage.updatedAt)
        };
      });
      
      const messages2 = (response2.Items || []).map(item => {
        const dynamoMessage = item as DynamoMessage;
        return {
          ...dynamoMessage,
          createdAt: new Date(dynamoMessage.createdAt),
          updatedAt: new Date(dynamoMessage.updatedAt)
        };
      });
      
      // Combine and sort by creation date (oldest first)
      const allMessages = [...messages1, ...messages2];
      return allMessages.sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      );
    } catch (error) {
      console.error('Error getting messages by users:', error);
      return [];
    }
  }

  async updateMessageStatus(id: string, status: 'sent' | 'delivered' | 'read'): Promise<Message | undefined> {
    const now = new Date();
    const nowIso = now.toISOString();
    
    const command = new UpdateCommand({
      TableName: TableNames.MESSAGES,
      Key: { id },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': nowIso
      },
      ReturnValues: 'ALL_NEW'
    });
    
    try {
      const response = await dynamoDB.docClient.send(command);
      if (!response.Attributes) return undefined;
      
      // Convert to app schema
      const dynamoMessage = response.Attributes as DynamoMessage;
      return {
        ...dynamoMessage,
        createdAt: new Date(dynamoMessage.createdAt),
        updatedAt: new Date(dynamoMessage.updatedAt)
      };
    } catch (error) {
      console.error('Error updating message status:', error);
      return undefined;
    }
  }
}