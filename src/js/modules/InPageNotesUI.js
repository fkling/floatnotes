//!#include "../header.js"

Cu.import("resource://floatnotes/ContainerUIAPI.js");
Cu.import("resource://floatnotes/InPageNoteUI.js");
Cu.import("resource://floatnotes/InPageIndicator.js");

EXPORTED_SYMBOLS = ["InPageNotesUI"];


function InPageNotesUI() {
    this._currentNotes = {};
    this._newNote = undefined;
    this._currentNotesLength = 0;
    Util.Mozilla.registerObserver(this, 'floatnotes-note-edit');
}

InPageNotesUI.prototype =  (function() {
    
    var _noteEditing = "false";

    IndicatorProxy.init();

    function createContainer(document) {
        var container = document.createElement('div'),
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
            }
            var guid = noteNode.getAttribute('rel');
            return  that._notes[guid] || that._newNote;
        }

        container.addEventListener('click', function(e) {
            //LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
            var target = e.target;
            if(!ic(target, 'floatnotes-indicator')) {
                var note = getNote(target);
                if(_noteEditing && _noteEditing !== "false") {
                    e.stopPropagation();
                }
                else if(hcl(target, 'floatnotes-togglefix')) {
                    e.stopPropagation();
                    e.preventDefault();
                    note.toggleFix(e);
                }
                else if(hcl(target, 'floatnotes-delete')) {
                    that._mainUI.deleteNote(note.data);
                }
                else if(hcl(target, 'floatnotes-edit')) {
                    that._mainUI.openEditPopup(note, target, function(color, url) {
                        note.url = url || note.url;
                        note.color = color || note.color;
                        note.save();
                        note.updateUI();
                        edit_open = false;
                        note.mouseleave();
                    });
                    edit_open = true;
                }
                else if(ic(target, 'floatnotes-content') || hcl(target, 'floatnotes-note')) {
                    note.unminimizeAndSave();
                }
            }
        }, true);

        container.addEventListener('dblclick', function(e) {
            //LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
                var target = e.target;
            if(hcl(target, 'floatnotes-drag-handler') || hcl(target, 'floatnotes-drag')) {
                e.stopPropagation();
                var note = getNote(target);
                note.minimizeAndSave();
            }
            else if(hcl(target, 'floatnotes-content') || (ha(target, 'floatnotes-content') && target.nodeName.toLowerCase() !== 'a')) {
                e.stopPropagation();
                var note =  getNote(target);
                if(!note.isValid()) {
                    Util.Dialog.showTamperDetectionAlert();
                    return;
                }
                note.edit();
            }
        }, true);

        container.addEventListener('mouseover', function(e) {
            //LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
                if(!(moving || resizing || edit_open)) {
                    e.stopPropagation();
                    var note = getNote(e.target);
                    note.mouseenter(); 
                }
        }, false);

        container.addEventListener('mouseout', function(e) {
            //LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
                if(!(moving || resizing || edit_open)) {
                    e.stopPropagation();
                    var note = getNote(e.target);
                    note.mouseleave();
                }
        }, false);

        container.addEventListener('mousedown', function(e) {
            //LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
                var target = e.target;
            if(!ic(target, 'floatnotes-indicator')) {
                var note = getNote(target);
                note.raiseToTop();
                if(hcl(target, 'floatnotes-drag-handler') || hcl(target, 'floatnotes-drag') || hcl(target, 'floatnotes-resize')) {
                    Util.Css.addClass(container, 'overlay');
                    Util.Css.addClass(container, 'moving');
                    container.style.width = document.body.clientWidth + "px";
                    container.style.height = document.body.clientHeight + "px";
                    if(hcl(target, 'floatnotes-resize')) {
                        resizing = true;
                        note.resize(e);
                    }
                    else {
                        moving = true;
                        note.move(e);
                    }
                }
            }
        }, true);

        container.addEventListener('mouseup', function(e) {
            //LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
                moving = moving ? false : moving;
            resizing = resizing ? false : resizing;
            Util.Css.removeClass(container, 'moving');
            Util.Css.removeClass(container, 'overlay');
            container.style.width = "0px";
            container.style.height = "0px";
        }, true);

        container.addEventListener('contextmenu', function(e) {
            var note = getNote(e.target);
            if(note) {
                that._mainUI.contextNote = note.data;
            }
        }, true);

        return container;
    }

    function setNotePositions(window, notes) {
        var wintop = +window.pageYOffset,
            winheight = +window.innerHeight;
        AF(isNaN(wintop), "Window top is a proper number")
        AF(isNaN(wintop), "Window height is a proper number")
        var result = [];
        for(var i in notes) {
            var note = notes[i];
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
                result.push(note);
            }
        }
        return result;
    }



    var public = {

        __proto__: ContainerUIAPI,
        _noteUICls: InPageNoteUI,

        /************ start getter ***************/

        get _container() {
            var container_id = 'floatnotes-container',
            document = this._mainUI.currentDocument,
            container = document.getElementById(container_id);

            if(!container && document) {
                container = createContainer.call(this, document);
                container.id = container_id;
                //container.style.zIndex = Util.Css.findHighestZIndex(this.currentDocument, 'div');
                document.body.parentNode.appendChild(container);
                
            }
            return container;
        },

        /************ end getter ***************/

        // get notfied if a note gets edited
        observe: function(subject, topic, value) {
            if(topic === "floatnotes-note-edit") {
                _noteEditing = value;
            }
        },
        setNotes: function(notes) {
            ContainerUIAPI.setNotes.call(this, notes);
            IndicatorProxy.view = this;
            IndicatorProxy.attachTo(this._mainUI.currentDocument, this._container);
        },
        showNotes: function() {
            this._container.style.display = "";
        },
        hideNotes: function() {
            this._container.style.display = "none";
        },
        updateUI: function(){
            LOG('UI is updates')
            var notes = setNotePositions(this._mainUI.currentDocument.defaultView, this._currentNotes);
            IndicatorProxy.updateUI();
            IndicatorProxy.updateAndShow(this._mainUI.currentDocument, notes);
        },
        focusNote: function(noteId) {
            var note = this._currentNotes[noteId];
            if(note) {
                note.dom.scrollIntoView(true);
            } 
        }
    }

    return public;

}());
