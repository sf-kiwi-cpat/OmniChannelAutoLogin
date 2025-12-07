public with sharing class AutoLoginOmniChannelController {
    
    /**
     * Check if the current user has an active presence record in UserServicePresence
     * @return Boolean true if user has an active presence (IsCurrentState = true), false otherwise
     */
    @AuraEnabled(cacheable=false)
    public static Boolean checkActivePresence() {
        try {
            // Check CRUD permissions before SOQL query
            if (!Schema.sObjectType.UserServicePresence.isAccessible()) {
                System.debug('User does not have read access to UserServicePresence');
                return false;
            }
            
            // Check field-level permissions
            Map<String, Schema.SObjectField> fieldMap = Schema.sObjectType.UserServicePresence.fields.getMap();
            if (!fieldMap.get('Id').getDescribe().isAccessible() ||
                !fieldMap.get('UserId').getDescribe().isAccessible() ||
                !fieldMap.get('IsCurrentState').getDescribe().isAccessible()) {
                System.debug('User does not have read access to required fields on UserServicePresence');
                return false;
            }
            
            // Query UserServicePresence for the current user with IsCurrentState = true
            List<UserServicePresence> presenceRecords = [
                SELECT Id 
                FROM UserServicePresence 
                WHERE UserId = :UserInfo.getUserId() 
                AND IsCurrentState = true 
                LIMIT 1
            ];
            
            // Return true if an active presence record exists
            return !presenceRecords.isEmpty();
        } catch (Exception e) {
            // Log error and return false (fail open - allow auto-login if query fails)
            System.debug('Error checking active presence: ' + e.getMessage());
            return false;
        }
    }
    
    /**
     * Get the first ServicePresenceStatus with IsAway = true
     * @return String The ID of the first away status found, or null if none found
     */
    @AuraEnabled(cacheable=false)
    public static String getAwayStatusId() {
        try {
            // Check CRUD permissions before SOQL query
            if (!Schema.sObjectType.ServicePresenceStatus.isAccessible()) {
                System.debug('User does not have read access to ServicePresenceStatus');
                return null;
            }
            
            // Check field-level permissions
            Map<String, Schema.SObjectField> fieldMap = Schema.sObjectType.ServicePresenceStatus.fields.getMap();
            if (!fieldMap.get('Id').getDescribe().isAccessible() ||
                !fieldMap.get('IsAway').getDescribe().isAccessible()) {
                System.debug('User does not have read access to required fields on ServicePresenceStatus');
                return null;
            }
            
            // Query for the first ServicePresenceStatus with IsAway = true
            List<ServicePresenceStatus> awayStatuses = [
                SELECT Id 
                FROM ServicePresenceStatus 
                WHERE IsAway = true 
                LIMIT 1
            ];
            
            // Return the ID if found, otherwise null
            if (!awayStatuses.isEmpty()) {
                return awayStatuses[0].Id;
            }
            return null;
        } catch (Exception e) {
            // Log error and return null
            System.debug('Error getting away status: ' + e.getMessage());
            return null;
        }
    }
}

