/**
 * WebSocket Optimization Utilities
 * 
 * This file contains utilities for optimizing WebSocket performance
 * with a focus on minimizing payload size and improving real-time delivery.
 */

import { WebSocket } from 'ws';
import { Message } from '@shared/schema';
import { gzip, unzip } from 'node:zlib';
import { promisify } from 'node:util';

// Promisify zlib functions
const gzipAsync = promisify(gzip);
const unzipAsync = promisify(unzip);

// Message type shortcuts for reduced payload size
export enum MessageTypes {
  // Standard message types (verbose for API, short for WebSocket)
  NEW_MESSAGE = 'MSG',
  MESSAGES_READ = 'READ',
  CONTACT_REQUEST = 'REQ',
  CONTACT_REQUEST_ACCEPTED = 'REQ_ACC',
  TYPING = 'TYPING',
  CONNECTION = 'CONN',
  PING = 'PING',
  PONG = 'PONG'
}

/**
 * Compress message for WebSocket transmission
 * Uses shortened property names and optional GZIP compression for larger payloads
 */
export async function compressMessage(type: string, data: any, useCompression = false): Promise<string | Buffer> {
  // Use short type names for efficiency
  const shortType = (type in MessageTypes) ? MessageTypes[type as keyof typeof MessageTypes] : type;
  
  // Use shortened property names for the payload
  const payload = {
    t: shortType,
    d: minifyPayload(data)
  };
  
  const jsonString = JSON.stringify(payload);
  
  // For small payloads, just return the JSON string
  if (!useCompression || jsonString.length < 1024) {
    return jsonString;
  }
  
  // For larger payloads, use compression
  try {
    const compressed = await gzipAsync(Buffer.from(jsonString));
    return compressed;
  } catch (error) {
    console.error('Compression error:', error);
    return jsonString;
  }
}

/**
 * Send a message to a WebSocket client with optimized payload
 */
export async function sendOptimized(
  ws: WebSocket,
  type: string,
  data: any,
  compression = false
): Promise<boolean> {
  if (ws.readyState !== WebSocket.OPEN) {
    return false;
  }
  
  try {
    const payload = await compressMessage(type, data, compression);
    ws.send(payload);
    return true;
  } catch (error) {
    console.error('Error sending optimized message:', error);
    return false;
  }
}

/**
 * Send the same message to multiple WebSocket clients efficiently
 */
export async function broadcastOptimized(
  clients: WebSocket[],
  type: string,
  data: any,
  compression = false
): Promise<number> {
  if (!clients.length) return 0;
  
  // Generate the payload once
  const payload = await compressMessage(type, data, compression);
  
  // Send to all clients
  let successCount = 0;
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
        successCount++;
      } catch (error) {
        console.error('Error broadcasting to client:', error);
      }
    }
  }
  
  return successCount;
}

/**
 * Optimize message objects by shortening property names and removing unnecessary data
 */
function minifyPayload(data: any): any {
  if (!data) return data;
  
  // Handle specific types with custom optimizations
  if (isMessage(data)) {
    return minifyMessage(data);
  }
  
  // For arrays, process each item
  if (Array.isArray(data)) {
    return data.map(item => minifyPayload(item));
  }
  
  // For objects, recursively process each property
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Use shortened property names when possible
      const shortKey = getShortKey(key);
      result[shortKey] = minifyPayload(value);
    }
    return result;
  }
  
  // Return primitive values as-is
  return data;
}

/**
 * Check if an object is a Message
 */
function isMessage(obj: any): obj is Message {
  return (
    obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    'senderId' in obj &&
    'receiverId' in obj &&
    'content' in obj
  );
}

/**
 * Optimize a Message object with shorter property names
 */
function minifyMessage(message: Message): any {
  return {
    id: message.id,
    s: message.senderId,    // senderId -> s
    r: message.receiverId,  // receiverId -> r
    c: message.content,     // content -> c
    t: message.type,        // type -> t
    st: message.status,     // status -> st
    ts: message.createdAt   // Use createdAt instead of timestamp
  };
}

/**
 * Map verbose property names to shorter versions for WebSocket transmission
 */
function getShortKey(key: string): string {
  const keyMap: Record<string, string> = {
    'senderId': 's',
    'receiverId': 'r',
    'content': 'c',
    'status': 'st',
    'timestamp': 'ts',
    'username': 'u',
    'phoneNumber': 'p',
    'profilePicture': 'pp',
    'lastSeen': 'ls',
    'isTyping': 'it',
    'messageIds': 'mids',
    'readBy': 'rb'
  };
  
  return keyMap[key] || key;
}