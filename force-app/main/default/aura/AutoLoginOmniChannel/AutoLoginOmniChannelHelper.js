({
    initializeComponent: function(component) {
        console.log("AutoLoginOmniChannel helper initialized");
        
        // Set initial state
        component.set("v.isProcessing", false);
        component.set("v.loginAttempts", 0);
        component.set("v.isLoggedIn", false);
        
        // Apply input parameters from App Manager if they exist
        this.applyInputParameters(component);
        
        // Check if component is enabled
        var isEnabled = component.get("v.inputIsEnabled");
        if (!isEnabled) {
            console.log("AutoLoginOmniChannel is disabled");
            return;
        }
        
        console.log("AutoLoginOmniChannel is ready to monitor status changes");
        
        // Attempt auto-login after a short delay to ensure component is fully loaded
        var self = this;
        var autoLoginDelay = component.get("v.inputAutoLoginDelay") || 2000;
        
        setTimeout(function() {
            self.attemptAutoLogin(component);
        }, autoLoginDelay);
    },
    
    applyInputParameters: function(component) {
        // Apply input parameters from App Manager configuration
        var inputStatusId = component.get("v.inputStatusId");
        var inputIsEnabled = component.get("v.inputIsEnabled");
        var inputShowSuccessToast = component.get("v.inputShowSuccessToast");
        var inputAutoLoginDelay = component.get("v.inputAutoLoginDelay");
        
        if (inputStatusId) {
            console.log("Using input statusId from App Manager:", inputStatusId);
        }
        
        if (inputIsEnabled !== undefined && inputIsEnabled !== null) {
            console.log("Using input isEnabled from App Manager:", inputIsEnabled);
        }
        
        if (inputShowSuccessToast !== undefined && inputShowSuccessToast !== null) {
            console.log("Using input showSuccessToast from App Manager:", inputShowSuccessToast);
        }
        
        if (inputAutoLoginDelay !== undefined && inputAutoLoginDelay !== null) {
            console.log("Using input autoLoginDelay from App Manager:", inputAutoLoginDelay);
        }
    },
    
    handleStatusChange: function(component, event, helper) {
        var self = this;
        if (!event || !event.getParams()) {
            console.log("No event received");
            return;
        }
        
        var eventParams = event.getParams();
        var newStatus = eventParams.statusName || eventParams.status || "Unknown";
        var channels = eventParams.channels || [];
        var isEnabled = component.get("v.inputIsEnabled");
        
        console.log("Status changed to:", newStatus);
        console.log("Channels:", channels);
        
        // Check if component is enabled
        if (!isEnabled) {
            console.log("AutoLoginOmniChannel is disabled, ignoring status change");
            return;
        }
        
        // Update login status based on channels
        var isLoggedIn = channels && channels.length > 0;
        component.set("v.isLoggedIn", isLoggedIn);
        
        // If user is not logged in and we haven't attempted login recently, try to login
        if (!isLoggedIn) {
            var lastLoginTime = component.get("v.lastLoginTime");
            var now = new Date();
            var timeSinceLastLogin = lastLoginTime ? (now - new Date(lastLoginTime)) : Infinity;
            
            // Only attempt login if it's been more than 30 seconds since last attempt
            if (timeSinceLastLogin > 30000) {
                console.log("User appears to be logged out, attempting auto-login");
                self.attemptAutoLogin(component);
            }
        } else {
            console.log("User is already logged in to Omni-Channel");
        }
    },
    
    attemptAutoLogin: function(component) {
        var self = this;
        var omniToolkit = component.find("omniToolkit");
        var notifLib = component.find("notifLib");
        
        if (!this.validateOmniToolkit(component, omniToolkit, notifLib)) {
            return;
        }
        
        component.set("v.isProcessing", true);
        component.set("v.lastLoginTime", new Date());
        
        var loginAttempts = component.get("v.loginAttempts") || 0;
        component.set("v.loginAttempts", loginAttempts + 1);
        
        console.log("Attempting auto-login to Omni-Channel (attempt " + (loginAttempts + 1) + ")...");
        
        // First check if user is already logged in
        this.checkLoginStatus(component)
            .then(function(isLoggedIn) {
                if (isLoggedIn) {
                    console.log("User is already logged in to Omni-Channel - no action needed");
                    component.set("v.isLoggedIn", true);
                    // Don't show toast for already logged in users to avoid confusion
                    return;
                }
                
                console.log("User is not logged in - attempting auto-login");
                // Attempt to login
                return self.performLogin(component);
            })
            .then(function(loginResult) {
                if (loginResult && loginResult.success) {
                    console.log("Successfully logged in to Omni-Channel");
                    component.set("v.isLoggedIn", true);
                    
                    var showSuccessToast = component.get("v.inputShowSuccessToast");
                    if (showSuccessToast) {
                        self.showToast(notifLib, "Auto-Login", "Successfully logged in to Omni-Channel", "success");
                    }
                } else if (loginResult) {
                    // Only show error if we actually attempted login (not if user was already logged in)
                    console.log("Login attempt failed:", loginResult.error || "Unknown error");
                    component.set("v.isLoggedIn", false);
                    self.showToast(notifLib, "Auto-Login", "Failed to log in to Omni-Channel: " + (loginResult.error || "Unknown error"), "warning");
                }
                // If loginResult is undefined/null, it means user was already logged in, so no action needed
            })
            .catch(function(error) {
                console.error("Error during auto-login process:", error);
                component.set("v.isLoggedIn", false);
                self.showToast(notifLib, "Auto-Login Error", "Error logging in to Omni-Channel: " + (error.message || "Unknown error"), "error");
            })
            .finally(function() {
                component.set("v.isProcessing", false);
            });
    },
    
    checkLoginStatus: function(component) {
        var omniToolkit = component.find("omniToolkit");
        var self = this;
        
        return new Promise(function(resolve, reject) {
            // First try getServicePresenceStatus to check if user is already logged in
            // This is more reliable for checking login status
            omniToolkit.getServicePresenceStatus()
                .then(function(result) {
                    console.log("getServicePresenceStatus result (checking login status):", result);
                    // If we can get presence status, user is logged in
                    // Check if the result indicates an active session
                    if (result && (result.isLoggedIn || result.statusId || result.statusName)) {
                        console.log("User is already logged in with status:", result.statusName || "Unknown");
                        resolve(true);
                    } else {
                        console.log("User is not logged in - no active presence status");
                        resolve(false);
                    }
                })
                .catch(function(error) {
                    console.log("getServicePresenceStatus failed, trying fallback method:", error);
                    // Fallback to getAgentWorks if getServicePresenceStatus fails
                    return self.checkLoginStatusFallback(omniToolkit);
                })
                .then(function(fallbackResult) {
                    if (fallbackResult !== undefined) {
                        resolve(fallbackResult);
                    }
                })
                .catch(function(error) {
                    console.log("All login status checks failed (user not logged in):", error);
                    // If all methods fail, assume user is not logged in
                    resolve(false);
                });
        });
    },
    
    checkLoginStatusFallback: function(omniToolkit) {
        return new Promise(function(resolve, reject) {
            // Fallback method using getAgentWorks
            omniToolkit.getAgentWorks()
                .then(function(result) {
                    console.log("getAgentWorks fallback result:", result);
                    // If we can get agent works, user is logged in
                    resolve(true);
                })
                .catch(function(error) {
                    console.log("getAgentWorks fallback failed:", error);
                    resolve(false);
                });
        });
    },
    
    performLogin: function(component) {
        var omniToolkit = component.find("omniToolkit");
        var statusId = component.get("v.inputStatusId") || "0N58c000000092H";
        
        return new Promise(function(resolve, reject) {
            // Use the Omni Toolkit API to set presence status to Available
            // This effectively logs the user into Omni-Channel
            console.log("Attempting to set status ID:", statusId);
            
            omniToolkit.setServicePresenceStatus({ statusId: statusId })
                .then(function(result) {
                    console.log("Omni-Channel status set successfully:", result);
                    resolve({ success: true, result: result });
                })
                .catch(function(error) {
                    console.error("Error setting Omni-Channel status:", error);
                    // Try to get available statuses and use the first available one
                    return omniToolkit.getServicePresenceStatuses();
                })
                .then(function(statuses) {
                    if (statuses && statuses.length > 0) {
                        // Use the first available status
                        var firstStatus = statuses[0];
                        console.log("Using first available status:", firstStatus);
                        return omniToolkit.setServicePresenceStatus({ statusId: firstStatus.id });
                    } else {
                        throw new Error("No available statuses found");
                    }
                })
                .then(function(result) {
                    console.log("Alternative status set successfully:", result);
                    resolve({ success: true, result: result });
                })
                .catch(function(error) {
                    console.error("All login attempts failed:", error);
                    resolve({ success: false, error: error.message || "Login failed" });
                });
        });
    },
    
    validateOmniToolkit: function(component, omniToolkit, notifLib) {
        if (!omniToolkit) {
            console.error("Omni Toolkit not found");
            this.showToast(notifLib, "Error", "Unable to access Omni Toolkit API", "error");
            return false;
        }
        return true;
    },
    
    showToast: function(notifLib, title, message, type) {
        if (notifLib) {
            notifLib.showToast({
                "title": title,
                "message": message,
                "variant": type
            });
        } else {
            // Fallback to console if notifications library is not available
            console.log(type.toUpperCase() + " - " + title + ": " + message);
        }
    }
})
