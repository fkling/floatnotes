//!#include "../header.js"
/*global Cc, Ci, Cu, when, LOG*/
"use strict";

EXPORTED_SYMBOLS = ['Platform'];

var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"]
  .getService(Ci.nsIVersionComparator);

var Platform = {
  isFF4: function() {
    var appInfo = Cc["@mozilla.org/xre/app-info;1"]
      .getService(Ci.nsIXULAppInfo);
    return versionChecker.compare(appInfo.version, "4.0alpha") >= 0;
  },
  getCurrentVersion: function() {
    var deferred = when.defer();
    var scope = {};
    Cu['import']("resource://gre/modules/AddonManager.jsm", scope);
    scope.AddonManager.getAddonByID(
      'floatnotes@felix-kling.de',
      function(addon) {
        LOG('Extension version: ' + addon.version);
        deferred.resolve(addon.version);
    });
    return deferred.promise;
  },
  versionLessThan: function(from, to) {
    return versionChecker.compare(from, to) < 0;
  },
  versionEquals: function(from, to) {
    return versionChecker.compare(from, to) === 0;
  }
};
