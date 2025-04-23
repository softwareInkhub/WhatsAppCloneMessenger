import { ScanCommand } from "@aws-sdk/client-dynamodb";
import { dynamoDB, TableNames } from "./dynamo-client";
import { storage } from "./storage";
import { log } from "./vite";

// This is a utility script to verify DynamoDB integration
async function testDynamoDBIntegration() {
  log("Testing DynamoDB integration...");
  
  try {
    // 1. First, let's check if we can list items from each table
    await scanTable(TableNames.USERS, "Users");
    await scanTable(TableNames.MESSAGES, "Messages");
    await scanTable(TableNames.CONTACT_REQUESTS, "Contact Requests");
    await scanTable(TableNames.CONTACTS, "Contacts");
    await scanTable(TableNames.VERIFICATION_CODES, "Verification Codes");
    
    // 2. Let's create a test user with our storage interface
    const phoneNumber = "+1234567890";
    const testUser = {
      username: "test_user_" + Date.now(),
      email: `test${Date.now()}@example.com`,
      phoneNumber,
      status: "Test user for DynamoDB integration"
    };
    
    log(`Creating test user with phone: ${phoneNumber}`);
    const user = await storage.createUser(testUser);
    log(`Test user created with ID: ${user.id}`);
    
    // 3. Verify we can retrieve the user
    const retrievedUser = await storage.getUserByPhone(phoneNumber);
    if (retrievedUser) {
      log(`Successfully retrieved user by phone: ${JSON.stringify(retrievedUser)}`);
    } else {
      log("Failed to retrieve user by phone");
    }
    
    log("DynamoDB integration test completed successfully");
  } catch (error) {
    console.error("Error in DynamoDB integration test:", error);
  }
}

// Helper to scan a table and print item count
async function scanTable(tableName: string, displayName: string) {
  try {
    const command = new ScanCommand({
      TableName: tableName,
      Limit: 10, // Only get a few items for testing
    });
    
    const response = await dynamoDB.client.send(command);
    const itemCount = response.Items?.length || 0;
    
    log(`${displayName} table - Found ${itemCount} items`);
    
    if (itemCount > 0 && response.Items) {
      log(`Sample item: ${JSON.stringify(response.Items[0])}`);
    }
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      log(`${displayName} table does not exist`);
    } else {
      console.error(`Error scanning ${displayName} table:`, error);
    }
  }
}

// Run the test function if this file is executed directly
if (require.main === module) {
  testDynamoDBIntegration().then(() => {
    log("Test script completed");
  }).catch(err => {
    console.error("Error in test script:", err);
  });
}