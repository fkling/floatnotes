//!#ifndef __INCLUDE_MANAGER_
//!#define __INCLUDE_MANAGER_

//!#include "util.js"
//!#include "indicator.js"
//!#include "note.js"

Components.utils.import("resource://floatnotes/URLHandler.jsm");


var locationBuilder = {
    get locationListElement() {
        if(!this._ele) {
            this._ele =  document.getElementById('floatnotes-edit-location-list');
        }
        return this._ele;
    },

    updateSelectedElement: function(noteUrl) {
        var item = this.locationListElement.querySelector("radio[value='" + noteUrl + "']");LOG('Selection updated');
        if(item) {
            this.locationListElement.selectedItem = item;
        }
    },

    buildLocationList: function(location, noteUrl) {
        var item;
        var group = this.locationListElement;
        util.removeChildren(group);
        
        this._addItem(group, 'This page',  URLHandler.getPageUrl(location), noteUrl);
        var queryUrl = URLHandler.getPageQueryUrl(location);
        if(queryUrl) {
            var query = location.search;
            item = this._addItem(group, '...including query (?)',  queryUrl, noteUrl);
            item.style.marginLeft="20px";
            item.setAttribute('tooltiptext', query);
        }
        var hashUrl =  URLHandler.getPageAnchorUrl(location);
        if(hashUrl) {
            var hash = location.hash;
            item = this._addItem(group, '...including anchor (#)', hashUrl, noteUrl);
            item.style.marginLeft="20px";
            item.setAttribute('tooltiptext', hash);
        }
        this._addItem(group, 'This website',  URLHandler.getSiteUrl(location), noteUrl);
        this._addItem(group, 'All websites (global)',  URLHandler.getAllSitesUrl(location), noteUrl);
        var moreOptions = document.createElement('label');
        moreOptions.setAttribute('value', 'On sites starting with...');
        moreOptions.style.cssText = 'color:blue;font-style:underline;';
        group.appendChild(moreOptions);


        var urls = URLHandler.getStartsWithUrls(location);
        for(var i = 0; i < urls.length; i++) {
            var url = urls[i];
            this._addItem(group, this._shortenUrl(url), url, noteUrl);
        }
    },

    _addItem: function(group, text, url, noteUrl) {
        var item = group.appendItem(text, url);
        item.disabled = !url;
        if(noteUrl == url) {  
            group.selectedItem = item;
        }
        return item;
    },

    _shortenUrl: function(url) {
        var text = url.replace(/\*$/, '');
        if(url.length > 40) {
            var parts = text.split('/');
            text = parts[0] + '/';
            if(parts.length > 2) {
                text += '(...)/';
            }
            var lastStep = parts[parts.length - 1];
            if(lastStep.length > 20) {
                lastStep = lastStep.substr(0,15) + '(...)' + ((lastStep.lastIndexOf('.') > -1) ? lastStep.substr(lastStep.lastIndexOf('.')) : '');
            }
            text += lastStep;
        }
        return text;
    }
};

function FloatNotesView(manager) {
    this.notesManager = manager;  
    this.status = {};
    this.notes = {};

    // get references to menu items
    this._toggleNotesBrdc = document.getElementById('floatnotes-toggle-brdc');
    this._newMenuEntry = document.getElementById('floatnotes-new-note');
    this._hideMenuEntry = document.getElementById('floatnotes-hide-note');
    this.popup = document.getElementById('floatnotes-edit-popup');
    // create indicators
    IndicatorProxy.init(this);


    this.isLocationListGenerated = false;
    this.doObserve = true;
    this.registerEventHandlers();
    this.registerObserver();
}
FloatNotesView.GLOBAL_NAME = 'gFloatNotesView';

FloatNotesView.prototype = {

    /* getter and setter */

    get _container() {
        var container_id = 'floatnotes-container';
        var container = this.currentDocument.getElementById(container_id);
        if(!container && this.currentDocument && this.currentDocument.body) {
            container = this.currentDocument.createElement('div');
            container.id = container_id;
            this.currentDocument.body.appendChild(container);
        }
        return container;
    },
    set _container(value) {},

    /* end getter and setter */

    registerEventHandlers: function() {
        // attach load handler
        var that = this; 
        gBrowser.addEventListener("pageshow", function(e){that.onPageLoad(e);}, true);
        var container = gBrowser.tabContainer;
        container.addEventListener("TabSelect", function(e){that.onTabSelect(e);}, false);
        window.addEventListener("contextmenu", function(e) {that.updateContext(e);}, true);
        window.addEventListener("contextmenu", function(e) {that.updateContextMenu(e);}, false);
        gBrowser.addEventListener("hashchange", function(e) {that.onHashChange(e);}, true);
    },

    registerObserver: function() {
        var obsService = Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService);
        obsService.addObserver(this, 'floatnotes-note-update', false);
        obsService.addObserver(this, 'floatnotes-note-delete', false);
        obsService.addObserver(this, 'floatnotes-note-urlchange', false);
        obsService.addObserver(this, 'floatnotes-note-add', false);
        //var that = this;
        //function remove() {
        //that.removeObserver();
        //}
        //window.addEventListener('unload',remove , true);
        //this._removeUnloadListener = function() { window.removeEventListener('unload', remove, true);};
    },

    removeObserver: function() {
        //this._removeUnloadListener();
        var obsService = Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService);
        obsService.removeObserver(this, 'floatnotes-note-update');
        obsService.removeObserver(this, 'floatnotes-note-delete');
    },

    observe: function(subject, topic, data) {  
        if(this.doObserve) { LOG('Notification received: ' + topic + ' Data: ' + data);
            switch(topic) {
                case 'floatnotes-note-update':
                    if(this.notes[data]) {
                        this.notes[data].update();
                    }
                break;
                case 'floatnotes-note-delete':
                    if(this.notes[data]) {
                        this.notes[data].detach();
                        delete this.notes[data];
                    }
                break;
                case 'floatnotes-note-urlchange':
                    var note = this.notes[data];
                    LOG('URL changed for: ' + data);
                    if(note) {
                        note.detach();
                    }
                case 'floatnotes-note-add':
                    var locations =  URLHandler.getSearchUrls(this.currentDocument.location);
                    var note = this.notes[data] || this._createNotesWith([this.notesManager.notes[data]])[0];
                    if (locations.indexOf(note.data.url) > -1) {
                        this._attachNotesToCurrentDocument([note]);
                    }
            }
        }
    },

    onPageLoad: function (event) {
        this.isLocationListGenerated = false;
        this.updatePreferences();  
        var win = event.originalTarget.defaultView;
        var doc = win.document; // doc is document that triggered "onload" event                       
        var isFocusedDocument = (doc === gBrowser.contentDocument); 
        if(isFocusedDocument) {
            this.currentDocument = doc;
            this.loadNotes();
        }
    },

    updatePreferences: function() {
        this._scrolltimeout = util.getPreferencesService().getIntPref('scrolltimer');
        this.indicator_timeout = util.getPreferencesService().getIntPref('fadeOutAfter');
        this.show_indicators = util.getPreferencesService().getBoolPref('showIndicator');
    },

    onHashChange: function(e) {
       this.isLocationListGenerated = false;
    },

    /**
       * Load and/or show notes
*/
    onTabSelect: function(e) {
        this.currentDocument = gBrowser.contentDocument;
        this.isLocationListGenerated = false;
        this.loadNotes();
    },

    /**
       * Load and attach the notes
*/
    loadNotes: function(doc) {
        doc = doc || this.currentDocument;
        var that = this;
        this.notesManager.getNotesFor(doc.location, function(data) {
            LOG('Notes loaded for ' + doc.location + ': ' + data.length);
            that.currentNotes = that._createNotesWith(data);
            that._attachNotesToCurrentDocument();
            that._attachAndShowIndicators();
            that._updateToggleBroadcast();
            if(doc.location.hash && doc.location.hash.indexOf('#floatnotes-note') === 0) {
                doc.location.hash = doc.location.hash;
            }
        });
    },

    _updateToggleBroadcast: function() {
       if(this._notesHiddenFor(this.currentDocument.location)) {
            var text = util.getString('showNotesString', [this.currentNotes.length]);
            this._toggleNotesBrdc.setAttribute('label', text);
            this._toggleNotesBrdc.setAttribute('tooltiptext', text);
            this._toggleNotesBrdc.setAttribute('disabled', true);
            this._toggleNotesBrdc.setAttribute('image', 'chrome://floatnotes/skin/hide_note_small.png');
       }
        else {
            var text = util.getString('hideNotesString');
            this._toggleNotesBrdc.setAttribute('label', text);
            this._toggleNotesBrdc.setAttribute('tooltiptext', text);
            this._toggleNotesBrdc.setAttribute('disabled', false);
            this._toggleNotesBrdc.setAttribute('image', 'chrome://floatnotes/skin/unhide_note_small.png');
        }
            
    },

    _createNotesWith: function(dataSet) {
        var notes = [];
        for(var i = dataSet.length -1; i > -1; --i) {
            var data = dataSet[i];
            if(!this.notes[data.guid]) {
                this.notes[data.guid] = new FloatNote(data, this); LOG('Created first time: ' + data.guid);
            }
            notes.push(this.notes[data.guid]);
        }
        return notes;
    },

    _attachNotesToCurrentDocument: function(notes) {
        var doc = this.currentDocument;
        var container = this._container;
        notes = notes || this.currentNotes;
        for (var i = 0, length = notes.length; i < length; ++i) {
            notes[i].attachToDocument(doc, container);	
        }
    },


    _attachAndShowIndicators: function() {
        if(this.show_indicators) {
            IndicatorProxy.attachTo(this.currentDocument, this._container);
            this._attachScrollHandlerTo(this.currentDocument);
            util.fireEvent(this.currentDocument, 'scroll');
        }	 
    },

    _startScrollTimeout: function() {
        var that = this;
        this._stopScrollTimeout();
        this._scrolltimer = window.setTimeout(function(){
            that._updateAndShowIndicators();
        }, this._scrolltimeout);
    },

    _stopScrollTimeout: function() {
        if(this._scrolltimer) {
            window.clearTimeout(this._scrolltimer);
            this._scrolltimer = null;
        }
    },

    _updateAndShowIndicators: function() {
        this._updateNotePositions();
        IndicatorProxy.updateAndShow(this.currentDocument, this.currentNotes);
        IndicatorProxy.startTimeout();
    },

    _updateNotePositions: function() {
        var doc = this.currentDocument;
        var wintop = parseInt(doc.defaultView.pageYOffset, 10),
        winheight = parseInt(doc.defaultView.innerHeight, 10);

        this.currentNotes.forEach(function(note) {
            if(note.dom) {
                var element = note.dom;
                var top = parseInt(element.style.top, 10);
                var bottom = top + parseInt(element.offsetHeight, 10);
                if (wintop > bottom) {
                    note.position = Indicator.ABOVE;
                }
                else if(wintop + winheight < top) {
                    note.position = Indicator.BELOW;
                }
                else {
                    note.position = 0;
                }
            }

        });

    }, 

    _attachScrollHandlerTo: function(doc) {
        var that = this;
        this._removeScrollHandler();

        function handler() {
             that._startScrollTimeout();
        }

        doc.addEventListener('scroll', handler, false);

        this._killScrollHandler = function() {
            doc.removeEventListener('scroll', handler, false);
            that._killScrollHandler = null;
        };
    },

    _removeScrollHandler: function() {
        if(this._killScrollHandler) {
            this._killScrollHandler();
            this._killScrollHandler = null;
        }
    },

    addNote: function() {
        var data = this.notesManager.createNote(this.currentDocument);
        data.x = this.X;
        data.y = this.Y;
        var note = new FloatNote(data, this);
        note.attachToDocument(this.currentDocument, this._container);
        this._attachAndShowIndicators();
        note.edit();
    },

    saveNote: function(note, cb) {
        this.doObserve = false;
        var that = this;
        this.notesManager.saveNote(note.data, function(id, guid) {
            if(guid) {
                that.notes[guid] = note;
            }
            that.doObserve = true;
            cb(id, guid);
        });
    },

    deleteNote: function(note) {
        note = note || this.contextNote
        if(note) {
            var that = this;
            this.doObserve = false;
            this.notesManager.deleteNote(note.data, function() {
                note.detach();
                delete that.notes[note.data.guid];
                that.contextNote = null;
                that.doObserve = true;
            }); 
        }
    },

    /* show or hide the notes for the current location */
    toggleNotes: function() {
        var domain = this.currentDocument.location;
        if(this._notesHiddenFor(domain)) {
            this.showNotes(); LOG('Nodes shown.');
        }
        else {
            this.hideNotes(); LOG('Nodes hidden.');
        }
    },

    showNotes: function() {
        var location = this.currentDocument.location;
        this._setNotesVisibilityForTo(location, true);
        util.show(this._container);
        this._attachAndShowIndicators();
        this._updateToggleBroadcast();
    },

    hideNotes: function() {
        var location = this.currentDocument.location;
        this._setNotesVisibilityForTo(location, false);
        util.hide(this._container);
        this._detachIndicators();
        this._updateToggleBroadcast();
    },

    _setNotesVisibilityForTo: function(location, visible) {
        if(!this.status[location]) {
            this.status[location] = {};
        }
        this.status[location].visible = visible;
    }, 

    _detachIndicators: function() {
        this._removeScrollHandler();
        //IndicatorProxy.detach();
    },

    updateContext: function(event) {
        this.contextNote = null;
        this.X = event.pageX;
        this.Y = event.pageY;
    },

    updateContextMenu: function(event) {
        if(this.contextNote) {
            // don't show any menu items if in editing mode
            this._hideMenuItems([this._newMenuEntry]);
        }
        else {
            this._showMenuItems([this._newMenuEntry]);
        }
        var doc = this.currentDocument || gBrowser.contentDocument;
        var domain = doc.location;
        if(this.notesManager.siteHasNotes(domain) && !this.contextNote) {
            this._showMenuItems([this._hideMenuEntry]); 
        }
        else {
            this._hideMenuItems([this._hideMenuEntry]);
        }
    },

    _hideMenuItems: function(items) {
        for(var i = 0, l = items.length; i < l; i++) {
            items[i].hidden = true;
        }
    },

    _showMenuItems: function(items) {
        for(var i = 0, l = items.length; i < l; i++) {
            items[i].hidden = false;
        }
    },

    _notesHiddenFor: function(location) {
        return this.status[location] && !this.status[location].visible;
    },

    openEditPopup: function(note, anchor, cb) {
        this.popup.hidePopup();
        if(this.isLocationListGenerated) {
            locationBuilder.updateSelectedElement(note.url);
        }
        else {
            locationBuilder.buildLocationList(this.currentDocument.location, note.url);
            this.isLocationListGenerated = true;
        }
        document.getElementById('floatnotes-edit-color').color = note.color;
        this.saveChanges = function() {
            if(this.popup.state == 'closed') {
                LOG('Edit popup hidden');
                cb(document.getElementById('floatnotes-edit-color').color,document.getElementById('floatnotes-edit-location-list').selectedItem.value);
            }
        };
        this.popup.openPopup(anchor, "end_before", 0, 0, false, false); 
    }
};

//!#endif
