import { 
  CreateTableCommand, 
  DescribeTableCommand, 
  ResourceNotFoundException 
} from "@aws-sdk/client-dynamodb";
import { ddbClient, TableNames } from "./dynamo-client";
import { log } from "./vite";

// Create tables if they don't exist
export async function ensureTablesExist() {
  log('Checking and creating DynamoDB tables if needed');
  
  try {
    await createUsersTable();
    await createMessagesTable();
    await createContactRequestsTable();
    await createContactsTable();
    await createVerificationCodesTable();
    
    log('All DynamoDB tables checked/created successfully');
  } catch (error) {
    console.error('Error creating DynamoDB tables:', error);
  }
}

// Helper to check if a table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    await ddbClient.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return false;
    }
    throw error;
  }
}

// Create Users table
async function createUsersTable() {
  const tableName = TableNames.USERS;
  
  if (await tableExists(tableName)) {
    log(`Table ${tableName} already exists`);
    return;
  }
  
  log(`Creating table: ${tableName}`);
  
  const command = new CreateTableCommand({
    TableName: tableName,
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "phoneNumber", AttributeType: "S" },
      { AttributeName: "username", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "PhoneNumberIndex",
        KeySchema: [
          { AttributeName: "phoneNumber", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },
      {
        IndexName: "UsernameIndex",
        KeySchema: [
          { AttributeName: "username", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },
      {
        IndexName: "EmailIndex",
        KeySchema: [
          { AttributeName: "email", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });
  
  await ddbClient.send(command);
  log(`Table ${tableName} created successfully`);
}

// Create Messages table
async function createMessagesTable() {
  const tableName = TableNames.MESSAGES;
  
  if (await tableExists(tableName)) {
    log(`Table ${tableName} already exists`);
    return;
  }
  
  log(`Creating table: ${tableName}`);
  
  const command = new CreateTableCommand({
    TableName: tableName,
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "senderId", AttributeType: "S" },
      { AttributeName: "receiverId", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "SenderReceiverIndex",
        KeySchema: [
          { AttributeName: "senderId", KeyType: "HASH" },
          { AttributeName: "receiverId", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });
  
  await ddbClient.send(command);
  log(`Table ${tableName} created successfully`);
}

// Create Contact Requests table
async function createContactRequestsTable() {
  const tableName = TableNames.CONTACT_REQUESTS;
  
  if (await tableExists(tableName)) {
    log(`Table ${tableName} already exists`);
    return;
  }
  
  log(`Creating table: ${tableName}`);
  
  const command = new CreateTableCommand({
    TableName: tableName,
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "senderId", AttributeType: "S" },
      { AttributeName: "receiverId", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "SenderIdIndex",
        KeySchema: [
          { AttributeName: "senderId", KeyType: "HASH" },
          { AttributeName: "status", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },
      {
        IndexName: "ReceiverIdIndex",
        KeySchema: [
          { AttributeName: "receiverId", KeyType: "HASH" },
          { AttributeName: "status", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });
  
  await ddbClient.send(command);
  log(`Table ${tableName} created successfully`);
}

// Create Contacts table
async function createContactsTable() {
  const tableName = TableNames.CONTACTS;
  
  if (await tableExists(tableName)) {
    log(`Table ${tableName} already exists`);
    return;
  }
  
  log(`Creating table: ${tableName}`);
  
  const command = new CreateTableCommand({
    TableName: tableName,
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "contactId", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIdIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });
  
  await ddbClient.send(command);
  log(`Table ${tableName} created successfully`);
}

// Create Verification Codes table
async function createVerificationCodesTable() {
  const tableName = TableNames.VERIFICATION_CODES;
  
  if (await tableExists(tableName)) {
    log(`Table ${tableName} already exists`);
    return;
  }
  
  log(`Creating table: ${tableName}`);
  
  const command = new CreateTableCommand({
    TableName: tableName,
    KeySchema: [
      { AttributeName: "phoneNumber", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "phoneNumber", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });
  
  await ddbClient.send(command);
  log(`Table ${tableName} created successfully`);
}