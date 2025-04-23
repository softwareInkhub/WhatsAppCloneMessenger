import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertMessageSchema, 
  insertContactRequestSchema, 
  updateContactRequestSchema,
  otpRequestSchema,
  otpVerificationSchema
} from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server for WebSocket
  const httpServer = createServer(app);
  
  // Create WebSocket server for real-time messaging with explicit path
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws' 
  });
  
  console.log("WebSocket server initialized at path: /ws");
  
  // Store client connections
  const clients = new Map<string, any>();
  
  wss.on('connection', (ws, req) => {
    console.log("New WebSocket connection received");
    
    // Extract user ID from query parameters
    const url = new URL(`http://localhost${req.url}`);
    const userId = url.searchParams.get('userId');
    
    console.log("WebSocket connection:", { url: req.url, userId });
    
    if (userId) {
      clients.set(userId, ws);
      console.log(`User ${userId} connected to WebSocket`);
      
      // Send a welcome message to confirm connection
      ws.send(JSON.stringify({
        type: 'CONNECTION_ESTABLISHED',
        data: { userId, timestamp: new Date().toISOString() }
      }));
      
      // Handle client disconnect
      ws.on('close', () => {
        console.log(`User ${userId} disconnected from WebSocket`);
        clients.delete(userId);
      });
    } else {
      console.log("WebSocket connection rejected: no userId provided");
      ws.close(1008, "UserId required");
    }
  });
  
  // Helper function to send error responses
  const sendError = (res: Response, status: number, message: string) => {
    res.status(status).json({ error: message });
  };

  // API Routes
  const router = express.Router();
  
  // 1. OTP Authentication Routes
  router.post('/auth/request-otp', async (req: Request, res: Response) => {
    try {
      const data = otpRequestSchema.parse(req.body);
      
      // For development: Always use a fixed OTP code
      const otp = "123456";
      
      // Store OTP for verification
      await storage.storeVerificationCode(data.phoneNumber, otp);
      
      // In a real app, would send SMS, but for development:
      console.log(`OTP for ${data.phoneNumber}: ${otp} (FIXED FOR DEVELOPMENT)`);
      
      res.status(200).json({ message: 'OTP sent successfully', phoneNumber: data.phoneNumber });
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 400, 'Invalid phone number format');
      }
      sendError(res, 500, 'Failed to send OTP');
    }
  });
  
  router.post('/auth/verify-otp', async (req: Request, res: Response) => {
    try {
      const data = otpVerificationSchema.parse(req.body);
      
      // Log verification attempt
      console.log(`OTP verification attempt for phone: ${data.phoneNumber}, code length: ${data.verificationCode.length}`);
      
      // Validate OTP 
      let isValid = false;
      
      // In a real production app, we would use this:
      // isValid = await storage.verifyOTP(data.phoneNumber, data.verificationCode);
      
      // For development mode - use a fixed code or accept valid 6-digit codes
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        if (data.verificationCode === "123456") {
          isValid = true;
          console.log(`DEVELOPMENT MODE: Validated fixed OTP for ${data.phoneNumber}`);
        } else {
          // For ease of development, accept any 6-digit numeric code
          isValid = data.verificationCode.length === 6 && /^\d+$/.test(data.verificationCode);
          console.log(`DEVELOPMENT MODE: ${isValid ? "Accepted" : "Rejected"} OTP ${data.verificationCode} for ${data.phoneNumber}`);
        }
      } else {
        // In production mode, only accept valid codes
        isValid = await storage.verifyOTP(data.phoneNumber, data.verificationCode);
      }
      
      if (!isValid) {
        console.log(`OTP verification failed for phone: ${data.phoneNumber}`);
        return sendError(res, 401, 'Invalid verification code');
      }
      
      // Check if user exists with this phone
      const existingUser = await storage.getUserByPhone(data.phoneNumber);
      
      if (existingUser) {
        // User exists, return user data
        return res.status(200).json({ 
          message: 'OTP verified successfully',
          user: existingUser,
          isNewUser: false
        });
      } else {
        // New user, return success for registration
        return res.status(200).json({ 
          message: 'OTP verified successfully',
          isNewUser: true, 
          phoneNumber: data.phoneNumber
        });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 400, 'Invalid verification data');
      }
      sendError(res, 500, 'Failed to verify OTP');
    }
  });
  
  // 2. User Registration
  router.post('/auth/register', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Thorough check if user already exists
      // Check phone number first as it's the primary identifier
      const existingByPhone = await storage.getUserByPhone(userData.phoneNumber);
      if (existingByPhone) {
        console.log(`Registration attempt with already registered phone: ${userData.phoneNumber}`);
        return sendError(res, 409, 'This phone number is already registered. Please log in or use a different phone number.');
      }
      
      // Check the rest of the unique identifiers
      const existingByEmail = await storage.getUserByEmail(userData.email);
      if (existingByEmail) {
        console.log(`Registration attempt with already registered email: ${userData.email}`);
        return sendError(res, 409, 'Email address already registered. Please use a different email.');
      }
      
      const existingByUsername = await storage.getUserByUsername(userData.username);
      if (existingByUsername) {
        console.log(`Registration attempt with already taken username: ${userData.username}`);
        return sendError(res, 409, 'Username already taken. Please choose a different username.');
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Remove sensitive info
      const { verificationCode, ...userResponse } = user;
      
      res.status(201).json(userResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 400, 'Invalid user data');
      }
      sendError(res, 500, 'Failed to register user');
    }
  });
  
  // 3. User Search
  router.get('/users/search', async (req: Request, res: Response) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return sendError(res, 400, 'Search query is required');
      }
      
      if (query.length < 3) {
        return sendError(res, 400, 'Search query must be at least 3 characters');
      }
      
      const users = await storage.searchUsersByUsername(query);
      
      // Remove sensitive info
      const sanitizedUsers = users.map(({ verificationCode, ...user }) => user);
      
      res.status(200).json(sanitizedUsers);
    } catch (error) {
      sendError(res, 500, 'Failed to search users');
    }
  });
  
  // 4. Contact Requests
  router.post('/contacts/request', async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      
      console.log('Contact request body:', JSON.stringify(req.body));
      console.log('User ID:', userId);
      
      if (!userId || typeof userId !== 'string') {
        return sendError(res, 401, 'User ID is required');
      }
      
      // Manual validation to help debug issues
      if (!req.body || !req.body.receiverId) {
        return sendError(res, 400, 'Missing receiverId in request body');
      }
      
      if (typeof req.body.receiverId !== 'string') {
        return sendError(res, 400, 'receiverId must be a string');
      }
      
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(req.body.receiverId)) {
        return sendError(res, 400, 'receiverId must be a valid UUID');
      }
      
      // Parse the request data
      const requestData = insertContactRequestSchema.parse(req.body);
      
      // Check if users exist
      const sender = await storage.getUser(userId);
      if (!sender) {
        return sendError(res, 404, 'Sender not found');
      }
      
      const receiver = await storage.getUser(requestData.receiverId);
      if (!receiver) {
        return sendError(res, 404, 'Receiver not found');
      }
      
      // Check if request already exists
      const existingRequests = await storage.getContactRequestsByUser(userId);
      const duplicateRequest = existingRequests.find(
        r => (r.senderId === userId && r.receiverId === requestData.receiverId) ||
             (r.senderId === requestData.receiverId && r.receiverId === userId)
      );
      
      if (duplicateRequest) {
        return sendError(res, 409, 'Contact request already exists');
      }
      
      // Create request
      const request = await storage.createContactRequest({
        ...requestData,
        senderId: userId
      });
      
      // Notify receiver if online
      const receiverWs = clients.get(requestData.receiverId);
      if (receiverWs && receiverWs.readyState === 1) {
        receiverWs.send(JSON.stringify({
          type: 'CONTACT_REQUEST',
          data: {
            ...request,
            sender
          }
        }));
      }
      
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('Contact request validation error:', error.errors);
        return sendError(res, 400, `Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      console.error('Contact request error:', error);
      sendError(res, 500, 'Failed to create contact request');
    }
  });
  
  router.post('/contacts/accept/:requestId', async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return sendError(res, 401, 'User ID is required');
      }
      
      const request = await storage.getContactRequest(requestId);
      
      if (!request) {
        return sendError(res, 404, 'Contact request not found');
      }
      
      if (request.receiverId !== userId) {
        return sendError(res, 403, 'Only the request recipient can accept');
      }
      
      const updateData = updateContactRequestSchema.parse({ status: 'accepted' });
      
      // Update request status
      const updatedRequest = await storage.updateContactRequestStatus(requestId, updateData);
      
      // Create bidirectional contact relationship
      console.log(`Creating contact relationship between ${userId} and ${request.senderId}`);
      
      // Add sender to receiver's contacts
      const contactRelation1 = await storage.addContact(userId, request.senderId);
      
      // Add receiver to sender's contacts
      const contactRelation2 = await storage.addContact(request.senderId, userId);
      
      console.log(`Contact relationships created: ${JSON.stringify(contactRelation1)} and ${JSON.stringify(contactRelation2)}`);
      
      // Get the sender user for contact info
      const sender = await storage.getUser(request.senderId);
      if (!sender) {
        return sendError(res, 404, 'Sender not found');
      }
      
      // Get the receiver user for contact info
      const receiver = await storage.getUser(userId);
      if (!receiver) {
        return sendError(res, 404, 'Receiver not found');
      }
      
      // Notify sender if online
      const senderWs = clients.get(request.senderId);
      if (senderWs && senderWs.readyState === 1) {
        senderWs.send(JSON.stringify({
          type: 'CONTACT_REQUEST_ACCEPTED',
          data: {
            request: updatedRequest,
            contact: receiver  // Send the receiver's details as the new contact
          }
        }));
      }
      
      // Return everything the client needs
      res.status(200).json({
        request: updatedRequest,
        contact: sender  // Send the sender's details as the new contact
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 400, 'Invalid request data');
      }
      sendError(res, 500, 'Failed to accept contact request');
    }
  });
  
  router.post('/contacts/reject/:requestId', async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return sendError(res, 401, 'User ID is required');
      }
      
      const request = await storage.getContactRequest(requestId);
      
      if (!request) {
        return sendError(res, 404, 'Contact request not found');
      }
      
      if (request.receiverId !== userId) {
        return sendError(res, 403, 'Only the request recipient can reject');
      }
      
      const updateData = updateContactRequestSchema.parse({ status: 'rejected' });
      
      const updatedRequest = await storage.updateContactRequestStatus(requestId, updateData);
      
      res.status(200).json(updatedRequest);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 400, 'Invalid request data');
      }
      sendError(res, 500, 'Failed to reject contact request');
    }
  });
  
  // 5. Get contacts
  router.get('/contacts', async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return sendError(res, 401, 'User ID is required');
      }
      
      const contacts = await storage.getContacts(userId);
      
      // Remove sensitive info
      const sanitizedContacts = contacts.map(({ verificationCode, ...contact }) => contact);
      
      res.status(200).json(sanitizedContacts);
    } catch (error) {
      sendError(res, 500, 'Failed to get contacts');
    }
  });
  
  // 6. Get pending contact requests
  router.get('/contacts/requests/pending', async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return sendError(res, 401, 'User ID is required');
      }
      
      const requests = await storage.getContactRequestsByUser(userId, 'pending');
      
      // For received requests, include sender details
      const enhancedRequests = await Promise.all(
        requests.map(async (request) => {
          if (request.receiverId === userId) {
            const sender = await storage.getUser(request.senderId);
            if (sender) {
              const { verificationCode, ...senderData } = sender;
              return { ...request, sender: senderData };
            }
          }
          return request;
        })
      );
      
      res.status(200).json(enhancedRequests);
    } catch (error) {
      sendError(res, 500, 'Failed to get pending requests');
    }
  });
  
  // 7. Messages
  router.post('/messages', async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return sendError(res, 401, 'User ID is required');
      }
      
      const messageData = insertMessageSchema.parse(req.body);
      
      // Check if users exist
      const sender = await storage.getUser(userId);
      if (!sender) {
        return sendError(res, 404, 'Sender not found');
      }
      
      const receiver = await storage.getUser(messageData.receiverId);
      if (!receiver) {
        return sendError(res, 404, 'Receiver not found');
      }
      
      // Check if they are contacts
      const contacts = await storage.getContacts(userId);
      const isContact = contacts.some(contact => contact.id === messageData.receiverId);
      
      if (!isContact) {
        return sendError(res, 403, 'You can only send messages to your contacts');
      }
      
      // Create message
      const message = await storage.createMessage({
        ...messageData,
        senderId: userId
      });
      
      // Notify receiver if online
      const receiverWs = clients.get(messageData.receiverId);
      if (receiverWs && receiverWs.readyState === 1) {
        receiverWs.send(JSON.stringify({
          type: 'NEW_MESSAGE',
          data: message
        }));
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 400, 'Invalid message data');
      }
      sendError(res, 500, 'Failed to send message');
    }
  });
  
  router.get('/messages/:contactId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      const { contactId } = req.params;
      
      if (!userId || typeof userId !== 'string') {
        return sendError(res, 401, 'User ID is required');
      }
      
      // Get messages between users
      const messages = await storage.getMessagesByUsers(userId, contactId);
      
      // Mark received messages as read
      const updatedMessages = await Promise.all(
        messages.map(async (message) => {
          if (message.receiverId === userId && message.status !== 'read') {
            const updated = await storage.updateMessageStatus(message.id, 'read');
            return updated || message;
          }
          return message;
        })
      );
      
      // Notify sender about read status
      const messagesNeedingUpdate = messages.filter(m => m.receiverId === userId && m.status !== 'read');
      const senderIdsArray = messagesNeedingUpdate.map(m => m.senderId);
      
      // Create a unique list of sender IDs the old-fashioned way to avoid Set iteration issues
      const uniqueSenderIds: string[] = [];
      senderIdsArray.forEach(id => {
        if (!uniqueSenderIds.includes(id)) {
          uniqueSenderIds.push(id);
        }
      });
      
      uniqueSenderIds.forEach(senderId => {
        const senderWs = clients.get(senderId);
        if (senderWs && senderWs.readyState === 1) {
          senderWs.send(JSON.stringify({
            type: 'MESSAGES_READ',
            data: {
              readBy: userId,
              messages: messages
                .filter(m => m.senderId === senderId && m.receiverId === userId)
                .map(m => m.id)
            }
          }));
        }
      });
      
      res.status(200).json(updatedMessages);
    } catch (error) {
      sendError(res, 500, 'Failed to get messages');
    }
  });
  
  // 8. WebSocket webhook for message events (used by external integrations)
  router.post('/webhooks/messages', (req: Request, res: Response) => {
    try {
      const message = req.body;
      
      // Validate message format
      if (!message.id || !message.senderId || !message.receiverId || !message.content) {
        return sendError(res, 400, 'Invalid message format');
      }
      
      // Forward to receiver's websocket connection
      const receiverWs = clients.get(message.receiverId);
      if (receiverWs && receiverWs.readyState === 1) {
        receiverWs.send(JSON.stringify({
          type: 'WEBHOOK_MESSAGE',
          data: message
        }));
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      sendError(res, 500, 'Failed to process webhook');
    }
  });
  
  // Register API routes
  app.use('/api', router);
  
  return httpServer;
}
