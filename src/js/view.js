//!#ifndef __INCLUDE_MANAGER_
//!#define __INCLUDE_MANAGER_
//!#include "header.js"
//!#include "indicator.js"
//!#include "note.js"

Cu.import("resource://floatnotes/URLHandler.js");
Cu.import("resource://floatnotes/preferences.js");


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

        this._addItem(group, loc.get('location.page_url_label'),  URLHandler.getPageUrl(location), noteUrl);
        var queryUrl = URLHandler.getPageQueryUrl(location);
        if(queryUrl) {
            var query = location.search;
            item = this._addItem(group, loc.get('location.query_url_label'),  queryUrl, noteUrl);
            item.style.marginLeft="20px";
            item.setAttribute('tooltiptext', query);
        }
        var hashUrl =  URLHandler.getPageAnchorUrl(location);
        if(hashUrl) {
            var hash = location.hash;
            item = this._addItem(group, loc.get('location.query_url_label'), hashUrl, noteUrl);
            item.style.marginLeft="20px";
            item.setAttribute('tooltiptext', hash);
        }
        this._addItem(group, loc.get('location.site_url_label'),  URLHandler.getSiteUrl(location), noteUrl);
        this._addItem(group, loc.get('location.all_sites_label'),  URLHandler.getAllSitesUrl(location), noteUrl);
        var moreOptions = document.createElement('label');
        moreOptions.setAttribute('value', loc.get('location.sites_starting_label'));
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

function FloatNotesView(manager) {
    this.notesManager = manager;
    this.status = {};
    this.notes = {};

    this._scrollTimer = Cc["@mozilla.org/timer;1"]
                        .createInstance(Ci.nsITimer);

    // get references to menu items
    this._toggleNotesBrdc = document.getElementById('floatnotes-toggle-brdc');
    this._newMenuEntry = document.getElementById('floatnotes-new-note');
    this._hideMenuEntry = document.getElementById('floatnotes-hide-note');
    this.popup = document.getElementById('floatnotes-edit-popup');
    // create indicators
    IndicatorProxy.init(this, Preferences);


    this._isLocationListGenerated = false;
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
        window.addEventListener("activate", function(e) {that.onWindowActivated(e);}, true);
    },

    registerObserver: function() { 
        var obsService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
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
        var obsService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
        obsService.removeObserver(this, 'floatnotes-note-update');
        obsService.removeObserver(this, 'floatnotes-note-delete');
    },

    observe: function(subject, topic, data) {
        if(this.doObserve) { LOG('Notification received: ' + topic + ' Data: ' + data);
            var note;
            switch(topic) {
                case 'floatnotes-note-update':
                    if(this.notes[data]) {
                        this.notes[data].update();
                    }
                break;
                case 'floatnotes-note-delete':
                    note = this.notes[data];
                    if(note) {
                        note.detach();
                        Util.Js.removeObjectFromArray(note, this.currentNotes);
                        delete this.notes[data];
                    }
                break;
                case 'floatnotes-note-urlchange':
                    note = this.notes[data];
                    LOG('URL changed for: ' + data);
                    if(note) {
                        note.detach();
                        Util.Js.removeObjectFromArray(note, this.currentNotes);
                    }
                case 'floatnotes-note-add':
                    var locations =  URLHandler.getSearchUrls(this.currentDocument.location);
                    note = this.notes[data] || this._createNotesWith([this.notesManager.notes[data]])[0];
                    if (locations.indexOf(note.data.url) > -1) {
                        this.currentNotes.push(note);
                        this._attachNotesToCurrentDocument([note]);
                    }
            }
        }
    },

    onPageLoad: function (event) {
        this._isLocationListGenerated = false;
        var win = event.originalTarget.defaultView;
        var doc = win.document; // doc is document that triggered "onload" event
        var isFocusedDocument = (doc === gBrowser.contentDocument);
        if(isFocusedDocument) {
            this.currentDocument = gBrowser.contentDocument;
            this.loadNotes();
        }
    },

    onTabSelect: function(e) {
        this.currentDocument = gBrowser.contentDocument;
        this.loadNotes();
    },

    onWindowActivated: function(e) {
        this.scrollToNote();
    },

    onHashChange: function(e) {
       if(Preferences.updateOnHashChange) {
           this.currentNotes.forEach(function(note){
                note.detach();
           });
           this.loadNotes();
       }
    },

    /**
       * Load and attach the notes
*/
    loadNotes: function(doc) {
        var that = this;
        this._isLocationListGenerated = false;
        doc = doc || this.currentDocument;
        var domain = doc.location;
        if(domain.protocol === 'about:') {
            return false;
        }

        if(URLHandler.supports(domain)) {
            this.notesManager.getNotesFor(domain, function(data) {
                LOG('Notes loaded for ' + domain + ': ' + data.length);
                that.currentNotes = that._createNotesWith(data);
                that._attachNotesToCurrentDocument();
                that._attachAndShowIndicators();
                that._updateToggleBroadcast();
                that.scrollToNote();                
            });
        }
        else {
            if(Preferences.showUriNotSupported) {
                var notifyBox = gBrowser.getNotificationBox(),
                    note = notifyBox.getNotificationWithValue('floatnotes'),
                    loc = Util.Locale;
                if(note) {
                    notifyBox.removeNotification(note);
                }

                notifyBox.appendNotification(loc.get('location.protocol_not_supported', [domain.protocol]), 'floatnotes', null, notifyBox.PRIORITY_INFO_MEDIUM, [{label: loc.get('button.not_again'), callback:function(note){Preferences.showUriNotSupported = false;}}, 
                            {label: loc.get('button.ok'), callback: function(note){}}]);
            }
        }
    },

    scrollToNote: function(guid) {
        guid = guid || this.scroll_to_note;
        if(guid) {
            var note = this.notes[guid];
            if(note) {
                this.currentDocument.defaultView.scrollTo(note.data.x, Math.max(note.data.y - 20, 0));
            }
            this.scroll_to_note = null;
        }
    },

    _updateToggleBroadcast: function() {
       if(this._notesHiddenFor(this.currentDocument.location)) {
            var text = Util.Locale.get('showNotesString', [this.currentNotes.length]);
            this._toggleNotesBrdc.setAttribute('label', text);
            this._toggleNotesBrdc.setAttribute('tooltiptext', text);
            this._toggleNotesBrdc.setAttribute('disabled', true);
            this._toggleNotesBrdc.setAttribute('image', 'chrome://floatnotes/skin/hide_note_small.png');
       }
        else {
            var text = Util.Locale.get('hideNotesString');
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
        if(Preferences.showIndicator) {
            IndicatorProxy.attachTo(this.currentDocument, this._container);
            this._attachScrollHandlerTo(this.currentDocument);
            Util.Dom.fireEvent(this.currentDocument, this.currentDocument, 'scroll');
        }
    },

    _startScrollTimeout: function() {
        var that = this;
        this._scrollTimer.initWithCallback({notify: function(){
            that._updateAndShowIndicators();
        }}, Preferences.scrollTimer, this._scrollTimer.TYPE_ONE_SHOT);
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

        for(var i = this.currentNotes.length;i--;) {
            var note = this.currentNotes[i];
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
        note.data.protocol = URLHandler.getProtocol(this.currentDocument.location);
        this.notesManager.saveNote(note.data, function(id, guid) {
            if(id > -1) {
                that.notes[guid] = note;
                that.currentNotes.push(note);
            }
            that.doObserve = true;
            cb(id, guid);
        });
    },

    deleteNote: function(note) {
        note = note || this.contextNote;
        if(note) {
            var del = true;
            if(Preferences.confirmDelete) {
                var loc = Util.Locale;
                var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"] .getService(Ci.nsIPromptService);
                var checkState = {value: !Preferences.confirmDelete};
                del = promptService.confirmCheck(null, loc.get('note.delete.title'), loc.get('note.delete.popup.msg'), loc.get('button.not_ask_again'), checkState);
                Preferences.confirmDelete = !checkState.value;
            }

            if(del) {
                var that = this;
                this.doObserve = false;
                this.notesManager.deleteNote(note.data, function() {
                    note.detach();
                    Util.Js.removeObjectFromArray(note, that.currentNotes);
                    delete that.notes[note.data.guid];
                    that.contextNote = null;
                    that.doObserve = true;
                });
            }
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

    _notesHiddenFor: function(location) {
        return this.status[location] && !this.status[location].visible;
    },

    showNotes: function() {
        var location = this.currentDocument.location;
        this._setNotesVisibilityForTo(location, true);
        Util.Css.show(this._container);
        this._attachAndShowIndicators();
        this._updateToggleBroadcast();
    },

    hideNotes: function() {
        var location = this.currentDocument.location;
        this._setNotesVisibilityForTo(location, false);
        Util.Css.hide(this._container);
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
        this._newMenuEntry.hidden = !!this.contextNote;
        this._hideMenuEntry.hidden = this.notesManager.siteHasNotes(this.currentDocument.location) && !this.contextNote;
    },

    openEditPopup: function(note, anchor, cb) {
        this._generateLocationList(note);
        document.getElementById('floatnotes-edit-color').color = note.color;
        this.saveChanges = function() {
            if(this.popup.state == 'closed') {
                LOG('Edit popup hidden');
                cb(document.getElementById('floatnotes-edit-color').color,document.getElementById('floatnotes-edit-location-list').selectedItem.value);
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
    openNotesManager: function() {
        if(!("notemanager" in Shared) || Shared.notemanager.closed) {
            Shared.notemanager = window.openDialog('chrome://floatnotes/content/notelist.xul', 'FloatNotes', 'chrome, resizeable, centerscreen');
        }
        else {
            Shared.notemanager.focus();
        }
    }
};

//!#endif
