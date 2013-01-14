//!#include "../header.js"
"use strict";
Cu['import']('resource://floatnotes/URLHandler.js');
/*global FloatNotesURLHandler*/

var EXPORTED_SYMBOLS = ['FloatNotesLocationListBuilder'];

function LocationListBuilder(listElement) {
    this.document_ = listElement.ownerDocument;
    this.listElement_ = listElement;
}

var FloatNotesLocationListBuilder = LocationListBuilder;

LocationListBuilder.prototype.selectLocation = function(url) {
    var listItem = this.listElement_.querySelector('radio[value="' + url + '"]');
    if(listItem) {
        this.listElement_.selectedItem = listItem;
    }
};

LocationListBuilder.prototype.buildLocationList = function(location, noteUrl) {
    var item,
        group = this.listElement_,
        locale = Util.Locale;

    Util.Dom.removeChildren(group);

    var pageUrl = FloatNotesURLHandler.getPageUrl(location);
    item = this.addItem_(group, locale.get('location.page_url_label'), pageUrl, noteUrl);
    item.setAttribute('tooltiptext', pageUrl);

    var queryUrl = FloatNotesURLHandler.getPageQueryUrl(location);
    if (queryUrl) {
        var query = location.search;
        item = this.addItem_(group, locale.get('location.query_url_label'), queryUrl, noteUrl);
        item.style.marginLeft = '20px';
        item.setAttribute('tooltiptext', queryUrl);
    }

    var hashUrl = FloatNotesURLHandler.getPageAnchorUrl(location);
    if (hashUrl) {
        var hash = location.hash;
        item = this.addItem_(group, locale.get('location.hash_url_label'), hashUrl, noteUrl);
        item.style.marginLeft = '20px';
        item.setAttribute('tooltiptext', hashUrl);
    }

    var queryHashUrl = FloatNotesURLHandler.getPageQueryAnchorUrl(location);
    if (queryHashUrl) {
        var tooltip = location.search + location.hash;
        item = this.addItem_(group, locale.get('location.query_hash_url_label'), queryHashUrl, noteUrl);
        item.style.marginLeft = '20px';
        item.setAttribute('tooltiptext', queryHashUrl);
    }

    var siteUrl = FloatNotesURLHandler.getSiteUrl(location);
    item = this.addItem_(group, locale.get('location.site_url_label'), siteUrl, noteUrl);
    item.setAttribute('tooltiptext', siteUrl);

    this.addItem_(group, locale.get('location.all_sites_label'), FloatNotesURLHandler.getAllSitesUrl(location), noteUrl);

    var moreOptions = this.document_.createElement('label');
    var moreOptionsContainer = this.document_.createElement('vbox');
    moreOptionsContainer.style.paddingLeft = '20px';

    var urls = FloatNotesURLHandler.getStartsWithUrls(location);
    if (urls.length > 0) {
        moreOptions.setAttribute('value', locale.get('location.sites_starting_label'));
        moreOptions.setAttribute('class', 'floatnotes-location-label');
        group.appendChild(moreOptions);
        group.appendChild(moreOptionsContainer);


        for (var i = 0; i < urls.length; i++) {
            var url = urls[i];
            item = this.addItem_(group, this._shortenURL(url), url, noteUrl, moreOptionsContainer);
            item.setAttribute('tooltiptext', url);
        }
    }
};


LocationListBuilder.prototype.addItem_ = function(group, text, url, noteUrl, parent) {
    var item;
    if (parent) {
        item = this.document_.createElement('radio');
        item.setAttribute('label', text);
        item.setAttribute('value', url);
        parent.appendChild(item);
    }
    else {
        item = group.appendItem(text, url);
    }
    item.hidden = !url;
    if (noteUrl == url) {
        group.selectedItem = item;
    }
    return item;
};

LocationListBuilder.prototype._shortenURL = function(url) {
    var text = url.replace(/\*$/, '');
    if (url.length > 40) {
        var parts = text.split('/');
        text = parts[0] + '/';
        if (parts.length > 2) {
            text += '(...)/';
        }
        var lastStep = parts[parts.length - 1];
        if (lastStep.length > 20) {
            lastStep = lastStep.substr(0, 15) + '(...)' + ((lastStep.lastIndexOf('.') > -1) ? lastStep.substr(lastStep.lastIndexOf('.')) : '');
        }
        text += lastStep;
    }
    return text;
};
