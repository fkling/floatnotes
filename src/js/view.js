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

function FloatNotesView(manager) {
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
    this.onPreferenceChange('showToolbarButton', Preferences.showToolbarButton);

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


    get currentDocument() {
        return gBrowser.contentDocument;
    },

    get _container() {
        var container_id = 'floatnotes-container',
            container = this.currentDocument.getElementById(container_id);
        if(!container && this.currentDocument && this.currentDocument.body) {
            container = this._createContainer();
            container.id = container_id;
            //container.style.zIndex = Util.Css.findHighestZIndex(this.currentDocument, 'div');
            this.currentDocument.body.appendChild(container);
        }
        return container;
    },
    set _container(value) {},

    /* end getter and setter */


    _createContainer: function() {
        var container = this.currentDocument.createElement('div'),
            hcl = Util.Css.hasClass,
            ha = Util.Css.hasAncestorWithClass,
            ic = Util.Css.isOrIsContained,
            that = this,
            moving = false,
            resizing = false,
            edit_open = false;

        function getNote(target) {
            var noteNode = target;
            while(!hcl(noteNode, 'floatnotes-note')) {
                noteNode = noteNode.parentNode;
            };
            var guid = noteNode.getAttribute('rel');
            return (guid === 'new') ? that._newNote : that.notes[guid];
        }

        container.addEventListener('click', function(e) {
            LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
            var target = e.target;
            if(!ic(target, 'floatnotes-indicator')) {
                var note = getNote(target);
                if(note.hasStatus(FloatNote.STATUS.EDITING)) {
                    e.stopPropagation();
                }
                else if(hcl(target, 'floatnotes-togglefix')) {
                    e.stopPropagation();
                    e.preventDefault();
                    note.toggleFix(e);

                }
                else if(hcl(target, 'floatnotes-delete')) {
                    that.deleteNote(note);
                }
                else if(hcl(target, 'floatnotes-edit')) {
                    that.openEditPopup(note, target, function(color, url) {
                        note.url = url || note.url;
                        note.color = color || note.color;
                        note.save();
                        note.update();
                        edit_open = false;
                        note.mouseleave();
                    });
                    edit_open = true;
                }
                else if((ic(target, 'floatnotes-content') || hcl(target, 'floatnotes-note')) 
                        && note.hasStatus(FloatNote.STATUS.MINIMIZED)) {
                            note.unminimizeAndSave();
                }
            }
        }, true);

        container.addEventListener('dblclick', function(e) {
            LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
            var target = e.target;
            if(hcl(target, 'floatnotes-drag-handler') || hcl(target, 'floatnotes-drag')) {
                e.stopPropagation();
                var note = getNote(target);
                if(!note.hasStatus(FloatNote.STATUS.EDITING)) {
                    note.minimizeAndSave();
                }
            }
            else if(hcl(target, 'floatnotes-content') || (ha(target, 'floatnotes-content') && target.nodeName.toLowerCase() !== 'a')) {
                e.stopPropagation();
                getNote(target).edit();
            }
        }, true);

        container.addEventListener('mouseover', function(e) {
            LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
            if(!(moving || resizing || edit_open)) {
                e.stopPropagation();
                var note = getNote(e.target);
                note.mouseenter(); 
            }
        }, false);

        container.addEventListener('mouseout', function(e) {
            LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
            if(!(moving || resizing || edit_open)) {
                e.stopPropagation();
                var note = getNote(e.target);
                note.mouseleave();
            }
        }, false);

        container.addEventListener('mousedown', function(e) {
            LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
            var target = e.target;
            if(!ic(target, 'floatnotes-indicator')) {
                var note = getNote(target);
                note.raiseToTop();
                if(hcl(target, 'floatnotes-drag-handler') || hcl(target, 'floatnotes-drag') || hcl(target, 'floatnotes-resize')) {
                    Util.Css.addClass(container, 'overlay');
                    container.style.width = that.currentDocument.body.clientWidth + "px";
                    container.style.height = that.currentDocument.body.clientHeight + "px";
                    if(hcl(target, 'floatnotes-resize')) {
                        resizing = true;
                        note.startResize(e);
                    }
                    else {
                        moving = true;
                        note.startMove(e);
                    }
                }
            }
        }, true);

        container.addEventListener('mouseup', function(e) {
            LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
            moving = moving ? false : moving;
            resizing = resizing ? false : resizing;
            Util.Css.removeClass(container, 'overlay');
            container.style.width = "0px";
            container.style.height = "0px";
        }, true);

        container.addEventListener('contextmenu', function(e) {
            var note = getNote(e.target);
            if(note) {
                that.contextNote = note;
            }
        }, true);

        return container;
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
        var obsService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
        obsService.addObserver(this, 'floatnotes-note-update', false);
        obsService.addObserver(this, 'floatnotes-note-delete', false);
        obsService.addObserver(this, 'floatnotes-note-urlchange', false);
        obsService.addObserver(this, 'floatnotes-note-add', false);
        var that = this;
        function remove(e) {
            if(e.target instanceof XULDocument) {
                LOG('Observer removed.')
                window.removeEventListener('unload', remove, true);
                that.removeObserver();
            }
        }
        window.addEventListener('unload',remove , true);

        Preferences.addObserver(this, 'showMenu', 'showToolbarButton', 'fontSize');
    },

    removeObserver: function() {
        var obsService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
        obsService.removeObserver(this, 'floatnotes-note-update');
        obsService.removeObserver(this, 'floatnotes-note-delete');
        obsService.removeObserver(this, 'floatnotes-note-urlchange');
        obsService.removeObserver(this, 'floatnotes-note-add');
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

    onPreferenceChange: function(pref, value) { LOG('View: Preference ' + pref + ' changed: ' + value)
        switch(pref) {
            case 'showMenu':
                this._menuEntry.hidden = !value;
            break;
            case 'showToolbarButton':
                try {
                  var myId    = "floatnotes-toolbar-button";
                  var afterId = "search-container";
                  var navBar  = document.getElementById("nav-bar");
                  var curSet  = navBar.currentSet.split(",");
                  if(value && curSet.indexOf(myId) == -1 ) {
                    var pos = curSet.indexOf(afterId) + 1 || curSet.length;
                    var set = curSet.slice(0, pos).concat(myId).concat(curSet.slice(pos));

                    navBar.setAttribute("currentset", set.join(","));
                    navBar.currentSet = set.join(",");
                    document.persist(navBar.id, "currentset");
                  }
                  else if(!value && curSet.indexOf(myId) > -1) {
                    var pos = curSet.indexOf(myId)
                    curSet.splice(pos, 1);

                    navBar.setAttribute('curentset', curSet.join(','));
                    navBar.currentSet = curSet.join(',');
                    document.persist(navBar.id, "currentset");
                  }
                    try {
                      BrowserToolboxCustomizeDone(true);
                    }
                    catch (e) {}
                }
                catch(e) {}
                
                break;
           case 'fontSize':
               for(var i = this.currentNotes.length; i--; ) {
                    this.currentNotes[i].updateDOM();
                }
           break;
        }
    },

    onPageLoad: function (event) {
        this._isLocationListGenerated = false;
        var win = event.originalTarget.defaultView;
        var doc = win.document; // doc is document that triggered "onload" event
        var isFocusedDocument = (doc === gBrowser.contentDocument);
        if(isFocusedDocument) {
            this.loadNotes();
        }
    },

    onTabSelect: function(e) {
        this.loadNotes();
    },

    onWindowActivated: function(e) {
        this.scrollToNote();
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
        for(var i = this.currentNotes.length; i--; ) {
            this.currentNotes[i].detach();
        }
        this.loadNotes();
    },

    /**
       * Load and attach the notes
*/
    loadNotes: function(doc) {
        var that = this;
        this._isLocationListGenerated = false;
        doc = doc || this.currentDocument;
        var domain = doc.location;
        this.currentNotes = [];
        if(domain.protocol === 'about:' && domain.href !== 'about:home') {
            this._editNoteBrdc.setAttribute('hidden', true);
            return false;
        }
            
        // FloatNotes does not support pages with frames yet
        if(this.currentDocument.querySelector('frameset')) {
            this._editNoteBrdc.setAttribute('hidden', true);
            this.showNotification(Util.Locale.get('location.frames_not_supported'));
            return false;
        }

        if(URLHandler.supports(domain)) {
            this.notesManager.getNotesFor(domain, function(data) {
                LOG('Notes loaded for ' + domain + ': ' + data.length);
                that.currentNotes = that._createNotesWith(data);
                that._attachNotesToCurrentDocument();
                that._attachAndShowIndicators();
                that._updateBroadcaster();
                that.scrollToNote();                
            });
        }
        else {
            this._editNoteBrdc.setAttribute('hidden', true);
            this.showNotification(Util.Locale.get('location.protocol_not_supported', [domain.protocol]));
                
        }
    },

    showNotification: function(msg) {
        if(Preferences.showSiteNotSupported === true) {
            var notifyBox = gBrowser.getNotificationBox(),
                note = notifyBox.getNotificationWithValue('floatnotes'),
                loc = Util.Locale;
            if(note) {
                notifyBox.removeNotification(note);
            } 
            notifyBox.appendNotification(msg, 'floatnotes', 'chrome://floatnotes/skin/note_16.png', notifyBox.PRIORITY_WARNING_LOW, [{label: loc.get('button.not_show_again'), callback:function(note){ Preferences.showSiteNotSupported = false; }}, {label: loc.get('button.ok'), callback: function(note){}} ]);
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

    _updateBroadcaster: function() {
       this._editNoteBrdc.setAttribute('hidden', false);
       if(this._notesHiddenFor(this.currentDocument.location)) {
            var text = Util.Locale.get('showNotesString', [this.currentNotes.length]);
            this._toggleNotesBrdc.setAttribute('label', text);
            this._toggleNotesBrdc.setAttribute('tooltiptext', text);
            this._toggleNotesBrdc.setAttribute('disabled', true);
            this._toggleNotesBrdc.setAttribute('hidden', true);
            this._toggleNotesBrdc.setAttribute('image', 'chrome://floatnotes/skin/note_dis_16.png');
            this._toggleNotesBrdc.setAttribute('class', 'hidden');
       }
        else {
            var text = Util.Locale.get('hideNotesString');
            this._toggleNotesBrdc.setAttribute('label', text);
            this._toggleNotesBrdc.setAttribute('tooltiptext', text);
            this._toggleNotesBrdc.setAttribute('disabled', false);
            this._toggleNotesBrdc.setAttribute('hidden', false);
            this._toggleNotesBrdc.setAttribute('image', 'chrome://floatnotes/skin/note_16.png');
            this._toggleNotesBrdc.setAttribute('class', '');
        }

    },

    _createNotesWith: function(dataSet) {
        var notes = [];
        for(var i = dataSet.length -1; i > -1; --i) {
            var data = dataSet[i];
            var note = this.notes[data.guid];
            if(typeof note === 'undefined') {
                this.notes[data.guid] = note = new FloatNote(data, this); LOG('Created first time: ' + data.guid);
            }
            else {
                note.update();
            }
            notes.push(note);
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
        IndicatorProxy.attachTo(this.currentDocument, this._container);
        this._attachScrollHandlerTo(this.currentDocument);
        Util.Dom.fireEvent(this.currentDocument, this.currentDocument, 'scroll');
    },

    _startScrollTimeout: function() {
        var that = this;
        this._scrollTimer.initWithCallback({notify: function(){
            that._updateAndShowIndicators();
        }}, Preferences.scrolltimer, this._scrollTimer.TYPE_ONE_SHOT);
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
        var note = this._newNote = new FloatNote(data, this);
        note.attachToDocument(this.currentDocument, this._container);
        note.raiseToTop();
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
                that._newNote = null;
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
    toggleNotes: function(element) {
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
        this._updateBroadcaster();
    },

    hideNotes: function() {
        var location = this.currentDocument.location;
        this._setNotesVisibilityForTo(location, false);
        Util.Css.hide(this._container);
        this._detachIndicators();
        this._updateBroadcaster();
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
        this._deleteMenuEntry.hidden = !this.contextNote || this._editNoteBrdc.hidden || !Preferences.showContextDelete;
        this._newMenuEntry.hidden = !!this.contextNote || this._editNoteBrdc.hidden || this._toggleNotesBrdc.hidden;
        this._hideMenuEntry.hidden = this._editNoteBrdc.hidden || !(this.currentNotes.length > 0)  || !Preferences.showContextHide;
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
            Shared.notemanager = window.openDialog('chrome://floatnotes/content/notelist.xul', 'FloatNotes', 'resizeable, centerscreen');
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
    noteIsEditing: function(value) {
        this._editNoteBrdc.setAttribute('disabled', value);
        this._editNoteBrdc.setAttribute('hidden', value);
    }
};

//!#endif
