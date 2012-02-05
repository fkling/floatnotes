//!#include "header.js"

Cu.import("resource://floatnotes/URLHandler.js");
Cu.import("resource://floatnotes/preferences.js");
Cu.import("resource://floatnotes/Mediator.js");


var locationBuilder = {
    get locationListElement() {
        if(!this._ele) {
            this._ele =  document.getElementById('floatnotes-edit-location-list');
        }
        return this._ele;
    },

    set locationListElement(value) {},

    updateSelectedElement: function(noteUrl) {
        var item = this.locationListElement.querySelector("radio[value='" + noteUrl + "']");LOG('Selection updated');
        if(item) {
            this.locationListElement.selectedItem = item;
        }
    },

    buildLocationList: function(location, noteUrl) {
        var item,
            group = this.locationListElement,
            loc = Util.Locale;

        Util.Dom.removeChildren(group);
        
        var pageUrl =  URLHandler.getPageUrl(location);
        item = this._addItem(group, loc.get('location.page_url_label'), pageUrl, noteUrl);
        item.setAttribute('tooltiptext', pageUrl);
        var queryUrl = URLHandler.getPageQueryUrl(location);
        if(queryUrl) {
            var query = location.search;
            item = this._addItem(group, loc.get('location.query_url_label'),  queryUrl, noteUrl);
            item.style.marginLeft="20px";
            item.setAttribute('tooltiptext', queryUrl);
        }
        var hashUrl =  URLHandler.getPageAnchorUrl(location);
        if(hashUrl) {
            var hash = location.hash;
            item = this._addItem(group, loc.get('location.hash_url_label'), hashUrl, noteUrl);
            item.style.marginLeft="20px";
            item.setAttribute('tooltiptext', hashUrl);
        }
        var queryHashUrl =  URLHandler.getPageQueryAnchorUrl(location);
        if(queryHashUrl) {
            var tooltip = location.search + location.hash;
            item = this._addItem(group, loc.get('location.query_hash_url_label'), queryHashUrl, noteUrl);
            item.style.marginLeft="20px";
            item.setAttribute('tooltiptext', queryHashUrl);
        }
        var siteUrl =  URLHandler.getSiteUrl(location);
        item = this._addItem(group, loc.get('location.site_url_label'), siteUrl, noteUrl);
        item.setAttribute('tooltiptext', siteUrl);

        this._addItem(group, loc.get('location.all_sites_label'),  URLHandler.getAllSitesUrl(location), noteUrl);

        var moreOptions = document.createElement('label');
        var moreOptionsContainer = document.createElement('vbox');
        moreOptionsContainer.style.paddingLeft = "20px";

        var urls = URLHandler.getStartsWithUrls(location);
        if(urls.length > 0) {
            moreOptions.setAttribute('value', loc.get('location.sites_starting_label'));
            moreOptions.setAttribute('class',"floatnotes-location-label");
            group.appendChild(moreOptions);
            group.appendChild(moreOptionsContainer);


            for(var i = 0; i < urls.length; i++) {
                var url = urls[i];
                item = this._addItem(group, this._shortenUrl(url), url, noteUrl, moreOptionsContainer);
                item.setAttribute('tooltiptext', url);
            }
        }
    },

    _addItem: function(group, text, url, noteUrl, parent) {
        var item;
        if(parent) {
            item = document.createElement('radio');
            item.setAttribute('label',text);
            item.setAttribute('value',url);
            parent.appendChild(item);
        }
        else {
            item = group.appendItem(text, url);
        }
        item.hidden = !url;
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


function MainUI(manager, display){
    this.display = display;
    this.display.setMainUI(this);
    this.notesManager = manager;
    this.status = {};
    this.notes = {};
    this.currentNotes = [];

    this._scrollTimer = Cc["@mozilla.org/timer;1"]
                        .createInstance(Ci.nsITimer);

    // get references to UI items
    this._toggleNotesBrdc = document.getElementById('floatnotes-toggle-brdc');
    this._editNoteBrdc = document.getElementById('floatnotes-edit-brdc');

    this._deleteMenuEntry = document.getElementById('floatnotes-delete-note');
    this._newMenuEntry = document.getElementById('floatnotes-new-note');
    this._hideMenuEntry = document.getElementById('floatnotes-hide-note');
    
    this._menuEntry = document.getElementById('floatnotes-menu');
    this.onPreferenceChange('showMenu', Preferences.showMenu);
    this._toolbarButton = document.getElementById('floatnotes-toolbar-button');

    this.popup = document.getElementById('floatnotes-edit-popup');

    this._isLocationListGenerated = false;
    Mediator.setCurrentWindow(this);
    this.registerEventHandlers();
    this.registerObserver();
}

MainUI.GLOBAL_NAME = 'gFloatNotesView';

MainUI.prototype = {

    get currentDocument() {
        return gBrowser.contentDocument;
    },

    registerEventHandlers: function() {
        // attach load handler
        var that = this;
        window.addEventListener("activate", function(e) {that.onWindowActivated(e);}, true);
        gBrowser.addEventListener("pageshow", function(e){that.onPageLoad(e);}, true);
        gBrowser.tabContainer.addEventListener("TabSelect", function(e){that.onTabSelect(e);}, false);
        gBrowser.addEventListener("hashchange", function(e) {that.onHashChange(e);}, true);
        window.addEventListener("contextmenu", function(e) {that.updateContext(e);}, true);
        window.addEventListener("contextmenu", function(e) {that.updateContextMenu(e);}, false);
    },

    registerObserver: function() {
        Util.Mozilla.registerObserver(this, 'floatnotes-note-edit');
        var that = this;
        function remove(e) {
            if(e.target instanceof XULDocument) {
                LOG('Observer removed.')
                window.removeEventListener('unload', remove, true);
                that.removeObserver();
            }
        }
        window.addEventListener('unload',remove , true);

        Preferences.addObserver(this, 'showMenu', 'fontSize');
    },

    removeObserver: function() {
        Util.Mozilla.removeObserver(this, 'floatnotes-note-edit');    
    },

    observe: function(subject, topic, value) {
        if(topic === 'floatnotes-note-edit') {  // value is either true (editing) or false (not editing)
            this._editNoteBrdc.setAttribute('disabled', value === "true");
            this._editNoteBrdc.setAttribute('hidden', value === "true");
        }
    },

    onPreferenceChange: function(pref, value) { LOG('View: Preference ' + pref + ' changed: ' + value)
        switch(pref) {
            case 'showMenu':
                this._menuEntry.hidden = !value;
            break;
        }
    },

    onPageLoad: function (event) {
        this._isLocationListGenerated = false;
        var win = event.originalTarget.defaultView;
        var doc = win.document; // doc is document that triggered the "load" event
        var isFocusedDocument = (doc === gBrowser.contentDocument);
        if(isFocusedDocument) {
            this.loadNotes();
        }
    },

    onTabSelect: function(e) {
        if(this.currentDocument && this.currentDocument.readyState === 'complete') {
            this.loadNotes();
        }
    },

    onWindowActivated: function(e) {
        Mediator.setCurrentWindow(this);
        if(this.currentDocument && this.currentDocument.readyState === 'complete') {
            this.loadNotes();
        }
    },

    onHashChange: function(e) {
        if(Preferences.updateOnHashChange) {
            this.reload();           
        }
    },

    reload: function(event) {
        if(event) {
            event.stopPropagation();
        }
        this.loadNotes();
    },

    /**
       * Load and attach the notes
*/
    loadNotes: function(force) {
        var that = this;
        this._isLocationListGenerated = false;
        doc = this.currentDocument;
        var domain = doc.location;
        if(doc && doc.body) {
            // FloatNotes does not support pages with frames yet
            if(this.currentDocument.querySelector('frameset')) {
                this._editNoteBrdc.setAttribute('hidden', true);
                this._showNotification(Util.Locale.get('location.frames_not_supported'));
                return false;
            }

            if(URLHandler.supports(domain)) {
                this.notesManager.getNotesFor(domain, function(notes) {
                    that.display.setNotes(notes);                
                    that.updateVisibilty(domain);
                    that._updateBroadcaster();
                    if(Shared.focusNote) {
                        that.display.focusNote(Shared.focusNote);
                        Shared.focusNote = null;
                    }
                    that._attachScrollHandlerTo(doc);
                    that.display.updateUI();
                });
            }
            else {
                this._editNoteBrdc.setAttribute('hidden', true);
                if(!URLHandler.isInternal(location)) {
                    this._showNotification(Util.Locale.get('location.protocol_not_supported', [domain.protocol]));
                }

            }
        }
    },

    _showNotification: function(msg) {
        if(Preferences.showSiteNotSupported === true) {
            Util.Dialog.showNotSupportedNotification(msg);
        }
    },

    _updateBroadcaster: function() {
        this._editNoteBrdc.setAttribute('hidden', false);
        if(this._notesHiddenFor(this.currentDocument.location)) {
            var text = Util.Locale.get('showNotesString', [this.display.length]);
            this._toggleNotesBrdc.setAttribute('label', text);
            this._toggleNotesBrdc.setAttribute('tooltiptext', text);
            this._toggleNotesBrdc.setAttribute('disabled', true);
            this._toggleNotesBrdc.setAttribute('hidden', true);
            this._toggleNotesBrdc.setAttribute('image', 'chrome://floatnotes/skin/note_dis_16.png');
            this._toggleNotesBrdc.setAttribute('class', 'hidden');
            
            if(this._toolbarButton) {
            	Util.Css.addClass(this._toolbarButton, 'hidden');
            }
        }
        else {
            var text = Util.Locale.get('hideNotesString');
            this._toggleNotesBrdc.setAttribute('label', text);
            this._toggleNotesBrdc.setAttribute('tooltiptext', text);
            this._toggleNotesBrdc.setAttribute('disabled', false);
            this._toggleNotesBrdc.setAttribute('hidden', false);
            this._toggleNotesBrdc.setAttribute('image', 'chrome://floatnotes/skin/note_16.png');
                this._toggleNotesBrdc.setAttribute('class', '');
                
            if(this._toolbarButton) {
              	Util.Css.removeClass(this._toolbarButton, 'hidden');
            }
        }

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
        }
    },

    _startScrollTimeout: function() {
        var that = this;
        this._scrollTimer.initWithCallback({notify: function(){
            that.display.updateUI();
        }}, Preferences.scrolltimer, this._scrollTimer.TYPE_ONE_SHOT);
    },

    addNote: function() {
        var note = this.notesManager.createNote(this.currentDocument, this.X, this.Y);
        this.display.createNote(note);
    },

    saveNote: function(note, cb) {
        Mediator.observe(false);
        var that = this;
        note.protocol = URLHandler.getProtocol(this.currentDocument.location);
        this.notesManager.saveNote(note, function(id, guid) {
            if(id > -1) {
                that.display.persistNewNote(guid);
            }
            Mediator.observe(true);
            cb(id, guid);
        });
    },

    deleteNote: function(note) {
        note = note || this.contextNote;
        if(note) {
            var del = true;
            if(Preferences.confirmDelete) {
                del = Util.Dialog.confirmDeletion();
            }

            if(del) {
                var that = this;
                Mediator.observe(false);
                this.notesManager.deleteNote(note, function() {
                    that.display.removeNote(note);
                    that.contextNote = null;
                    Mediator.observe(true);
                });
            }
        }
    },

    /* show or hide the notes for the current location */
    toggleNotes: function(element) {
        var domain = this.currentDocument.location;
        if(this._notesHiddenFor(domain)) {
            this.display.showNotes(); LOG('Nodes shown.');
            this.display.redraw();
        }
        else {
            this.display.hideNotes(); LOG('Nodes hidden.');
        }
        this._setNotesVisibilityForTo(domain, this._notesHiddenFor(domain));
        this._updateBroadcaster();
    },

    updateVisibilty: function(location) {
        if(this._notesHiddenFor(location)) {
            this.display.hideNotes();
        }
        else {
            this.display.showNotes();
        }
    },

    _notesHiddenFor: function(location) {
        return this.status[location] && !this.status[location].visible;
    },

    _setNotesVisibilityForTo: function(location, visible) {
        if(!this.status[location]) {
            this.status[location] = {};
        }
        this.status[location].visible = visible;
    },

    updateContext: function(event) {
        this.contextNote = null;
        this.X = event.pageX;
        this.Y = event.pageY;
    },

    updateContextMenu: function(event) {
        LOG('Context note is: ' + this.contextNote)
        this._deleteMenuEntry.hidden = !this.contextNote || this._editNoteBrdc.hidden || !Preferences.showContextDelete;
        this._newMenuEntry.hidden = this.contextNote || this._editNoteBrdc.hidden || this._toggleNotesBrdc.hidden;
        this._hideMenuEntry.hidden = this._editNoteBrdc.hidden || !(this.display.length > 0)  || !Preferences.showContextHide;
    },

    openEditPopup: function(note, anchor, cb) {
        this._generateLocationList(note);
        document.getElementById('floatnotes-edit-color').color = note.color;
        this.saveChanges = function() {
            if(this.popup.state == 'closed') {
                LOG('Edit popup hidden');
                var item = document.getElementById('floatnotes-edit-location-list').selectedItem
                var url =  item ? item.value : '';               
                cb(document.getElementById('floatnotes-edit-color').color,url);
            }
        };
        this.popup.openPopup(anchor, "end_before", 0, 0, false, false);
    },

    _generateLocationList: function(note) {
        if(this._isLocationListGenerated) {
            locationBuilder.updateSelectedElement(note.url);
        }
        else {
            locationBuilder.buildLocationList(this.currentDocument.location, note.url);
            this._isLocationListGenerated = true;
        }
    },
    openNotesManager: function(event) {
        if(event) {
            event.stopPropagation();
        }
        if(!("notemanager" in Shared) || Shared.notemanager.closed) {
            Shared.notemanager = window.open('chrome://floatnotes/content/notelist.xul', 'FloatNotes', 'chrome,resizable,centerscreen');
        }
            else {
                Shared.notemanager.focus();
            }
    },
    openPreferences: function(event) {
        if(event) {
            event.stopPropagation();
        }
        if(!("preferences" in Shared) || Shared.preferences.closed) {
            Shared.preferences = window.openDialog('chrome://floatnotes/content/preferences.xul', 'FloatNotes Preferences');
        }
            else {
                Shared.preferences.focus();
            }
    },
};
