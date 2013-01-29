"use strict";
//!#include "../header.js"
/*global Cu*/

var EXPORTED_SYMBOLS = ['FloatNotesURLHandler'];

Cu['import']("resource://floatnotes/URLParser.js");
Cu['import']("resource://floatnotes/HTTPURLParser.js");
Cu['import']("resource://floatnotes/FileURLParser.js");
Cu['import']("resource://floatnotes/AboutURLParser.js");
/*global FloatNotesURLParser, FloatNotesHTTPURLParser, FloatNotesFileURLParser,
  FloatNotesAboutURLParser */

var internal_protocols = {
  'about:': true,
  'chrome:': true,
  'resource:': true
};


var FloatNotesURLHandler = {
  _parsers: {},

  _isProtocolSupported: function(location) {
    return (typeof this._parsers[location.protocol] !== 'undefined');
  },

  register: function(protocol, parser) {
    if (protocol instanceof Array) {
      for(var i = protocol.length;i--;) {
        this._parsers[protocol[i]] = parser;
      }
    }
    else {
      this._parsers[protocol] = parser;
    }
  },

  supports: function(location) {
    return (location.protocol in this._parsers) ?
      this._parsers[location.protocol].supports(location) :
      false;
  },

  getNoteUrl: function(note) {
    var url = note.url;
    var i = url.indexOf(':');
    if (i >= 0 && url.substring(0, i+1) in this._parsers) {
      return url;
    }
    else {
      return note.protocol + '//' + url;
    }
  },

  isInternal: function(location) {
    return (location.protocol in internal_protocols);
  }
};

for(var method in FloatNotesURLParser.prototype) {
  if (
    FloatNotesURLParser.prototype.hasOwnProperty(method) &&
    method !== 'constructor'
  ) {
    FloatNotesURLHandler[method] = (function(method) {
      return function(location) {
        if (this._isProtocolSupported(location)) {
          var parser =  this._parsers[location.protocol];
          return parser[method].call(parser, location);
        }
        return false;
      };
    }(method));
  }
}


/* For Firefox 4 */
/*
*/

FloatNotesURLHandler.register(
  ['http:', 'https:'],
  new FloatNotesHTTPURLParser()
);
FloatNotesURLHandler.register('file:', new FloatNotesFileURLParser());
FloatNotesURLHandler.register('about:', new FloatNotesAboutURLParser());
