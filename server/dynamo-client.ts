import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { log } from "./vite";

// Get AWS credentials from environment variables
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Create a DynamoDB client
export const ddbClient = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  }
});

// Create an enhanced document client (makes working with DynamoDB easier)
export const documentClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    // Whether to automatically convert empty strings, blobs, and sets to `null`
    convertEmptyValues: true,
    // Whether to remove undefined values
    removeUndefinedValues: true,
    // Whether to convert typeof object to map attribute
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    // Whether to return numbers as strings instead of converting them to native JavaScript numbers
    wrapNumbers: false,
  },
});

// Log AWS configuration for debugging
log(`AWS DynamoDB client initialized with region: ${region || "not set"}`);

// Define table names
export const TableNames = {
  USERS: "whatspe_users",
  MESSAGES: "whatspe_messages",
  CONTACT_REQUESTS: "whatspe_contact_requests",
  CONTACTS: "whatspe_contacts",
  VERIFICATION_CODES: "whatspe_verification_codes"
};

// Initialize and export DynamoDB utility
export const dynamoDB = {
  client: ddbClient,
  docClient: documentClient,
  tables: TableNames,
};