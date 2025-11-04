# OmniChannel Auto-Login Component

This Salesforce DX project contains an Aura component that automatically logs users into Omni-Channel and monitors for logout events to re-login users automatically.

## Component Overview

The `AutoLoginOmniChannel` component is a background utility that:

- **Automatically logs users into Omni-Channel** when the component initializes (if no active presence exists)
- **Checks for active presence** using Apex controller to query UserServicePresence table
- **Provides configurable settings** through App Manager for easy customization
- **Runs in the background** without any visible UI, ensuring seamless operation
- **Monitors status changes** to update component state

### Key Features

- **Smart Presence Detection**: Uses Apex class to check UserServicePresence table for active records (IsCurrentState = true)
- **Prevents Duplicate Logins**: Skips auto-login if user already has an active presence record
- **Configurable Status ID**: Set which presence status to use for auto-login (recommended: Busy status)
- **Enable/Disable Toggle**: Turn auto-login on or off through App Manager
- **Success Notifications**: Optional toast messages when login succeeds
- **Login Delay**: Configurable delay before attempting auto-login

## How It Works

The component uses an Apex controller (`AutoLoginOmniChannelController`) to check if the current user has an active presence record in the `UserServicePresence` table:

1. **On Component Initialization**:
   - Component checks if it's enabled via `inputIsEnabled` parameter
   - Calls Apex method `checkActivePresence()` to query UserServicePresence for records where `UserId = current user` and `IsCurrentState = true`
   - If an active presence record exists, auto-login is skipped
   - If no active presence exists, waits for the configured delay, then attempts auto-login
   - Ensures refresh and new windows are supported, without overriding the previous Omni-Channel state.

2. **On Status Change Events**:
   - Listens to `lightning:omniChannelStatusChanged` events
   - Updates component state based on the status ID from the event
   - Does not attempt auto-login (if status change event fires, user is already logged in)

3. **Apex Security**:
   - The Apex controller includes CRUD permission checks before querying UserServicePresence
   - Verifies object-level and field-level access permissions
   - Fails gracefully (allows auto-login) if permissions are insufficient

## Prerequisites

Before deploying this component, ensure you have:

1. **Omni-Channel enabled** in your Salesforce org
2. **Service Cloud license** with Omni-Channel access
3. **Appropriate permissions** to deploy Aura components and Apex classes
4. **Admin access** to configure utility items in App Manager
5. **Read access** to UserServicePresence object for the component users

## Getting the Presence Status ID

To configure the component with the correct presence status, you need to find the ID of the status you want to use for auto-login:

### Method 1: Using Setup (Easiest - Recommended)

1. **Navigate to Setup** in your Salesforce org
2. **Go to Service Presence Statuses** (Search for "Service Presence Status" in Quick Find)
3. **Click on the status** you want to use for auto-login (e.g., "Busy", "Available")
4. **Look at the URL bar** - the ID will be the 15-character ID starting with "0N5"
5. **Copy the ID** from the URL

### Method 2: Using Developer Console

1. **Open Developer Console** in your Salesforce org
2. **Go to Query Editor** tab
3. **Run this SOQL query**:
   ```sql
   SELECT Id, DeveloperName, MasterLabel 
   FROM ServicePresenceStatus 
   ORDER BY MasterLabel
   ```
4. **Find your desired status** (e.g., "Busy", "Available", "Away")
5. **Copy the Id value** (15-character ID starting with "0N5")

### Method 3: Using Workbench

1. **Go to Workbench** (workbench.developerforce.com)
2. **Login to your org**
3. **Go to Utilities → Query**
4. **Run the same SOQL query** as above
5. **Copy the Id** of your desired status

## Deployment Instructions

### Step 1: Deploy the Component and Apex Classes

Deploy both the Aura component and the Apex classes to your Salesforce org:

```bash
# Deploy to your org
sf project deploy start --target-org your-org-alias

# Or if using legacy sfdx commands
sfdx force:source:deploy --targetusername your-org-alias
```

**Important**: The component requires the `AutoLoginOmniChannelController` Apex class to function. Both the component and Apex class must be deployed together.


### Step 2: Add as Utility Item in App Manager

1. **Navigate to Setup** in your Salesforce org
2. **Go to App Manager** (Apps → App Manager)
3. **Find your target app** (e.g., Service Console, Lightning Experience)
4. **Click the dropdown arrow** next to the app name
5. **Select "Edit"**
6. **Go to the "Utility Items" tab**
7. **Click "Add Utility Item"**
   - **Name**: `Auto Login OmniChannel` (or your preferred name)
8. **Configure the component parameters**:
   - **inputStatusId**: Paste the presence status ID you found earlier
   - **inputIsEnabled**: `true` (to enable auto-login)
   - **inputShowSuccessToast**: `true` (to show success messages)
   - **inputAutoLoginDelay**: `2000` (2 second delay before login attempt)
9. **Click "Save"**

### Step 3: Grant Access to Apex Controller Class

Users must have access to the `AutoLoginOmniChannelController` Apex class for the component to function. Grant access via a Permission Set:

1. **Navigate to Setup** in your Salesforce org
2. **Go to Permission Sets** (Search for "Permission Sets" in Quick Find)
3. **Create a new Permission Set** (or edit an existing one):
   - Click **New** or select an existing permission set
   - Enter a **Label** (e.g., "OmniChannel Auto-Login Access")
   - Click **Save**
4. **Assign Apex Class Access**:
   - In the permission set, click **Apex Class Access** in the left sidebar
   - Click **Edit**
   - Find `AutoLoginOmniChannelController` in the Available Apex Classes list
   - Move it to the Enabled Apex Classes list
   - Click **Save**
5. **Assign the Permission Set to Users**:
   - In the permission set, click **Manage Assignments** in the left sidebar
   - Click **Add Assignments**
   - Select the users who need access to the auto-login component
   - Click **Assign**

**Note**: Users must have access to the Apex class to call the `checkActivePresence()` method. Without this permission, the component will fail to check for active presence records.

## Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `inputStatusId` | String | `0N58c000000092H` | The ID of the presence status to use for auto-login |
| `inputIsEnabled` | Boolean | `true` | Whether auto-login is enabled |
| `inputShowSuccessToast` | Boolean | `true` | Whether to show success toast messages |
| `inputAutoLoginDelay` | Integer | `2000` | Delay in milliseconds before attempting auto-login |

## Troubleshooting

### Common Issues

1. **Component not appearing in utility items list**:
   - Ensure the component is deployed successfully
   - Check that you have the correct permissions
   - Verify the component implements `lightning:backgroundUtilityItem`

2. **Auto-login not working**:
   - Verify the presence status ID is correct
   - Check that the user has Omni-Channel permissions
   - Ensure the component is enabled (`inputIsEnabled = true`)
   - Check browser console for error messages
   - Verify the Apex class is deployed and accessible
   - Verify the user has access to the 'AutoLoginOmniChannelController Apex class
   - Check that user has read access to UserServicePresence object

3. **Wrong presence status being used**:
   - Double-check the status ID set in App Builder
   - Try using a different status ID

4. **Auto-login skipped even when user should be logged in**:
   - **Check for hanging UserServicePresence records**: This is a common issue where stale presence records exist with `IsCurrentState = true`
   - Run this query in Developer Console or Workbench to check for hanging records:
     ```sql
     SELECT Id, UserId, IsCurrentState, ServicePresenceStatusId, CreatedDate
     FROM UserServicePresence
     WHERE UserId = '<User ID>'
     AND IsCurrentState = true
     ```
   - If records exist with `IsCurrentState = true`, then that user may need to login to Omni manually next time they login. 
   - Hanging records can prevent auto-login because the component detects an "active" presence even when the user is actually logged out

### Debugging

Enable browser console logging to see detailed information:
1. **Open browser developer tools**
2. **Go to Console tab**
3. **Look for messages** starting with "AutoLoginOmniChannel"
4. **Check for any error messages** in red

## Recommended Settings

For optimal performance, we recommend:

- **Status ID**: Use a "Busy" status (not an "Online" one)
- **Auto-login delay**: 2000ms (2 seconds) to ensure component is fully loaded
- **Success toast**: Enable for user feedback
- **Enable status**: Set to `true` for active users

## Support

For issues or questions:
- Check the browser console for error messages
- Verify all configuration parameters are correct
- Ensure proper Omni-Channel setup in your org
- Review Salesforce documentation for Omni-Channel configuration

## Additional Resources

- [Salesforce Extensions Documentation](https://developer.salesforce.com/tools/vscode/)
- [Salesforce CLI Setup Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm)
- [Salesforce DX Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_intro.htm)
- [Omni-Channel Setup Guide](https://help.salesforce.com/s/articleView?id=sf.omni_channel_setup.htm)
