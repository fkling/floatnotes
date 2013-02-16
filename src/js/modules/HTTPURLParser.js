"use strict";
//!#include "../header.js"
/*global Cu, Utils*/
Cu['import']("resource://floatnotes/URLParser.js");
Cu['import']("resource://floatnotes/preferences.js");
/*global FloatNotesURLParser, FloatNotesPreferences*/

var EXPORTED_SYMBOLS = ['FloatNotesHTTPURLParser'];

function HTTPURLParser() {}
var FloatNotesHTTPURLParser = HTTPURLParser;

Util.Js.inherits(HTTPURLParser, FloatNotesURLParser);

HTTPURLParser.prototype.getPageUrl = function(location) {
  var pathname = location.pathname;
  var last_index = pathname.length - 1;
  if(pathname.charAt(last_index) === '/') {
    pathname = pathname.substring(0, last_index);
  }
  return location.host + pathname;
};

HTTPURLParser.prototype.getPageQueryUrl = function(location) {
  if(location.search) {
    return location.host + location.pathname + location.search;
  }
  return '';
};

HTTPURLParser.prototype.getPageAnchorUrl = function(location, force) {
  if(location.hash && (force || FloatNotesPreferences.updateOnHashChange)) {
    return location.host + location.pathname + location.hash;
  }
  return '';
};

HTTPURLParser.prototype.getPageQueryAnchorUrl = function(location, force) {
  if(
    location.hash &&
    location.search &&
    (force || FloatNotesPreferences.updateOnHashChange)
  ) {
    return location.host + location.pathname + location.search + location.hash;
  }
  return '';
};

HTTPURLParser.prototype.getSiteUrl = function(location) {
  return location.host + '*';
};

HTTPURLParser.prototype.getStartsWithUrls = function(location) {
  var urls = [];
  var parts = location.pathname.split('/');
  parts.shift();
  var path = location.host;
  if(parts[parts.length-1] === '') {
    parts.pop();
  }
  for (var i = 0, length = parts.length; i < length; ++i) {
    path += '/' + parts[i];
    urls.push(path + '*');
  }
  return urls;
};

HTTPURLParser.prototype.getSearchUrls = function(location) {
  LOG('FOO');
  var urls = this.getStartsWithUrls(location);
  urls.push(this.getAllSitesUrl(location));
  urls.push(this.getSiteUrl(location));
  var includePageUrl = !location.hash ||
    !FloatNotesPreferences.updateOnHashChange ||
    FloatNotesPreferences.includePageForHashURLs;

  if(includePageUrl) {
    urls.push(this.getPageUrl(location));
  }

  if(location.search && includePageUrl) {
    urls.push(this.getPageQueryUrl(location));
  }

  if(location.hash) {
    urls.push(this.getPageAnchorUrl(location, true));
    urls.push(this.getPageQueryAnchorUrl(location, true));
  }
  return urls;
};
