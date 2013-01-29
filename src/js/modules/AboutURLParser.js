"use strict";
//!#include "../header.js"
/*global Cu, Util*/
Cu['import']("resource://floatnotes/URLParser.js");
/*global FloatNotesURLParser*/

var EXPORTED_SYMBOLS = ['FloatNotesAboutURLParser'];

function AboutURLParser(){}
var FloatNotesAboutURLParser = AboutURLParser;

Util.Js.inherits(AboutURLParser, FloatNotesURLParser);

AboutURLParser.prototype.getPageUrl = function(location) {
  return location.toString();
};

AboutURLParser.prototype.supports = function(location) {
  return location.href === 'about:home';
};

AboutURLParser.prototype.getSearchUrls = function(location) {
  return [this.getPageUrl(location)];
};
