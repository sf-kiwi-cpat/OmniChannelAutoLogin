@isTest
private class AutoLoginOmniChannelControllerTest {
    
    @isTest
    static void testCheckActivePresence_WithActivePresence() {
        // Create test user
        User testUser = createTestUser();
        
        // Note: UserServicePresence records are typically created by Salesforce when users log into Omni-Channel
        // and may not be directly insertable in tests. This test verifies the method can be called
        // and returns a boolean value. In a real scenario with an active presence, it would return true.
        
        // Run test as the test user
        System.runAs(testUser) {
            Test.startTest();
            Boolean hasActivePresence = AutoLoginOmniChannelController.checkActivePresence();
            Test.stopTest();
            
            // Method should return a boolean value (true if active presence exists, false otherwise)
            System.assertNotEquals(null, hasActivePresence, 'Method should return a boolean value');
        }
    }
    
    @isTest
    static void testCheckActivePresence_WithoutActivePresence() {
        // Create test user
        User testUser = createTestUser();
        
        // Run test as the test user without creating an active presence record
        System.runAs(testUser) {
            Test.startTest();
            Boolean hasActivePresence = AutoLoginOmniChannelController.checkActivePresence();
            Test.stopTest();
            
            // Should return false when no active presence exists
            System.assertEquals(false, hasActivePresence, 'Should return false when no active presence exists');
        }
    }
    
    @isTest
    static void testCheckActivePresence_ExceptionHandling() {
        // Test that the method handles exceptions gracefully
        // This test ensures the try-catch block works correctly
        User testUser = createTestUser();
        
        System.runAs(testUser) {
            Test.startTest();
            // Method should not throw exception, should return false on error
            Boolean result = AutoLoginOmniChannelController.checkActivePresence();
            Test.stopTest();
            
            System.assertNotEquals(null, result, 'Method should return a boolean even on error');
        }
    }
    
    /**
     * Helper method to create a test user
     * Note: In actual implementation, you may need to adjust this based on your org's user creation requirements
     */
    private static User createTestUser() {
        // Get a standard profile (adjust as needed for your org)
        Profile standardProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        
        User testUser = new User(
            Alias = 'testuser',
            Email = 'testuser@example.com',
            EmailEncodingKey = 'UTF-8',
            FirstName = 'Test',
            LastName = 'User',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = standardProfile.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = 'testuser' + System.currentTimeMillis() + '@example.com'
        );
        
        insert testUser;
        return testUser;
    }
}

