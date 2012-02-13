//!#include "../header.js"

"use strict";

Cu['import']('resource://floatnotes/preferences.js');
Cu['import']('resource://floatnotes/NoteUI.js');

/*global Preferences: true, FloatNotesNoteUI: true */

var EXPORTED_SYMBOLS = ['FloatNotesInPageNoteUI'];

var ZINDEX = 100000;


function InPageNoteUI() {
    this.__super__.apply(this, arguments);
}

Util.Js.inherits(InPageNoteUI, FloatNotesNoteUI);

var FloatNotesInPageNoteUI = InPageNoteUI;

InPageNoteUI.prototype.elementNode_ = null;
InPageNoteUI.prototype.document_ = null;
InPageNoteUI.prototype.domElements_ = null;

InPageNoteUI.prototype.setText = function(text) {
    this.__super__.prototype.setText.call(this, text);
    if (this.domElements_ && this.domElements_.content) {
        this.domElements_.content.innerHTML = this.markdownParser_.makeHtml(text);
    }
};

InPageNoteUI.prototype.getElementNode = function() {
    return this.elementNode_;
};

InPageNoteUI.prototype.attachTo_ = function(document, container) {
    if (document) {
        if (this.domElements_ === null) {
            this.domElements_ = this.createDomElements_(document);
            this.elementNode_ = this.domElements_.container;
            if (this.noteData_.id) {
                this.elementNode_.id = 'floatnotes-note-' + this.noteData_.id;
            }
        }
        if (document !== this.document_) {
            LOG(this.getGuid() + ' adopted');
            this.elementNode_ = document.adoptNode(this.elementNode_);
            container = container || document.body;
            container.appendChild(this.elementNode_);
            this.document_ = document;
        }
        if (this.domElements_.content_frame.src !== 'floatnotes:blank') {
            this.domElements_.content_frame.src = 'floatnotes:blank';
        }
    }

};

InPageNoteUI.prototype.createDomElements_ = function(doc) {
    var container, drag, resize, content_frame, content, text, ifix, fixer, edit, del, menuspacer, menu;

    container = doc.createElement('div');
    container.className = 'floatnotes-note';

    drag = doc.createElement('div');
    drag.className = 'floatnotes-drag';
    drag.innerHTML = '<div class="floatnotes-drag-handler"></div>';

    menuspacer = doc.createElement('div');
    menuspacer.className = 'floatnotes-menuspacer';

    menu = doc.createElement('div');
    menu.className = 'floatnotes-menu';

    fixer = doc.createElement('span');
    fixer.className = 'floatnotes-togglefix floatnotes-menu-entry';
    fixer.title = Util.Locale.get('note.menu.pin');

    edit = doc.createElement('span');
    edit.className = 'floatnotes-edit floatnotes-menu-entry';
    edit.title = Util.Locale.get('note.menu.edit');

    del = doc.createElement('span');
    del.className = 'floatnotes-delete floatnotes-menu-entry';
    del.title = Util.Locale.get('note.menu.delete');
    del.innerHTML = '&#x2717;';

    content_frame = doc.createElement('iframe');
    content_frame.className = 'floatnotes-content';
    content_frame.src = 'floatnotes:blank';

    content = doc.createElement('div');
    content.className = 'floatnotes-content';

    resize = doc.createElement('div');
    resize.className = 'floatnotes-resize';

    text = doc.createElement('textarea');
    text.className = 'floatnotes-text';
    text.style.cssText = 'display: none;';
    text.rows = 1;
    text.cols = 1;

    ifix = doc.createElement('div');
    ifix.className = 'iframe-fix';

    var domElements = {
        container: container,
        drag: drag,
        resize: resize,
        content_frame: content_frame,
        content: content,
        text: text,
        fixer: fixer,
        ifix: ifix,
        edit: edit,
        del: del,
        menu: menu,
        menuspacer: menuspacer
    };

    drag = content = content_frame = ifix = resize = text = fixer = edit = del = menu = menuspacer = null;

    var attachEventHandlers = function(elements) {
        var fireEvent = Util.Dom.fireEvent,
            propEvent = Util.Dom.propagateEvent,
            frame = elements.content_frame,
            fire = function(event) {
                fireEvent(frame.ownerDocument, frame, event);
            };

        elements.content.addEventListener('dblclick', function(e) {
            fire('dblclick');
        }, true);

        elements.content.addEventListener('mousedown', function(e) {
            fire('mousedown');
        }, true);

        elements.content.addEventListener('mouseup', function(e) {
            fire('mouseup');
        }, true);

        //FIXME: Open new tab on middle click or ctrl/cmd + click
        elements.content.addEventListener('click', function(e) {
            if (e.target.nodeName === 'A') {
                e.preventDefault();
                frame.ownerDocument.defaultView.location = e.target.href;
            }
            fire('click');
        }, false);

        elements.text.addEventListener('click', function(e) {
            e.stopPropagation();
        }, false);

        elements.content_frame.addEventListener('load', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (this.src !== 'floatnotes:blank') {
                Util.Dialog.showTamperDetectionAlert();
                return;
            }
            var body = this.contentDocument.body;
            body.appendChild(elements.content);
            body.appendChild(elements.text);
            this.contentDocument.addEventListener('contextmenu', function(e) {
                e.stopPropagation();
                fire('contextmenu');
            }, true);
            if (elements.text.style.display === 'block') {
                elements.text.focus();
            }
            //this.removeEventListener('load', arguments.callee, false);
        }, false);
    };


    InPageNoteUI.prototype.createDomElements_ = function(doc) {
        var elements = domElements,
        newElements = {},
        container, menu;

        for (var name in elements) {
            newElements[name] = elements[name].cloneNode(name in {'drag': true, 'del': true});
        }

        container = newElements.container;
        menu = newElements.menu;

        menu.appendChild(newElements.fixer);
        menu.appendChild(newElements.edit);
        menu.appendChild(newElements.del);

        newElements.menuspacer.appendChild(menu);

        container.appendChild(newElements.drag);
        container.appendChild(newElements.menuspacer);
        container.appendChild(newElements.content_frame);
        container.appendChild(newElements.ifix);
        container.appendChild(newElements.resize);

        attachEventHandlers(newElements);

        return newElements;
    };

    return this.createDomElements_(doc);
};

InPageNoteUI.prototype.detach_ = function(document) {
    if (this.elementNode_ && (!document || document === this.document_)) {
        Util.Dom.detach(this.elementNode_);
        this.document_ = null;
    }
};

InPageNoteUI.prototype.redraw_ = function() {
    if (this.elementNode_) {
        this.updateDomElements_();
    }
};


InPageNoteUI.prototype.minimize = function() {
    LOG('Note minimized');
    Util.Css.addClass(this.elementNode_, 'small');
};

InPageNoteUI.prototype.unminimize = function() {
    Util.Css.removeClass(this.elementNode_, 'small');
};

InPageNoteUI.prototype.startEdit = function() {
    var textarea = this.domElements_.text,
    window = Util.Mozilla.getRecentWindow();

    // hide redndered text
    Util.Css.hide(this.domElements_.content);

    // update texarea with note text and focus it
    textarea.value = this.noteData_.content;
    Util.Css.show(textarea);
    textarea.focus();

    // set note state
    Util.Css.addClass(this.elementNode_, 'note-edit');
    this.setStatus(FloatNotesNoteUI.STATUS.EDITING);

    // listene for edit end
    Util.Js.addEventListener(window, 'keydown', this.endEdit, true, this);
    Util.Js.addEventListener(window, 'click', this.endEdit, false, this);
    Util.Mozilla.notifyObserver('floatnotes-note-edit', true);
};

InPageNoteUI.prototype.endEdit = function(e) {
    var finish = false,
    abort = false;

    if (e.type == 'keydown' && e.keyCode == e.DOM_VK_ESCAPE) { //escape was pressed
        finish = true;
        abort = true;
    }
    else if ((e.type == 'keydown' && e.keyCode == 13 && e.ctrlKey) || (e.type == 'click' && (e.button === undefined || e.button != 2))) {
        // If a context menu item is clicked, don't trigger end of edit
        var target = e.target;
        do {
            if (target.id == 'contentAreaContextMenu') {
                return true;
            }
        } while ((target = target.parentNode));

        this.setText(this.domElements_.text.value);
        this.unsetStatus(FloatNotesNoteUI.STATUS.EDITING);
        this.save();
        finish = true;
    }

    if (finish) {
        e.stopPropagation();
        e.preventDefault();

        var window = Util.Mozilla.getRecentWindow();
        Util.Js.removeEventListener(window, 'click', this.endEdit, false, this);
        Util.Js.removeEventListener(window, 'keydown', this.endEdit, true, this);

        Util.Css.show(this.domElements_.content);
        Util.Css.hide(this.domElements_.text);

        Util.Css.removeClass(this.elementNode_, 'note-edit');
        if (this.hasStatus(FloatNotesNoteUI.STATUS.EDITING)) {
            this.unsetStatus(FloatNotesNoteUI.STATUS.EDITING);
        }
        Util.Mozilla.notifyObserver('floatnotes-note-edit', false);

        // if the node was new and no text was entered, remove it
        if (abort && !this.noteData_.id && this.domElements_.text.value === '') {
            this.detach();
        }
    }
};

InPageNoteUI.prototype.startMove = function(e) {
    e.preventDefault();
    e.stopPropagation();

    var x = this.noteData_.x - e.pageX,
        y = this.noteData_.y - e.pageY;

    this.elementNode_.style.opacity = Preferences.draggingTransparency;

    this.setStatus(FloatNotesNoteUI.STATUS.DRAGGING);

    var window = Util.Mozilla.getRecentWindow();
    Util.Js.addEventListener(window, 'mouseup', this.endMove, true, this, [this.elementNode_.style.opacity || 1]);
    Util.Js.addEventListener(window,
                             'mousemove',
                             this.onMove, true,
                             this, [this.getWindow(), x, y, this.noteData_.w, this.noteData_.h, this.elementNode_.style, this.hasStatus(FloatNotesNoteUI.STATUS.FIXED)]);
};

InPageNoteUI.prototype.onMove = function(window, startX, startY, width, height, style, fix, e) {
    e.stopPropagation();
    e.preventDefault();

    var x = Math.max(startX + e.pageX, 0),
    y = Math.max(startY + e.pageY, 0);

    if (fix) {
        if (y + height > window.innerHeight) {
            y = window.innerHeight - height;
        }
        if (x + width > window.innerWidth) {
            x = window.innerWidth - width;
        }
    }

    style.left = x + 'px';
    style.top = y + 'px';
    Util.Dom.scrollWindow(e, window);
};



InPageNoteUI.prototype.endMove = function(opacity, e) {
    e.preventDefault();
    //e.stopPropagation();

    this.setStatus(FloatNotesNoteUI.STATUS.NEEDS_SAVE);
    this.unsetStatus(FloatNotesNoteUI.STATUS.DRAGGING);
    this.elementNode_.style.opacity = opacity;
    this.noteData_.x = parseInt(this.elementNode_.style.left, 10);
    this.noteData_.y = parseInt(this.elementNode_.style.top, 10);
    this.save();

    var window = Util.Mozilla.getRecentWindow();
    Util.Js.removeEventListener(window, 'mousemove', this.onMove, true, this);
    Util.Js.removeEventListener(window, 'mouseup', this.endMove, true, this);
    if (!Util.Css.isOrIsContained(e.target, 'floatnotes-note')) {
        this.mouseleave();
    }
    Util.Dom.fireEvent(this.getDocument(), this.elementNode_, 'mouseup');
};

InPageNoteUI.prototype.startResize = function(e) {
    e.preventDefault();
    e.stopPropagation();

    var width = this.noteData_.width - e.pageX,
    height = this.noteData_.height - e.pageY;

    this.elementNode_.style.opacity = Preferences.draggingTransparency;

    this.setStatus(FloatNotesNoteUI.STATUS.RESIZE);

    var window = Util.Mozilla.getRecentWindow();
    Util.Js.addEventListener(window, 'mouseup', this.endResize, true, this, [this.elementNode_.style.opacity || 1]);
    Util.Js.addEventListener(window,
                             'mousemove',
                             this.onResize, true,
                             this, [this.getWindow(), width, height, this.noteData_.x, this.noteData_.y, this.elementNode_.style, this.hasStatus(FloatNotesNoteUI.STATUS.FIXED)]);

};

InPageNoteUI.prototype.onResize = function(window, startWidth, startHeight, x, y, style, fix, e) {
    e.stopPropagation();
    e.preventDefault();

    var width = Math.max(startWidth + e.pageX, 0),
    height = Math.max(startHeight + e.pageY, 0);

    if (fix) {
        if (y + height > window.innerHeight) {
            height = window.innerHeight - y;
        }
        if (x + width > window.innerWidth) {
            width = window.innerWidth - x;
        }
    }

    style.width = width + 'px';
    style.height = height + 'px';
    Util.Dom.scrollWindow(e, window);
};

InPageNoteUI.prototype.endResize = function(opacity, e) {
    e.preventDefault();
    e.stopPropagation();

    var style = this.elementNode_.style;

    this.setStatus(FloatNotesNoteUI.STATUS.NEEDS_SAVE);
    this.unsetStatus(FloatNotesNoteUI.STATUS.RESIZING);

    style.opacity = opacity;
    this.noteData_.w = style.width = Math.max(parseInt(style.width, 10) , 60);
    this.noteData_.h = style.height = Math.max(parseInt(style.height, 10), 80);
    this.save();

    var window = Util.Mozilla.getRecentWindow();
    Util.Js.removeEventListener(window, 'mousemove', this.onResize, true, this);
    Util.Js.removeEventListener(window, 'mouseup', this.endResize, true, this);
    if (!Util.Css.isOrIsContained(e.target, 'floatnotes-note')) {
        this.mouseleave();
    }
    Util.Dom.fireEvent(this.getDocument(), this.elementNode_, 'mouseup');
};

InPageNoteUI.prototype.onAfterSave_ = function(id, guid) {
    if (id > -1) {
        this.elementNode_.id = 'floatnotes-note-' + id;
        this.elementNode_.setAttribute('rel', guid);
    }
    this.domElements_.content.title = Util.Locale.get('note.last_modified', [this.noteData_.modification_date.toLocaleString()]);
};

InPageNoteUI.prototype.fix = function() {
    Util.Css.addClass(this.elementNode_, 'fixed');
};

InPageNoteUI.prototype.unfix = function() {
    Util.Css.removeClass(this.elementNode_, 'fixed');
};

InPageNoteUI.prototype.calculateNewPosition_ = function() {
    var newTop, newLeft,
    win = this.getWindow(),
    style = this.elementNode_.style;

    if (this.hasStatus(FloatNotesNoteUI.STATUS.FIXED)) {
        newTop = (this.noteData_.y - win.pageYOffset);
        newLeft = (this.noteData_.x - win.pageXOffset);
    }
    else {
        newTop = (this.noteData_.y + win.pageYOffset);
        newLeft = (this.noteData_.x + win.pageXOffset);
    }

    AF(isNaN(newTop), 'New top is a valid number');
    AF(isNaN(newLeft), 'New left is a valid number');

    style.top = newTop + 'px';
    style.left = newLeft + 'px';

    return {x: newLeft, y: newTop};
};

InPageNoteUI.prototype.mouseenter = function() {
    var elements = this.domElements_;

    if (this.hasStatus(FloatNotesNoteUI.STATUS.MINIMIZED)) {
        this.unminimize();
    }

    Util.Css.show(elements.drag, elements.resize, elements.menuspacer);
};

InPageNoteUI.prototype.mouseleave = function() {
    var elements = this.domElements_;

    Util.Css.hide(elements.drag, elements.resize, elements.menuspacer);

    if (this.hasStatus(FloatNotesNoteUI.STATUS.MINIMIZED)) {
        this.minimize();
    }
};

InPageNoteUI.prototype.raiseToTop  = function(e) {
    var element = this.style ? this : this.elementNode_,
    maxz = +element.style.zIndex,
    siblings = element.parentNode.childNodes,
    t, sibling;

    AT(element, 'Element does exist');

    for (var i = siblings.length; i--;) {
        t = 0;
        sibling = siblings[i];
        if (siblings && sibling.style) {
            t = +sibling.style.zIndex;
        }
        maxz = t > maxz ? t : maxz;
    }
    Util.Css.css(element, 'zIndex', maxz + 1);
};


InPageNoteUI.prototype.updateDomElements_ = function() {
    var elements = this.domElements_;
    elements.container.setAttribute('rel', (this.noteData_.guid || 'new'));
    elements.container.style.cssText = [
        'background-color:' + this.noteData_.color,
        'left:' + this.noteData_.x + 'px',
        'top:' + this.noteData_.y + 'px',
        'width:' + this.noteData_.w + 'px',
        'height:' + this.noteData_.h + 'px',
        'z-index:' + ZINDEX,
        'opacity:' + Preferences.transparency,
        'font-size:' + Preferences.fontSize + 'px'
    ].join(';');
    elements.content.style.fontSize = Preferences.fontSize + 'px';
    elements.text.style.fontSize = Preferences.fontSize + 'px';
    elements.content.innerHTML = this.markdownParser_.makeHtml(this.noteData_.content);
    elements.content.title = Util.Locale.get('note.last_modified', [this.noteData_.modification_date.toLocaleString()]);
    elements.menu.style.backgroundColor = this.noteData_.color;

    var darkColor = Util.Css.isDarkColor(this.noteData_.color);
    Util.Css.toggleClass(elements.content, 'dark', darkColor);
    Util.Css.toggleClass(elements.text, 'dark', darkColor);
    Util.Css.toggleClass(elements.container, 'dark', darkColor);
};

InPageNoteUI.prototype.isValid = function() {
    if (this.domElements_) {
        return this.domElements_.content_frame.src === 'floatnotes:blank';
    }
    return false;
};
