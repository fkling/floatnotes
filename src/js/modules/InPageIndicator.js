//!#include "../header.js"
/*global Util, LOG, Cu*/
"use strict";

Cu['import']("resource://floatnotes/preferences.js");
Cu['import']("resource://gre/modules/PluralForm.jsm");
/*global FloatNotesPreferences, PluralForm*/


var EXPORTED_SYMBOLS = ["FloatNotesInPageIndicator"];

function Indicator(id, proxy, notes_container) {
    this._proxy = proxy;
    this._id = id;
    this._domElements = {};
    this._notesContainer = notes_container;
}

Indicator.prototype._proxy = null;
Indicator.prototype._label = '';
Indicator.prototype._domElements = null;
Indicator.prototype._invalid = true;
Indicator.prototype._lastCount = -1;


Indicator.prototype.invalidate = function() {
  this._invalid = true;
};

Indicator.prototype.setLabel = function(label) {
    this._label = label;
};

Indicator.prototype._updateLabel = function(nn_notes) {
  this._domElements.label.innerHTML = [
    nn_notes,
    PluralForm.get(nn_notes, Util.Locale.get('indicatorNote')),
    this._label
  ].join(' ');
};

Indicator.prototype.show = function() {
  if (this._lastCount > 0) {
    Util.Css.show(this._domElements.indicator);
  }
};

Indicator.prototype.attachTo = function(container) {
  var indicator = container.getElementsByClassName(this._id)[0];
  if (indicator) {
    this._domElements.indicator = indicator;
    this._domElements.label =
      indicator.getElementsByClassName(Util.Css.name('indicator-label'))[0];
    this._domElements.list =
      indicator.getElementsByClassName(Util.Css.name('indicator-container'))[0];
  }
  else {
    this._createDOMElements(container);
  }
  Util.Css.hide(this._domElements.indicator);
};

Indicator.prototype.detach = function() {
  if(this._domElements.indicator) {
    Util.Dom.detach(this._domElements.indicator);
  }
};

Indicator.prototype.showList = function() {
  Util.Css.show(this._domElements.list);
};

Indicator.prototype.buildList = function(notes) {
  if (this._invalid || this._lastCount !== notes.length) {
    LOG(notes.length + ' notes ' + this._label);
    notes.sort(function(a, b) {
      return a.getNoteData().y - b.getNoteData().y;
    });

    var list = this._domElements.list;
    var document = list.ownerDocument;
    Util.Dom.removeChildren(list);
    for(var i = 0, length = notes.length; i < length; i++) {
      var div = document.createElement('div');
      div.className = Util.Css.name('indicator-text');
      div.setAttribute('data-guid', notes[i].getGuid());
      div.appendChild(document.createTextNode(notes[i].getTitle()));
      list.appendChild(div);
    }
    this._lastCount = notes.length;
    this._updateLabel(notes.length);
    if (notes.length === 0 ) {
      Util.Css.hide(this._domElements.indicator);
    }
  }
};

Indicator.prototype.hideList = function() {
  Util.Css.hide(this._domElements.list);
};

Indicator.prototype.hide = function() {
  Util.Css.hide(this._domElements.indicator);
  this.hideList();
};

Indicator.prototype._createDOMElements = function(container) {
  var document = container.ownerDocument;
  var self = this;

  var indicator = document.createElement('div');
  indicator.className = Util.Css.name('indicator') + ' ' + this._id;

  var label = document.createElement('div');
  label.className = Util.Css.name('indicator-label');

  var list = document.createElement('div');
  list.className = Util.Css.name('indicator-container');
  list.appendChild(document.createTextNode("Loading..."));

  Util.Css.hide(list);
  Util.Css.css(
    indicator,
    'fontSize',
     FloatNotesPreferences.fontSize + 'px'
  );

  indicator.addEventListener('mouseover', function(e) {
    e.stopPropagation();
    self._proxy.stopTimeout();
    self.showList();
  }, false);

 indicator.addEventListener('mouseout', function(e) {
    e.stopPropagation();
    self._proxy.startTimeout();
    self.hideList();
  }, true);

  indicator.addEventListener('click', function(e) {
    if(e.target.className === Util.Css.name('indicator-text')) {
      self.hideList();
      self._notesContainer.focusNote(e.target.getAttribute('data-guid'));
    }
  }, true);

  indicator.appendChild(label);
  indicator.appendChild(list);
  if (this._id === Util.Css.name('below')) {
    indicator.appendChild(label);
  }
    

  this._domElements.indicator = indicator;
  this._domElements.label = label;
  this._domElements.list = list;
  container.appendChild(indicator);
  indicator = label = list = document = container = null;
};

Indicator.prototype.redraw = function() {
  Util.Css.css(
    this._domElements.indicator,
    'fontSize',
     FloatNotesPreferences.fontSize + 'px'
  );
};


function IndicatorProxy(notes_container) {
  this._timer = Util.Mozilla.getTimer();
  this._above = new Indicator(Util.Css.name('above'), this, notes_container);
  this._above.setLabel(Util.Locale.get('aboveIndicatorString'));
  this._below = new Indicator(Util.Css.name('below'), this, notes_container);
  this._below.setLabel(Util.Locale.get('belowIndicatorString'));
  this._container = notes_container;
}

IndicatorProxy.ID = Util.Css.name('indicators');

var FloatNotesInPageIndicator = IndicatorProxy;

IndicatorProxy.prototype.invalidate = function() {
  this._above.invalidate();
  this._below.invalidate();
};

IndicatorProxy.prototype.updateAndShow = function() {
  if (FloatNotesPreferences.showIndicator && this._container.getLength()) {
    var buckets = this._splitNotes();
    this._above.buildList(buckets[0]);
    this._below.buildList(buckets[1]);
    this.startTimeout();
    this._above.show();
    this._below.show();
  }
};


IndicatorProxy.prototype._splitNotes = function() {
  var notes = this._container.getNotes();
  var above = [];
  var below = [];
  var window = this._container.getCurrentDocument().defaultView;
  var wintop = +window.pageYOffset;
  var winbottom = wintop + (+window.innerHeight);

  for (var i = notes.length; i--;) {
    var note = notes[i];
    var note_data = note.getNoteData();

    if (note.getElementNode() && !note.isFixed()) {
      var top = note_data.y;
      var bottom = top + note_data.h;

      if (wintop > bottom) {
        above.push(note);
      }
      else if(winbottom < top) {
        below.push(note);
      }
    }
  }
  return [above, below];
};


IndicatorProxy.prototype.attachTo = function(container_node) {
  var document = container_node.ownerDocument;
  if (!this._hasContainer(document)) {
    // If container does not exist yet, the site is opened/loaded for the first
    // time
    this._addScrollHandler(document);
  }
  var container = this._getContainer(container_node);
  this._above.attachTo(container);
  this._below.attachTo(container);
  this.updateAndShow();
};

IndicatorProxy.prototype._hasContainer = function(document) {
  return !!document.getElementById(IndicatorProxy.ID);
};

IndicatorProxy.prototype._getContainer = function(container_node) {
  var document = container_node.ownerDocument;
  var container = document.getElementById(IndicatorProxy.ID);
  if (!container) {
    container = document.createElement('div');
    container.id = IndicatorProxy.ID;
    container_node.appendChild(container);
  }
  return container;
};

IndicatorProxy.prototype._addScrollHandler = function(document) {
  var remover = Util.Js.addEventListener(
    document,
    'scroll',
    Util.Js.debounce(this.updateAndShow.bind(this), FloatNotesPreferences.scrolltimer)
  );
    
  document.defaultView.addEventListener('unload', function handler() {
    remover();
    this.removeEventListener('unload', handler, false);
  }, false);
};

IndicatorProxy.prototype.detach = function(document) {
  this._above.detach(document);
  this._below.detach(document);
};

IndicatorProxy.prototype.hide = function() {
  this._above.hide();
  this._below.hide();
};

IndicatorProxy.prototype.startTimeout = function() {
  if (FloatNotesPreferences.fadeOutAfter > 0) {
    this._timer.initWithCallback(
      {
        notify: Util.Js.bind(function(){
          this.hide();
        }, this)
      },
      FloatNotesPreferences.fadeOutAfter*1000,
      this._timer.TYPE_ONE_SHOT
    );
  }
};

IndicatorProxy.prototype.stopTimeout = function() {
  this._timer.cancel();
};

IndicatorProxy.prototype.redraw = function() {
  this._above.redraw();
  this._below.redraw();

};
