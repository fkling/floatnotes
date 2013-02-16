"use strict";
//!#include "../header.js"
/*global Cu*/

Cu['import']("resource://floatnotes/preferences.js");
/*global FloatNotesPreferences*/

var EXPORTED_SYMBOLS = ['FloatNotesURLParser']; 

function URLParser() {}

var FloatNotesURLParser = URLParser;

URLParser.PAGE_URL = -2,
URLParser.PAGE_QUERY_URL = -1,
URLParser.PAGE_ANCHOR_URL = -5,
URLParser.PAGE_QUERY_ANCHOR_URL = -4,
URLParser.PAGE_WILDCARD_URL = -3,
URLParser.SITE_URL = 0,

URLParser.prototype.getProtocol = function(location) {
    return location.protocol ? location.protocol : '';
};

URLParser.prototype.getAllSitesUrl = function(location) {
    return '*';
};

URLParser.prototype.getPageUrl = function(location) {
    return '';
};

URLParser.prototype.getPageQueryUrl = function(location) {
    return '';
};

URLParser.prototype.getPageAnchorUrl = function(location) {
    return '';
};

URLParser.prototype.getPageQueryAnchorUrl = function(location) {
    return '';
};

URLParser.prototype.getSiteUrl = function(location) {
    return '';
};

URLParser.prototype.getStartsWithUrls = function(location) {
    return [];
};

URLParser.prototype.getDefaultUrl = function(location) {
    var def = FloatNotesPreferences.location;
    var url = '';
    switch(def) {
       case  URLParser.PAGE_QUERY_ANCHOR_URL:
           url = this.getPageQueryAnchorUrl(location);
            if(url) {
                break;
            }
       case  URLParser.PAGE_ANCHOR_URL:
           url = this.getPageAnchorUrl(location);
            if(url) {
                break;
            }
       case URLParser.PAGE_QUERY_URL:
           url = this.getPageQueryUrl(location);
            if(url) {
                break; 
            }
       case URLParser.PAGE_URL:
           url = this.getPageUrl(location);
            break;
       case URLParser.PAGE_WILDCARD_URL:
           var urls = this.getStartsWithUrls(location);
            url = urls[urls.length - 1];
            break;
       case URLParser.SITE_URL:
            url = this.getSiteUrl(location);
            break;
       default:
           url = this.getPageUrl(location);
    }
    if(!url) {
       url = this.getPageUrl(location);
    }
    return url;
};

URLParser.prototype.getSearchUrls = function(location) {
    return [];
};

URLParser.prototype.supports = function(location) {
    return true;
};
