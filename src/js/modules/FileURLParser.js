"use strict";
//!#include "../header.js"
/*global Cu, Utils*/
Cu['import']("resource://floatnotes/URLParser.js");
/*global FloatNotesURLParser*/

var EXPORTED_SYMBOLS = ['FloatNotesFileURLParser'];

function FileURLParser(){}
var FloatNotesFileURLParser = FileURLParser;

Util.Js.inherits(FileURLParser, FloatNotesURLParser);

FileURLParser.prototype.getPageUrl = function(location) {
  return location.toString();
};

FileURLParser.prototype.getStartsWithUrls = function(location) {
  var urls = [];
  var parts = location.pathname.split('/');
  parts.shift();
  var path = location.toString().replace(location.pathname, '');
  if(parts[parts.length-1] === '') {
    parts.pop();
  }
  for (var i = 0, length = parts.length; i < length; ++i) {
    path += '/' + parts[i];
    urls.push(path + '*');
  }
  return urls;
};

FileURLParser.prototype.getAllSitesUrl = function() {
  return '';
};

FileURLParser.prototype.getSearchUrls = function(location) {
  return this.getStartsWithUrls(location).concat([this.getPageUrl(location)]);
};
