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
        
        // Check if this is a page refresh or new window
        if (this.isPageRefresh()) {
            console.log("Page refresh detected - skipping auto-login");
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
    
    isPageRefresh: function() {
        // Check if this is a page refresh by looking for the performance navigation type
        if (typeof performance !== 'undefined' && performance.navigation) {
            // For older browsers
            return performance.navigation.type === 1; // TYPE_RELOAD
        } else if (typeof performance !== 'undefined' && performance.getEntriesByType) {
            // For newer browsers
            var navigationEntries = performance.getEntriesByType('navigation');
            if (navigationEntries.length > 0) {
                return navigationEntries[0].type === 'reload';
            }
        }
        
        // Fallback: check session storage for a fresh load marker
        var freshLoadMarker = sessionStorage.getItem('omniAutoLoginFreshLoad');
        if (freshLoadMarker) {
            // Marker exists, this is a refresh - don't clear it
            return true;
        }
        
        // No marker exists, this is a fresh load - set the marker
        sessionStorage.setItem('omniAutoLoginFreshLoad', 'true');
        return false;
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
