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
        
        // Check if user has active presence - if so, skip auto-login
        var self = this;
        this.checkActivePresence(component)
            .then(function(hasActivePresence) {
                if (hasActivePresence) {
                    console.log("Active presence detected - skipping auto-login");
                    return;
                }
                
                console.log("AutoLoginOmniChannel is ready to monitor status changes");
                
                // Attempt auto-login after a short delay to ensure component is fully loaded
                var autoLoginDelay = component.get("v.inputAutoLoginDelay") || 2000;
                
                setTimeout(function() {
                    self.attemptAutoLogin(component);
                }, autoLoginDelay);
            })
            .catch(function(error) {
                console.error("Error checking active presence:", error);
                // On error, proceed with auto-login (fail open)
                console.log("AutoLoginOmniChannel is ready to monitor status changes");
                
                var autoLoginDelay = component.get("v.inputAutoLoginDelay") || 2000;
                
                setTimeout(function() {
                    self.attemptAutoLogin(component);
                }, autoLoginDelay);
            });
    },
    
    checkActivePresence: function(component) {
        // Check UserServicePresence table for active presence record
        var self = this;
        
        return new Promise(function(resolve, reject) {
            // Create action to call Apex controller method
            var action = component.get("c.checkActivePresence");
            
            action.setCallback(this, function(response) {
                var state = response.getState();
                
                if (state === "SUCCESS") {
                    var hasActivePresence = response.getReturnValue();
                    console.log("Active presence check result:", hasActivePresence);
                    resolve(hasActivePresence);
                } else if (state === "ERROR") {
                    var errors = response.getError();
                    console.error("Error checking active presence:", errors);
                    // Resolve with false on error (fail open - allow auto-login)
                    resolve(false);
                } else {
                    console.error("Unknown state when checking active presence:", state);
                    // Resolve with false on unknown state (fail open)
                    resolve(false);
                }
            });
            
            $A.enqueueAction(action);
        }.bind(this));
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
        if (!event || !event.getParams()) {
            console.log("No event received");
            return;
        }
        
        var eventParams = event.getParams();
        var newStatus = eventParams.statusName || eventParams.status || "Unknown";
        var channels = eventParams.channels || [];
        var statusId = eventParams.statusId;
        
        console.log("Status changed to:", newStatus);
        console.log("Channels:", channels);
        console.log("Status ID:", statusId);
        
        // If we're receiving a status change event, the user must already be logged in
        // Check status ID to determine login status (channels can be empty and still be logged in)
        var isLoggedIn = statusId !== null && statusId !== undefined && statusId !== '';
        component.set("v.isLoggedIn", isLoggedIn);
        
        console.log("User login status updated:", isLoggedIn ? "logged in" : "logged out");
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
            // Use getServicePresenceStatusId to check if user is already logged in
            // This is the reliable method for checking login status
            omniToolkit.getServicePresenceStatusId()
                .then(function(statusId) {
                    console.log("getServicePresenceStatusId result (checking login status):", statusId);
                    // If we can get a status ID, user is logged in
                    if (statusId) {
                        console.log("User is already logged in to Omni-Channel with status ID:", statusId);
                        resolve(true);
                    } else {
                        console.log("User is not logged in - no active status ID");
                        resolve(false);
                    }
                })
                .catch(function(error) {
                    console.log("getServicePresenceStatusId failed (user not logged in):", error);
                    // If getServicePresenceStatusId fails, assume user is not logged in
                    resolve(false);
                });
        });
    },
    
    
    getStatusId: function(component) {
        var self = this;
        var inputStatusId = component.get("v.inputStatusId");
        
        // If inputStatusId is set, use it
        if (inputStatusId) {
            return Promise.resolve(inputStatusId);
        }
        
        // Otherwise, lookup the first away status from the org
        return new Promise(function(resolve, reject) {
            var action = component.get("c.getAwayStatusId");
            
            action.setCallback(this, function(response) {
                var state = response.getState();
                
                if (state === "SUCCESS") {
                    var awayStatusId = response.getReturnValue();
                    if (awayStatusId) {
                        console.log("Using away status ID from org:", awayStatusId);
                        resolve(awayStatusId);
                    } else {
                        console.log("No away status found in org, using default");
                        resolve("0N58c000000092H"); // Fallback to default
                    }
                } else {
                    var errors = response.getError();
                    console.error("Error getting away status ID:", errors);
                    // Fallback to default on error
                    resolve("0N58c000000092H");
                }
            });
            
            $A.enqueueAction(action);
        }.bind(this));
    },
    
    performLogin: function(component) {
        var self = this;
        var omniToolkit = component.find("omniToolkit");
        
        // Get status ID (either from input or from away status lookup)
        return this.getStatusId(component)
            .then(function(statusId) {
                return new Promise(function(resolve, reject) {
                    // Use the Omni Toolkit API to set presence status
                    // This effectively logs the user into Omni-Channel
                    console.log("Attempting to set status ID:", statusId);
                    
                    omniToolkit.setServicePresenceStatus({ statusId: statusId })
                .then(function(result) {
                    console.log("Omni-Channel status set successfully:", result);
                    resolve({ success: true, result: result });
                })
                .catch(function(error) {
                    console.error("Error setting Omni-Channel status:", error);
                    // Try to get current status ID and use that
                    return omniToolkit.getServicePresenceStatusId();
                })
                .then(function(currentStatusId) {
                    if (currentStatusId) {
                        console.log("Using current status ID:", currentStatusId);
                        return omniToolkit.setServicePresenceStatus({ statusId: currentStatusId });
                    } else {
                        throw new Error("No current status ID found");
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
            })
            .catch(function(error) {
                console.error("Error getting status ID:", error);
                return Promise.resolve({ success: false, error: error.message || "Failed to get status ID" });
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
