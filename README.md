# OmniChannel Auto-Login Component

This Salesforce DX project contains an Aura component that automatically logs users into Omni-Channel and monitors for logout events to re-login users automatically.

## Component Overview

The `AutoLoginOmniChannel` component is a background utility that:

- **Automatically logs users into Omni-Channel** when the component initializes
- **Provides configurable settings** through App Manager for easy customization
- **Runs in the background** without any visible UI, ensuring seamless operation

### Key Features

- **Configurable Status ID**: Set which presence status to use for auto-login (recommended: Busy status)
- **Enable/Disable Toggle**: Turn auto-login on or off through App Manager
- **Success Notifications**: Optional toast messages when login succeeds
- **Login Delay**: Configurable delay before attempting auto-login
- **Smart Detection**: Prevents duplicate login attempts and handles edge cases

## Prerequisites

Before deploying this component, ensure you have:

1. **Omni-Channel enabled** in your Salesforce org
2. **Service Cloud license** with Omni-Channel access
3. **Appropriate permissions** to deploy Aura components
4. **Admin access** to configure utility items in App Manager

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

### Step 1: Deploy the Component

Deploy the component to your Salesforce org - either manually create the component in the Developer console and copy and paste the code, or you can download and deploy with your favorite IDE, however you usually deploy Aura components:

```bash
# Deploy to your org
sf project deploy start --target-org your-org-alias

# Or if using legacy sfdx commands
sfdx force:source:deploy --targetusername your-org-alias
```


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

3. **Wrong presence status being used**:
   - Double-check the status ID using the SOQL query
   - Ensure the status is active (`IsActive = true`)
   - Try using a different status ID

### Debugging

Enable browser console logging to see detailed information:
1. **Open browser developer tools**
2. **Go to Console tab**
3. **Look for messages** starting with "AutoLoginOmniChannel"
4. **Check for any error messages** in red

## Recommended Settings

For optimal performance, we recommend:

- **Status ID**: Use a "Busy" status (not an "Online")
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
