var Cc = Components.classes;
var Ci = Components.interfaces;

EXPORTED_SYMBOLS = ['Platform'];

var Platform = {
    isFF4: function() {
        var appInfo = Cc["@mozilla.org/xre/app-info;1"] .getService(Ci.nsIXULAppInfo),
            versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
        return versionChecker.compare(appInfo.version, "4.0alpha") >= 0;
    }
};
