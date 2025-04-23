# WhatsApp-like Communication Platform

A scalable, cloud-native messaging platform with real-time communication capabilities and distributed architecture. This platform aims to provide faster and more reliable messaging than WhatsApp with robust cloud infrastructure.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Features](#features)
5. [API Reference](#api-reference)
   - [Authentication APIs](#authentication-apis)
   - [User Management APIs](#user-management-apis)
   - [Contact Management APIs](#contact-management-apis)
   - [Messaging APIs](#messaging-apis)
   - [WebSocket APIs](#websocket-apis)
6. [Data Models](#data-models)
7. [Environment Setup](#environment-setup)
8. [Deployment](#deployment)
9. [Performance Optimizations](#performance-optimizations)
10. [Security Considerations](#security-considerations)

## Overview

This WhatsApp-like messaging platform is built with a focus on speed, reliability, and scalability. The application provides real-time messaging, contact management, and user authentication via OTP (One-Time Password) verification, with all data persisted in AWS DynamoDB for robust cloud storage.

The platform is designed with a modular architecture that allows components to be deployed as microservices or serverless functions on AWS Lambda, enabling independent scaling of critical components like message delivery and read receipts.

## Architecture

The system follows a hybrid client-server architecture with these main components:

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌───────────┐     ┌────────────┐      ┌─────────────────────────┐  │
│  │           │     │            │      │                         │  │
│  │  Express  │────▶│   Routes   │─────▶│  Storage Interface      │  │
│  │  Server   │     │            │      │  (Memory/DynamoDB)      │  │
│  │           │     │            │      │                         │  │
│  └─────┬─────┘     └────────────┘      └─────────────────────────┘  │
│        │                                                             │
│        │           ┌────────────┐                                    │
│        │           │            │                                    │
│        └──────────▶│ WebSocket  │─── Real-time Communication         │
│                    │ Server     │                                    │
│                    │            │                                    │
│                    └────────────┘                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Client Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌───────────┐     ┌────────────┐      ┌─────────────────────────┐  │
│  │           │     │            │      │                         │  │
│  │   React   │────▶│  Context   │─────▶│  React Query            │  │
│  │  Frontend │     │  Providers │      │  (Data Management)      │  │
│  │           │     │            │      │                         │  │
│  └─────┬─────┘     └────────────┘      └─────────────────────────┘  │
│        │                                                             │
│        │           ┌────────────┐      ┌─────────────────────────┐  │
│        │           │            │      │                         │  │
│        └──────────▶│ WebSocket  │─────▶│  Chat Context           │  │
│                    │ Client     │      │  (Real-time State)      │  │
│                    │            │      │                         │  │
│                    └────────────┘      └─────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Serverless Implementation

Key messaging functions are designed to be deployable as standalone AWS Lambda functions:
- Message sending handler
- Message retrieval and read status handler
- Contact request handling

## Technology Stack

### Backend
- **Node.js & TypeScript**: Core server runtime
- **Express.js**: REST API framework
- **AWS DynamoDB**: NoSQL database for persistent storage
- **WebSocket**: Real-time communication
- **AWS Lambda**: Serverless deployment capability

### Frontend
- **React**: UI framework
- **TypeScript**: Type safety
- **TanStack Query**: Data fetching and caching
- **wouter**: Lightweight routing
- **Tailwind CSS & shadcn/ui**: Styling
- **WebSocket API**: Real-time client-server communication

### Development & Tooling
- **Vite**: Build tool and development server
- **Drizzle ORM**: Database schema definition
- **Zod**: Schema validation
- **AWS SDK**: Cloud service integration

## Features

### Authentication
- Phone number based authentication
- OTP verification system
- Session management with persistent login

### User Management
- User profiles with username, status, and avatar
- Last seen status
- User search functionality
- Profile customization

### Contact Management
- Add contacts by phone number or username
- Contact request system with accept/reject functionality
- Bidirectional contact relationships
- Contact list with online status

### Messaging
- Real-time text messaging
- Support for media types (images, video, audio, documents)
- Read receipts with timestamps
- Typing indicators
- Message delivery status (sent, delivered, read)
- Offline message queueing

### Performance Optimizations
- WebSocket payload compression
- Message batching
- Optimized data structures for network transmission
- Persistent connections with keepalive
- Lambda-ready functions for serverless scalability

## API Reference

### Authentication APIs

#### Request OTP
```
POST /api/auth/request-otp
```
Request body:
```json
{
  "phoneNumber": "9890999999"
}
```
Response:
```json
{
  "message": "OTP sent successfully",
  "phoneNumber": "9890999999"
}
```

#### Verify OTP
```
POST /api/auth/verify-otp
```
Request body:
```json
{
  "phoneNumber": "9890999999",
  "verificationCode": "123456"
}
```
Response:
```json
{
  "message": "OTP verified successfully",
  "user": {
    "id": "39ee1646-945c-4849-a903-178b5b6b5114",
    "username": "test",
    "email": "test@example.com",
    "phoneNumber": "9890999999",
    "profilePicture": null,
    "status": "Hey, I'm using WhatsPe!",
    "lastSeen": "2025-04-23T06:43:46.073Z",
    "createdAt": "2025-04-23T06:43:46.073Z",
    "updatedAt": "2025-04-23T06:43:46.073Z",
    "verified": true
  },
  "isNewUser": false
}
```

#### Register New User
```
POST /api/auth/register
```
Request body:
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "phoneNumber": "9890999999",
  "status": "Hey, I'm new here!"
}
```
Response:
```json
{
  "id": "39ee1646-945c-4849-a903-178b5b6b5114",
  "username": "newuser",
  "email": "newuser@example.com",
  "phoneNumber": "9890999999",
  "profilePicture": null,
  "status": "Hey, I'm new here!",
  "lastSeen": "2025-04-23T06:43:46.073Z",
  "createdAt": "2025-04-23T06:43:46.073Z",
  "updatedAt": "2025-04-23T06:43:46.073Z",
  "verified": true
}
```

### User Management APIs

#### Search Users
```
GET /api/users/search?query=username
```
Response:
```json
[
  {
    "id": "e3822bd8-0868-4fca-ba55-36aa538cf386",
    "username": "username",
    "email": "user@example.com",
    "phoneNumber": "8002499033",
    "profilePicture": null,
    "status": "Hey, I'm using WhatsPe!",
    "lastSeen": "2025-04-23T06:30:50.130Z",
    "createdAt": "2025-04-23T06:30:50.130Z",
    "updatedAt": "2025-04-23T06:30:50.130Z",
    "verified": true
  }
]
```

#### Get Current User
```
GET /api/user
```
Response:
```json
{
  "id": "39ee1646-945c-4849-a903-178b5b6b5114",
  "username": "test",
  "email": "test@example.com",
  "phoneNumber": "9890999999",
  "profilePicture": null,
  "status": "Hey, I'm using WhatsPe!",
  "lastSeen": "2025-04-23T06:43:46.073Z",
  "createdAt": "2025-04-23T06:43:46.073Z",
  "updatedAt": "2025-04-23T06:43:46.073Z",
  "verified": true
}
```

### Contact Management APIs

#### Get Contacts
```
GET /api/contacts?userId=39ee1646-945c-4849-a903-178b5b6b5114
```
Response:
```json
[
  {
    "id": "e3822bd8-0868-4fca-ba55-36aa538cf386",
    "username": "baba",
    "email": "debugadmin@example.com",
    "phoneNumber": "8002499033",
    "profilePicture": null,
    "status": "Hey, I'm using WhatsPe!",
    "lastSeen": "2025-04-23T06:30:50.130Z",
    "createdAt": "2025-04-23T06:30:50.130Z",
    "updatedAt": "2025-04-23T06:30:50.130Z",
    "verified": true
  }
]
```

#### Send Contact Request
```
POST /api/contacts/request?userId=39ee1646-945c-4849-a903-178b5b6b5114
```
Request body:
```json
{
  "receiverId": "e3822bd8-0868-4fca-ba55-36aa538cf386"
}
```
Response:
```json
{
  "id": "d0cb1cc2-ac99-4f5b-a231-1d24aaa1bf77",
  "senderId": "39ee1646-945c-4849-a903-178b5b6b5114",
  "receiverId": "e3822bd8-0868-4fca-ba55-36aa538cf386",
  "status": "pending",
  "createdAt": "2025-04-23T06:38:46.073Z",
  "updatedAt": "2025-04-23T06:38:46.073Z"
}
```

#### Accept Contact Request
```
POST /api/contacts/accept/d0cb1cc2-ac99-4f5b-a231-1d24aaa1bf77?userId=e3822bd8-0868-4fca-ba55-36aa538cf386
```
Response:
```json
{
  "request": {
    "id": "d0cb1cc2-ac99-4f5b-a231-1d24aaa1bf77",
    "senderId": "39ee1646-945c-4849-a903-178b5b6b5114",
    "receiverId": "e3822bd8-0868-4fca-ba55-36aa538cf386",
    "status": "accepted",
    "createdAt": "2025-04-23T06:38:46.073Z",
    "updatedAt": "2025-04-23T06:40:12.457Z"
  },
  "contact": {
    "id": "39ee1646-945c-4849-a903-178b5b6b5114",
    "username": "test",
    "email": "test@example.com",
    "phoneNumber": "9890999999",
    "profilePicture": null,
    "status": "Hey, I'm using WhatsPe!",
    "lastSeen": "2025-04-23T06:43:46.073Z",
    "createdAt": "2025-04-23T06:43:46.073Z",
    "updatedAt": "2025-04-23T06:43:46.073Z"
  }
}
```

#### Reject Contact Request
```
POST /api/contacts/reject/d0cb1cc2-ac99-4f5b-a231-1d24aaa1bf77?userId=e3822bd8-0868-4fca-ba55-36aa538cf386
```
Response:
```json
{
  "id": "d0cb1cc2-ac99-4f5b-a231-1d24aaa1bf77",
  "senderId": "39ee1646-945c-4849-a903-178b5b6b5114",
  "receiverId": "e3822bd8-0868-4fca-ba55-36aa538cf386",
  "status": "rejected",
  "createdAt": "2025-04-23T06:38:46.073Z",
  "updatedAt": "2025-04-23T06:40:56.982Z"
}
```

#### Get Pending Contact Requests
```
GET /api/contacts/requests/pending?userId=e3822bd8-0868-4fca-ba55-36aa538cf386
```
Response:
```json
[
  {
    "id": "d0cb1cc2-ac99-4f5b-a231-1d24aaa1bf77",
    "senderId": "39ee1646-945c-4849-a903-178b5b6b5114",
    "receiverId": "e3822bd8-0868-4fca-ba55-36aa538cf386",
    "status": "pending",
    "createdAt": "2025-04-23T06:38:46.073Z",
    "updatedAt": "2025-04-23T06:38:46.073Z",
    "sender": {
      "id": "39ee1646-945c-4849-a903-178b5b6b5114",
      "username": "test",
      "email": "test@example.com",
      "phoneNumber": "9890999999",
      "profilePicture": null,
      "status": "Hey, I'm using WhatsPe!",
      "lastSeen": "2025-04-23T06:43:46.073Z",
      "createdAt": "2025-04-23T06:43:46.073Z",
      "updatedAt": "2025-04-23T06:43:46.073Z"
    }
  }
]
```

### Messaging APIs

#### Send Message
```
POST /api/messages?userId=39ee1646-945c-4849-a903-178b5b6b5114
```
Request body:
```json
{
  "receiverId": "e3822bd8-0868-4fca-ba55-36aa538cf386",
  "content": "Hello, how are you?",
  "type": "text",
  "status": "sent"
}
```
Response:
```json
{
  "id": "c6d448de-d7b6-418b-a799-54ce840fb392",
  "senderId": "39ee1646-945c-4849-a903-178b5b6b5114",
  "receiverId": "e3822bd8-0868-4fca-ba55-36aa538cf386",
  "content": "Hello, how are you?",
  "type": "text",
  "status": "sent",
  "createdAt": "2025-04-23T07:17:25.828Z",
  "updatedAt": "2025-04-23T07:17:25.828Z" 
}
```

#### Get Messages (also marks as read)
```
GET /api/messages/e3822bd8-0868-4fca-ba55-36aa538cf386?userId=39ee1646-945c-4849-a903-178b5b6b5114
```
Response:
```json
[
  {
    "id": "c6d448de-d7b6-418b-a799-54ce840fb392",
    "senderId": "39ee1646-945c-4849-a903-178b5b6b5114",
    "receiverId": "e3822bd8-0868-4fca-ba55-36aa538cf386",
    "content": "Hello, how are you?",
    "type": "text",
    "status": "read",
    "createdAt": "2025-04-23T07:17:25.828Z",
    "updatedAt": "2025-04-23T07:17:25.828Z"
  },
  {
    "id": "d7c11da0-7ac3-4cf1-941b-7ab8fd9d2e84",
    "senderId": "e3822bd8-0868-4fca-ba55-36aa538cf386",
    "receiverId": "39ee1646-945c-4849-a903-178b5b6b5114",
    "content": "I'm doing great, thanks!",
    "type": "text",
    "status": "read",
    "createdAt": "2025-04-23T07:18:05.123Z",
    "updatedAt": "2025-04-23T07:18:05.123Z"
  }
]
```

#### Webhook for External Message Integration
```
POST /api/webhooks/messages
```
Request body:
```json
{
  "id": "external-msg-123",
  "senderId": "system",
  "receiverId": "39ee1646-945c-4849-a903-178b5b6b5114",
  "content": "System notification: Server maintenance scheduled",
  "type": "text"
}
```
Response:
```json
{
  "success": true
}
```

### WebSocket APIs

The WebSocket server is accessible at `/ws` with a required `userId` parameter.

#### Connection
```
ws://domain.com/ws?userId=39ee1646-945c-4849-a903-178b5b6b5114
```

#### Message Types

The WebSocket API uses shortened message types for bandwidth efficiency:

| Full Type | Short Type | Description |
|-----------|------------|-------------|
| NEW_MESSAGE | MSG | New message delivery |
| MESSAGES_READ | READ | Message read receipt |
| CONTACT_REQUEST | REQ | New contact request |
| CONTACT_REQUEST_ACCEPTED | REQ_ACC | Contact request accepted |
| TYPING | TYPING | Typing indicator |
| CONNECTION | CONN | Connection confirmation |
| PING | PING | Connection keepalive |
| PONG | PONG | Keepalive response |

#### WebSocket Message Format
```json
{
  "t": "MSG",
  "d": {
    "id": "c6d448de-d7b6-418b-a799-54ce840fb392",
    "s": "39ee1646-945c-4849-a903-178b5b6b5114",
    "r": "e3822bd8-0868-4fca-ba55-36aa538cf386",
    "c": "Hello, how are you?",
    "t": "text",
    "st": "sent",
    "ts": "2025-04-23T07:17:25.828Z"
  }
}
```

Property abbreviations used for optimization:
- `t`: type
- `d`: data
- `s`: senderId
- `r`: receiverId
- `c`: content
- `st`: status
- `ts`: timestamp

## Data Models

### User
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  phoneNumber: string;
  profilePicture: string | null;
  status: string;
  lastSeen: Date | string;
  verified: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  verificationCode?: string | null;
}
```

### Message
```typescript
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  status: 'sent' | 'delivered' | 'read';
  createdAt: Date | string;
  updatedAt: Date | string;
}
```

### ContactRequest
```typescript
interface ContactRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date | string;
  updatedAt: Date | string;
}
```

### Contact
```typescript
interface Contact {
  id: string;
  userId: string;
  contactId: string;
  createdAt: Date | string;
}
```

### VerificationCode
```typescript
interface VerificationCode {
  phoneNumber: string;
  code: string;
  createdAt: string;
  expiresAt: string;
}
```

## Environment Setup

### Required Environment Variables

```
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1

# Session Configuration
SESSION_SECRET=your_session_secret

# API Configuration
API_HOST=0.0.0.0
API_PORT=5000

# Database Configuration
USE_DYNAMODB=true
```

### AWS DynamoDB Tables

- `whatspe_users`: User data storage
- `whatspe_messages`: Messages storage
- `whatspe_contact_requests`: Contact requests
- `whatspe_contacts`: Established contacts
- `whatspe_verification_codes`: OTP verification codes

## Deployment

### Standard Deployment
The application can be deployed as a standard Node.js application with Express serving both the backend API and frontend React application.

### Serverless Deployment
Key components are designed to be deployable as AWS Lambda functions:

#### Message Sending Lambda
```javascript
// AWS Lambda handler
export const handler = async (event, context) => {
  return await sendMessageHandler(event);
};
```

#### Message Retrieval Lambda
```javascript
// AWS Lambda handler
export const handler = async (event, context) => {
  return await getMessagesHandler(event);
};
```

## Performance Optimizations

### WebSocket Payload Optimization
- Property name shortening (e.g., `senderId` -> `s`)
- Message type abbreviation (e.g., `NEW_MESSAGE` -> `MSG`)
- Optional GZIP compression for large payloads (>1KB)

```javascript
// Example of property name optimization
function minifyMessage(message) {
  return {
    id: message.id,
    s: message.senderId,    // senderId -> s
    r: message.receiverId,  // receiverId -> r
    c: message.content,     // content -> c
    t: message.type,        // type -> t
    st: message.status,     // status -> st
    ts: message.createdAt   // timestamp -> ts
  };
}
```

### Connection Management
- Ping/pong keep-alive mechanism (30-second interval)
- Automatic reconnection with exponential backoff
- Connection state management and recovery

### Message Delivery Optimization
- Direct WebSocket messages for bypassing API latency
- Batch operations for status updates
- Instant delivery with fallback to API endpoints

## Security Considerations

### Authentication
- OTP-based verification
- Session management
- Token validation

### Data Protection
- UUID-based identifiers to prevent enumeration
- Validation of sender/receiver relationships
- Permission checks before message delivery

### Input Validation
- Comprehensive schema validation with Zod
- Request payload sanitization
- API endpoint protection with proper authentication checks

## Future Enhancements

### Scalability
- Deploy critical components as AWS Lambda functions
- Implement AWS API Gateway for API routing
- Set up AWS SQS for message queuing

### Features
- End-to-end encryption
- Message revocation
- Group chat functionality
- Voice and video calling
- Message reactions and replies

### Performance
- Implement Redis for session caching
- Add serverless WebSocket support with AWS API Gateway
- Optimize image and media handling with CDN integration