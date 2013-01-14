"use strict";
/*jshint browser:true, es5:true*/
//!#include "../header.js"
/*global Cu, Util, when*/
Cu['import']('resource://floatnotes/URLHandler.js');
/*global FloatNotesURLHandler*/

var EXPORTED_SYMBOLS = ['FloatNotesCompatibilityTester'];

// Tests whether the page is composed of frames. Frames mess everything up.
function has_no_frameset(document) {
  return !document.querySelector('frameset');
}

function is_domain_supported(document) {
  return FloatNotesURLHandler.supports(document.location);
}

var tests = [
  {
    func: is_domain_supported,
    msg: function(document) {
      // Don't provide a message if the URL is internal to Firfox (annoying).
      if (FloatNotesURLHandler.isInternal(document.location)) {
        return Util.Locale.get(
          'location.protocol_not_supported',
          [document.location.protocol]
        );
      }
    }
  },
  {
    func: has_no_frameset,
    msg: function() {
      return Util.Locale.get('location.frames_not_supported');
    }
  }
];

var FloatNotesCompatibilityTester = {
  isCompatibleWith: function(document) {
    var deferred = when.defer();
    var msg = null;

    for (var i = tests.length; i--; ) {
      if (!tests[i].func(document)) {
        msg = tests[i].msg(document);
        break;
      }
    }

    if (msg === null) {
      deferred.resolve();
    }
    else {
      deferred.reject(msg);
    }

    return deferred;
  }
};
