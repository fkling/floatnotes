//!#include "../header.js"
/*global Util, LOG, Cu*/
"use strict";

Cu['import']('resource://floatnotes/preferences.js');
Cu['import']('resource://floatnotes/NoteUI.js');

/*global FloatNotesPreferences: true, FloatNotesNoteUI: true */

var EXPORTED_SYMBOLS = ['FloatNotesInPageNoteUI'];

var ZINDEX = 100000;
var NOTE_OFFSET = 22;
var MIN_NOTE_WIDTH = 120;
var MIN_NOTE_HEIGHT = 120;


function InPageNoteUI() {
  this.__super__.apply(this, arguments);
}

Util.Js.inherits(InPageNoteUI, FloatNotesNoteUI);

var FloatNotesInPageNoteUI = InPageNoteUI;

InPageNoteUI.prototype._elementNode = null;
InPageNoteUI.prototype._domElements = null;

InPageNoteUI.createInstance = function(note_data, container, document) {
  return new InPageNoteUI(note_data, container, document);
};

InPageNoteUI.prototype.setText = function(text) {
  this.__super__.prototype.setText.call(this, text);
  if (this._domElements && this._domElements.content) {
    this._setText(text);
  }
};

InPageNoteUI.prototype._setText = function(text) {
  this._domElements.content.innerHTML = this._markdownParser.makeHtml(text);
  var tmp = this._document.createElement('div');
  tmp.innerHTML = this._markdownParser.makeHtml(text);
  var links = tmp.getElementsByTagName('a');
  for (var i = 0, l = links.length; i < l; i++) {
    var link = links[i];
    if (link.getAttribute('href').indexOf('#') !== 1) {
      link.target = '_top';
    }
  }
  var target = this._domElements.content;
  var nodes = Array.prototype.slice.call(tmp.childNodes);
  Util.Dom.removeChildren(target);
  for (i = 0, l = nodes.length; i < l; i++) {
    target.appendChild(nodes[i]);
  }
  tmp = null;
};


InPageNoteUI.prototype.getElementNode = function() {
  return this._elementNode;
};

InPageNoteUI.prototype._attachTo = function(container) {
  this._containerElementNode = container;
  if (this._document) {
    if (this._domElements === null) {
      this._domElements = this._createDomElements(this._document);
      this._elementNode = this._domElements.container;
    }
    container.appendChild(this._elementNode);
    if (this._domElements.frame.src !== 'floatnotes:blank') {
      this._domElements.frame.src = 'floatnotes:blank';
    }
  }
};

InPageNoteUI.prototype._createDomElements = function(doc) {
  // Main container, added to web page. Contains drag handler, resize handler
  // and inner container
  var outer_container = doc.createElement('div');
  Util.Css.addClass(outer_container, Util.Css.name('note'));

  // iframe
  var frame = doc.createElement('iframe');
  Util.Css.addClass(frame, Util.Css.name('frame'));

  // Inner container, contains the note text, menu and textarea
  var inner_container = doc.createElement('div');
  inner_container.className = 'note';

  // Drag handler
  var drag = doc.createElement('div');
  drag.className = Util.Css.name('drag');
  drag.innerHTML = '<div class="' + Util.Css.name('drag-handler') + '"></div>';

  // Resize handler
  var resize = doc.createElement('div');
  resize.className = Util.Css.name('resize');

  // Menu
  var menu = doc.createElement('div');
  menu.className = 'menu';

  var pin_menu_item = doc.createElement('span');
  pin_menu_item.className = 'menu-item pushpin glyphicons';
  pin_menu_item.title = Util.Locale.get('note.menu.pin');
  pin_menu_item.appendChild(doc.createElement('i'));

  var edit_menu_item = doc.createElement('span');
  edit_menu_item.className = 'menu-item cogwheel glyphicons';
  edit_menu_item.title = Util.Locale.get('note.menu.edit');
  edit_menu_item.appendChild(doc.createElement('i'));

  var delete_menu_item = doc.createElement('span');
  delete_menu_item.className = 'menu-item remove_2 glyphicons';
  delete_menu_item.title = Util.Locale.get('note.menu.delete');
  delete_menu_item.appendChild(doc.createElement('i'));

  // Contains the note text
  var content = doc.createElement('div');
  content.className = 'content';

  // Textarea
  var text = doc.createElement('textarea');
  text.rows = 1;
  text.cols = 1;

  // While dragging, this element overlays the iframe to prevent the event
  // from breaking
  var iframe_fix = doc.createElement('div');
  iframe_fix.className = Util.Css.name('iframe-fix');

  // Combine elements

  menu.appendChild(pin_menu_item);
  menu.appendChild(edit_menu_item);
  menu.appendChild(delete_menu_item);

  inner_container.appendChild(menu);
  inner_container.appendChild(content);
  inner_container.appendChild(text);

  outer_container.appendChild(drag);
  outer_container.appendChild(frame);
  outer_container.appendChild(iframe_fix);
  outer_container.appendChild(resize);

 var domElements = {
    container: outer_container,
    drag: drag,
    resize: resize,
    iframe_fix: iframe_fix,
    inner_container: inner_container,
    frame: frame,
    menu: menu,
    pin_menu_item: pin_menu_item,
    edit_menu_item: edit_menu_item,
    delete_menu_item: delete_menu_item,
    content: content,
    text: text
  };

  this._attachEventHandlers(domElements);

  return domElements;
};

InPageNoteUI.prototype._attachEventHandlers = function(elements) {
  var fireEvent = Util.Dom.fireEvent;
  var frame = elements.frame;
  var fire = function(event) {
    fireEvent(frame.ownerDocument, frame, event);
  };

  var event_handlers = [];
  // Handle and propagate events
  event_handlers.push(Util.Js.addEventListener(
    elements.content,
    'dblclick',
    function() {
      if (!this.isValid()) {
        Util.Dialog.showTamperDetectionAlert();
        return;
      }
      this.startEdit();
    }.bind(this),
    true
  ));

  event_handlers.push(Util.Js.addEventListener(
    elements.content,
    'mousedown',
    this.raiseToTop.bind(this),
    true
  ));

  event_handlers.push(Util.Js.addEventListener(
    elements.content,
    'mouseup',
    fire.bind(null, 'mouseup'),
    true
  ));

  event_handlers.push(Util.Js.addEventListener(
    elements.content,
    'click',
    function(e) {
      if (e.target.nodeName !== 'A') {
        this.unminimizeAndSave();
      }
    }.bind(this),
    true
  ));

  event_handlers.push(Util.Js.addEventListener(
    elements.pin_menu_item,
    'click',
    this.toggleFix.bind(this),
    false
  ));

  event_handlers.push(Util.Js.addEventListener(
    elements.delete_menu_item,
    'click',
    this.del.bind(this),
    false
  ));

  event_handlers.push(Util.Js.addEventListener(
    elements.edit_menu_item,
    'click',
    function(event) {
      this._editPopupOpen = true;
      this._container.openEditPopup(this, event.target, function(color, url) {
        this._editPopupOpen = false;
        if (url) {
          this.setUrl(url);
        }
        if (color) {
          this.setColor(color);
        }
        this.save();
        if (!this.hasStatus(FloatNotesNoteUI.STATUS.OVER)) {
          this.mouseleave();
        }
      }.bind(this));
    }.bind(this),
    false
  ));

  var self = this;

  frame.addEventListener('load', function handler(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.src !== 'floatnotes:blank') {
      Util.Dialog.showTamperDetectionAlert();
      return;
    }
    this.contentDocument.body.appendChild(elements.inner_container);
    this.contentDocument.addEventListener('contextmenu', function(e) {
      e.stopPropagation();
      fire('contextmenu');
    }, true);
    // If the texarea is visible, this will give it focus
    elements.text.focus();
  }, false);

  // cleanup
  this._removeEventHandlers = function() {
    event_handlers.forEach(function(remove) { remove();});
    elements = frame = event_handlers = fire = null;
  };
};

InPageNoteUI.prototype._detach = function() {
  if (this._elementNode) {
    // if in edit mode, finish edit mode first
    if (this.hasStatus(FloatNotesNoteUI.STATUS.EDITING)) {
      this.endEdit(false);
    }
    Util.Dom.detach(this._elementNode);
    this._document = null;
    this._container = null;
    // remove all iframe event handlers
    this._removeEventHandlers();
  }
};

InPageNoteUI.prototype._update = function() {
  if (this._elementNode) {
    this._updateDOMElements();
  }
};

InPageNoteUI.prototype.minimize = function() {
  LOG('Note minimized');
  Util.Css.addClass(this._elementNode, Util.Css.name('small'));
  Util.Css.css(this._elementNode, 'backgroundColor', this._noteData.color);
};

InPageNoteUI.prototype.unminimize = function() {
  Util.Css.removeClass(this._elementNode, Util.Css.name('small'));
  Util.Css.css(this._elementNode, 'backgroundColor', 'transparent');
};

InPageNoteUI.prototype.startEdit = function() {
  var textarea = this._domElements.text;
  var window = Util.Mozilla.getRecentWindow();


  // set note state
  Util.Css.addClass(this._elementNode, Util.Css.name('edit'));
  Util.Css.addClass(this._domElements.inner_container, 'edit');
  this.setStatus(FloatNotesNoteUI.STATUS.EDITING);
  // since menu is hidden we have to adjust the size of the note again
  this._elementNode.style.width = this._noteData.w + 'px';

  // update texarea with note text and focus it
  textarea.value = this._noteData.content;
  textarea.focus();

  // listen for edit end
  var event_handlers = [
    Util.Js.addEventListener(window, 'keydown', this.endEdit.bind(this), true),
    Util.Js.addEventListener(window, 'mouseup', this.endEdit.bind(this), true)
  ];
  this._removeEditHandlers = function() {
    event_handlers.forEach(function(remove) { remove(); });
  };
  Util.Mozilla.notifyObserver('floatnotes-note-edit', true);
};

InPageNoteUI.prototype.endEdit = function(e) {
  var finish = false;
  var abort = false;

  if (e === false) { // force abort
    finish = true;
    abort = true;
  }
  else if (e.type === 'keydown' &&
      e.keyCode === e.DOM_VK_ESCAPE) { //escape was pressed
    finish = true;
    abort = true;
  }
  else if ((e.type === 'keydown' && e.keyCode === 13 && e.ctrlKey) ||
           (e.type === 'mouseup' && (e.button === undefined || e.button !== 2))) {

    // Handle some mouse event targets separately
    if (e.type === 'mouseup') {
      var target = e.target;
      // don't end edit if note is moved or resized or click was inside textarea
      if (target === this._domElements.text ||
        this.hasStatus(FloatNotesNoteUI.STATUS.DRAGGING) ||
        this.hasStatus(FloatNotesNoteUI.STATUS.RESIZING)) {
          return true;
      }

      // If a context menu item is clicked, don't trigger end of edit
      do {
        if (target.id === 'contentAreaContextMenu') {
          return true;
        }
      } while ((target = target.parentNode));
    }

    finish = true;
  }

  if (finish) {
    LOG('end edit');
    var text = this._domElements.text.value;

    // Don't do anything if text didn't change
    if (this._noteData.content === text) {
      abort = true;
    }

    if (!abort) {
      this.setText(text);
      this.unsetStatus(FloatNotesNoteUI.STATUS.EDITING);
      this.save();
    }
    this._removeEditHandlers();

    Util.Css.removeClass(this._elementNode, Util.Css.name('edit'));
    Util.Css.removeClass(this._domElements.inner_container, 'edit');
    // If the mouse is still over the note, we have to increase the width again
    if (Util.Css.hasClass(this._elementNode, Util.Css.name('over'))) {
      this._elementNode.style.width = this._noteData.w + NOTE_OFFSET + 'px';
    }
    this.unsetStatus(FloatNotesNoteUI.STATUS.EDITING);
    Util.Mozilla.notifyObserver('floatnotes-note-edit', false);

    // if the node was new and no text was entered, remove it
    if (abort && !this._noteData.id) {
      this.detach();
    }
  }
};


InPageNoteUI.prototype.startMove = function(e) {
  e.preventDefault();
  e.stopPropagation();

  var x = this._noteData.x - e.pageX;
  var y = this._noteData.y - e.pageY;
  var opacity = this._elementNode.style.opacity || 1;

  this._elementNode.style.opacity = FloatNotesPreferences.draggingTransparency;
  this.setStatus(FloatNotesNoteUI.STATUS.DRAGGING);
  Util.Css.addClass(this._elementNode, Util.Css.name('ifix'));

  var window = Util.Mozilla.getRecentWindow();
  var event_handlers = [
    Util.Js.addEventListener(
      window,
      'mouseup',
      this.endMove.bind(this, opacity),
      false
    ),
    Util.Js.addEventListener(
      window,
      'mousemove',
      this.onMove.bind(
        this,
        this.getWindow(),
        x,
        y,
        this._noteData.w,
        this._noteData.h,
        this._elementNode.style,
        this.hasStatus(FloatNotesNoteUI.STATUS.FIXED)
      ),
      true
    )
  ];
  this._removeMoveHandlers = function() {
    event_handlers.forEach(function(remove) { remove();});
  };
};


InPageNoteUI.prototype.onMove = function(
  window,
  startX,
  startY,
  width,
  height,
  style,
  fix,
  e) {
  e.stopPropagation();
  e.preventDefault();

  var x = Math.max(startX + e.pageX, 0);
  var y = Math.max(startY + e.pageY, 0);

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
  if (!fix) {
    Util.Dom.scrollWindow(e, window);
  }
};


InPageNoteUI.prototype.endMove = function(opacity, e) {
  e.preventDefault();

  this.setStatus(FloatNotesNoteUI.STATUS.NEEDS_SAVE);
  this.unsetStatus(FloatNotesNoteUI.STATUS.DRAGGING);
  Util.Css.removeClass(this._elementNode, Util.Css.name('ifix'));

  this._elementNode.style.opacity = opacity;
  this._noteData.x = parseInt(this._elementNode.style.left, 10);
  this._noteData.y = parseInt(this._elementNode.style.top, 10);
  this.save();

  this._removeMoveHandlers();
  if (!Util.Css.isOrIsContained(e.target, Util.Css.name('note'))) {
    this.mouseleave();
  }
  if (!Util.Dom.contains(this._containerElementNode, e.target)) {
    Util.Dom.fireEvent(this.getDocument(), this._elementNode, 'mouseup');
  }
};


InPageNoteUI.prototype.startResize = function(e) {
  e.preventDefault();
  e.stopPropagation();

  var width = this._noteData.w - e.pageX;
  var height = this._noteData.h - e.pageY;
  var opacity = this._elementNode.style.opacity || 1;

  this._elementNode.style.opacity = FloatNotesPreferences.draggingTransparency;

  this.setStatus(FloatNotesNoteUI.STATUS.RESIZING);

  // if we are not editing, we have to adjust the width
  if (!this.hasStatus(FloatNotesNoteUI.STATUS.EDITING)) {
    width += NOTE_OFFSET;
  }

  Util.Css.addClass(this._elementNode, Util.Css.name('ifix'));
  var window = this.getWindow();
  var event_handlers = [
    Util.Js.addEventListener(
      window,
      'mouseup',
      this.endResize.bind(this, opacity),
      false
    ),
    Util.Js.addEventListener(
      window,
      'mousemove',
      this.onResize.bind(
        this,
        this.getWindow(),
        width,
        height,
        this._noteData.x,
        this._noteData.y,
        this._elementNode.style,
        this.hasStatus(FloatNotesNoteUI.STATUS.FIXED)
      ),
      true
    )
  ];
  this._removeResizeHandlers = function() {
    event_handlers.forEach(function(remove) { remove(); });
  };
};

InPageNoteUI.prototype.onResize = function(
  window,
  startWidth,
  startHeight,
  x,
  y,
  style,
  fix,
  e) {
  LOG('onResize');
  e.stopPropagation();
  e.preventDefault();

  var width = Math.max(startWidth + e.pageX, MIN_NOTE_WIDTH + NOTE_OFFSET);
  var height = Math.max(startHeight + e.pageY, MIN_NOTE_HEIGHT);

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
  if(!fix) {
    Util.Dom.scrollWindow(e, window);
  }
};

InPageNoteUI.prototype.endResize = function(opacity, e) {
  LOG('EndResize');
  e.preventDefault();

  var style = this._elementNode.style;

  this.setStatus(FloatNotesNoteUI.STATUS.NEEDS_SAVE);
  this.unsetStatus(FloatNotesNoteUI.STATUS.RESIZING);
  Util.Css.removeClass(this._elementNode, Util.Css.name('ifix'));

  style.opacity = opacity;
  var width = parseInt(style.width, 10);
  // -NOTE_OFFSET to compensate hovering
  if (!this.hasStatus(FloatNotesNoteUI.STATUS.EDITING)) {
    width -= NOTE_OFFSET;
  }
  this._noteData.w = Math.max(width, 60);
  this._noteData.h = Math.max(parseInt(style.height, 10), 80);
  this.save();

  this._removeResizeHandlers();
  if (!Util.Css.isOrIsContained(e.target, Util.Css.name('note'))) {
    this.mouseleave();
  }
  if (!Util.Dom.contains(this._containerElementNode, e.target)) {
    Util.Dom.fireEvent(this.getDocument(), this._elementNode, 'mouseup');
  }
};

InPageNoteUI.prototype.save = function() {
  this.__super__.prototype.save.call(this).then(function(result) {
    LOG('Note UI' + result);
    if (result['new']) {
      this._elementNode.id = Util.Css.name('note-' + result.noteData.id);
      this._elementNode.setAttribute('rel', result.noteData.guid);
      if(!this._noteData.id) {
        this._noteData.id = result.noteData.id;
      }
    }
    this._setTitle(result.noteData.modification_date);
  }.bind(this));
};

InPageNoteUI.prototype.fix = function() {
  Util.Css.addClass(this._elementNode, Util.Css.name('fixed'));
  Util.Css.addClass(this._domElements.inner_container, 'fixed');
};

InPageNoteUI.prototype.unfix = function() {
  Util.Css.removeClass(this._elementNode, Util.Css.name('fixed'));
  Util.Css.removeClass(this._domElements.inner_container, 'fixed');
};

InPageNoteUI.prototype.calculateNewPosition_ = function() {
  var newTop, newLeft,
  win = this.getWindow(),
  style = this._elementNode.style;

  if (this.hasStatus(FloatNotesNoteUI.STATUS.FIXED)) {
    newTop = (this._noteData.y - win.pageYOffset);
    newLeft = (this._noteData.x - win.pageXOffset);
  }
  else {
    newTop = (this._noteData.y + win.pageYOffset);
    newLeft = (this._noteData.x + win.pageXOffset);
  }

  style.top = newTop + 'px';
  style.left = newLeft + 'px';

  return {x: newLeft, y: newTop};
};

InPageNoteUI.prototype.mouseenter = function() {
  LOG('mouseenter');
  this.setStatus(FloatNotesNoteUI.STATUS.OVER);
  if (this._editPopupOpen) {
    return;
  }
  var elements = this._domElements;

  if (this.hasStatus(FloatNotesNoteUI.STATUS.MINIMIZED)) {
    this.unminimize();
  }
  Util.Css.addClass(this._elementNode, Util.Css.name('over'));
  Util.Css.addClass(this._domElements.inner_container, 'over');
  if (!this.hasStatus(FloatNotesNoteUI.STATUS.EDITING)) {
    this._elementNode.style.width = (this._noteData.w + NOTE_OFFSET) + 'px';
  }

  Util.Css.show(elements.drag, elements.resize);
};

InPageNoteUI.prototype.mouseleave = function() {
  LOG('mouseleave');
  this.unsetStatus(FloatNotesNoteUI.STATUS.OVER);
  if (!this._editPopupOpen) {
    var elements = this._domElements;

    Util.Css.hide(elements.drag, elements.resize);
    Util.Css.removeClass(this._elementNode, Util.Css.name('over'));
    Util.Css.removeClass(this._domElements.inner_container, 'over');
    if (!this.hasStatus(FloatNotesNoteUI.STATUS.EDITING)) {
      this._elementNode.style.width = this._noteData.w + 'px';
    }

    if (this.hasStatus(FloatNotesNoteUI.STATUS.MINIMIZED)) {
      this.minimize();
    }
  }
};

InPageNoteUI.prototype.raiseToTop  = function() {
  var element = this.style ? this : this._elementNode,
  maxz = +element.style.zIndex,
  siblings = element.parentNode.childNodes,
  t, sibling;

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


/**
 * @override
 */
InPageNoteUI.prototype.setColor = function(color) {
  this.__super__.prototype.setColor.call(this, color);
  this._setColor(color);
};

InPageNoteUI.prototype._setColor = function(color) {
  var elements = this._domElements;
  Util.Css.css(elements.menu, 'backgroundColor', color);
  Util.Css.css(elements.drag, 'backgroundColor', color);
  Util.Css.css(elements.inner_container, 'backgroundColor', color);
  var darkColor = Util.Css.isDarkColor(color);
  Util.Css.toggleClass(elements.inner_container, 'dark', darkColor);
  Util.Css.toggleClass(elements.container, Util.Css.name('dark'), darkColor);
};


InPageNoteUI.prototype._setTitle = function(date) {
  this._domElements.content.title = Util.Locale.get(
    'note.last_modified',
    [date.toLocaleString()]
  );
};


InPageNoteUI.prototype._updateDOMElements = function() {
  LOG('Update note UI');
  var elements = this._domElements;
  elements.container.setAttribute('rel', (this._noteData.guid || 'new'));
  var width = this.hasStatus(FloatNotesNoteUI.STATUS.OVER) ?
    this._noteData.w + NOTE_OFFSET :
    this._noteData.w;

  elements.container.style.cssText = [
    'left:' + this._noteData.x + 'px',
    'top:' + this._noteData.y + 'px',
    'width:' + width + 'px',
    'height:' + this._noteData.h + 'px',
    'z-index:' + ZINDEX,
    'opacity:' + FloatNotesPreferences.transparency
  ].join(';');

  Util.Css.css(elements.inner_container, {
    fontSize: FloatNotesPreferences.fontSize + 'px'
  });

  this._setText(this._noteData.content);
  this._setColor(this._noteData.color);
  this._setTitle(this._noteData.modification_date);

  // set meta data
  this._elementNode.setAttribute('data-ref', this.getRef());
  if (this._noteData.id) {
    this._elementNode.id = Util.Css.name('note-' + this._noteData.id);
  }
};

InPageNoteUI.prototype.isValid = function() {
  if (this._domElements) {
    return this._domElements.frame.src === 'floatnotes:blank';
  }
  return false;
};
