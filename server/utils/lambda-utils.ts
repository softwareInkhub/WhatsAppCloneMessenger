/**
 * AWS Lambda Utility Functions
 * 
 * This file provides utilities for making functions compatible with AWS Lambda
 * and facilitating the migration of core functionality to serverless architecture.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBStorage } from '../dynamo-storage';
import { storage } from '../storage';

// Standard Lambda response generator
export function createLambdaResponse(
  statusCode: number,
  body: any,
  headers: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

// Error response generator
export function createErrorResponse(
  statusCode: number,
  errorMessage: string
): APIGatewayProxyResult {
  return createLambdaResponse(statusCode, { error: errorMessage });
}

// Extract user ID from event with validation
export function extractUserId(event: APIGatewayProxyEvent): string | null {
  const userId = event.queryStringParameters?.userId || 
                 event.pathParameters?.userId ||
                 event.headers['x-user-id'];
                 
  return userId || null;
}

// Parse request body with error handling
export function parseBody<T>(event: APIGatewayProxyEvent): T | null {
  if (!event.body) {
    return null;
  }
  
  try {
    return JSON.parse(event.body) as T;
  } catch (error) {
    console.error('Error parsing request body:', error);
    return null;
  }
}

// Type for message data from API Gateway events
interface MessageData {
  receiverId: string;
  content: string;
  type: "text" | "image" | "video" | "audio" | "document";
  status: "sent" | "delivered" | "read";
}

// Get DynamoDB storage instance
export function getDynamoStorage(): DynamoDBStorage {
  if (storage instanceof DynamoDBStorage) {
    return storage;
  }
  
  // Create new instance if needed
  return new DynamoDBStorage();
}

/**
 * Lambda handler for sending messages
 * Can be deployed as a standalone AWS Lambda function
 */
export async function sendMessageHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const userId = extractUserId(event);
  if (!userId) {
    return createErrorResponse(401, 'User ID is required');
  }
  
  const messageData = parseBody(event);
  if (!messageData) {
    return createErrorResponse(400, 'Invalid message data');
  }
  
  try {
    const dbStorage = getDynamoStorage();
    
    // Check if users exist
    const sender = await dbStorage.getUser(userId);
    if (!sender) {
      return createErrorResponse(404, 'Sender not found');
    }
    
    const receiver = await dbStorage.getUser(messageData.receiverId);
    if (!receiver) {
      return createErrorResponse(404, 'Receiver not found');
    }
    
    // Check if they are contacts
    const contacts = await dbStorage.getContacts(userId);
    const isContact = contacts.some(contact => contact.id === messageData.receiverId);
    
    if (!isContact) {
      return createErrorResponse(403, 'You can only send messages to your contacts');
    }
    
    // Create message
    const message = await dbStorage.createMessage({
      ...messageData,
      senderId: userId
    });
    
    return createLambdaResponse(201, message);
  } catch (error) {
    console.error('Error in sendMessageHandler:', error);
    return createErrorResponse(500, 'Failed to send message');
  }
}

/**
 * Lambda handler for retrieving and marking messages as read
 * Can be deployed as a standalone AWS Lambda function
 */
export async function getMessagesHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const userId = extractUserId(event);
  if (!userId) {
    return createErrorResponse(401, 'User ID is required');
  }
  
  const contactId = event.pathParameters?.contactId;
  if (!contactId) {
    return createErrorResponse(400, 'Contact ID is required');
  }
  
  try {
    const dbStorage = getDynamoStorage();
    
    // Get messages between users
    const messages = await dbStorage.getMessagesByUsers(userId, contactId);
    
    // Mark received messages as read in a single batch operation when possible
    const messagesToUpdate = messages.filter(m => 
      m.receiverId === userId && m.status !== 'read'
    );
    
    // Update message status in parallel
    await Promise.all(
      messagesToUpdate.map(message => 
        dbStorage.updateMessageStatus(message.id, 'read')
      )
    );
    
    // Return all messages with updated status
    const updatedMessages = messages.map(message => {
      if (messagesToUpdate.some(m => m.id === message.id)) {
        return { ...message, status: 'read' };
      }
      return message;
    });
    
    return createLambdaResponse(200, updatedMessages);
  } catch (error) {
    console.error('Error in getMessagesHandler:', error);
    return createErrorResponse(500, 'Failed to get messages');
  }
}