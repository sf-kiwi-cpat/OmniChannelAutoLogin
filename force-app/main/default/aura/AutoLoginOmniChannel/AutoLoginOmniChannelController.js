({
    doInit: function(component, event, helper) {
        console.log("AutoLoginOmniChannel component initialized");
        helper.initializeComponent(component);
    },
    
    handleOmniChannelStatusChanged: function(component, event, helper) {
        console.log("OmniChannel Status Changed event received in AutoLoginOmniChannel:", event.getParams());
        helper.handleStatusChange(component, event);
    }
})
