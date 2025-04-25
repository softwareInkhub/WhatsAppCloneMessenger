import { MemStorage } from './storage';
import { dynamoDB } from './dynamo-client';
import { log } from './vite';

// Initialize storage based on environment
export function initializeStorage() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // Check if AWS credentials are available
  if (region && accessKeyId && secretAccessKey) {
    log('Using DynamoDB storage implementation');
    return dynamoDB;
  } else {
    log('AWS credentials not found, using in-memory storage');
    return new MemStorage();
  }
}

// Export the storage instance
export const storage = initializeStorage(); 