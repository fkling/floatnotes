Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
const Cc = Components.classes;
const Ci = Components.interfaces;
const ph = Ci.nsIProtocolHandler;


function FloatnotesAboutHandler() { }

FloatnotesAboutHandler.prototype = {
    scheme: 'floatnotes',
    defaultPort: -1,
    protocolFlags: ph.URI_NOAUTH |
      ph.URI_NORELATIVE |
      ph.URI_SAFE_TO_LOAD_IN_SECURE_CONTEXT |
      ph.URI_IS_LOCAL_RESOURCE,
    newChannel : function(aURI) {
        var path = "chrome://floatnotes_note/content/note.html";
        var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        var channel = ios.newChannel(path, null, null);
        channel.originalURI = aURI;
        channel.owner = null;
        return channel;
    },
    allowPort: function() {
        return false;
    },
    newURI: function(spec, charset, aBaseURI){
        var uri = Cc["@mozilla.org/network/simple-uri;1"].createInstance(Ci.nsIURI);
        uri.spec = spec;
        return uri;
    },

    classDescription: "FloatNotes URL",
    classID: Components.ID("{86BF9652-3D85-4007-955B-DD8A725F6764}"),
    contractID: "@mozilla.org/network/protocol;1?name=floatnotes",
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler, Ci.nsISupports])
}


if (XPCOMUtils.generateNSGetFactory) {
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([FloatnotesAboutHandler]);
} else {
    var NSGetModule = XPCOMUtils.generateNSGetModule([FloatnotesAboutHandler]);
}

