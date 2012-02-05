//!#include "../header.js"
"use strict";

Cu['import']("resource://floatnotes/preferences.js");
Cu['import']("resource://gre/modules/PluralForm.jsm");

/*global Preferences:true PluralForm:true */


var EXPORTED_SYMBOLS = ["FloatNotesInPageIndicator"];

function Indicator(proxy, id) {
    this.proxy_ = proxy;
    this.id_ = id;

}

Indicator.prototype.proxy_ = null;
Indicator.prototype.notes_ = null;
Indicator.prototype.label_ = '';
Indicator.prototype.cls_ = '';
Indicator.prototype.lastCount_ = 0;
Indicator.prototype.hasToBuildNoteList_ = false;
Indicator.prototype.domElements_ = null;
Indicator.prototype.currentDocument_ = null;

Indicator.prototype.setLabel = function(label) {
    this.label_ = label;
};


Indicator.prototype.updateAndShow = function(document, notes) {
    if(this.domElements_) {
        var count = notes.length;
        this.notes_ = notes;
        this.notes_.sort(function(a, b) {
            return a.getNoteData().x - b.getNoteData().x;
        });
        LOG(count + ' notes ' + this.label_);

        if(count > 0) {
            if(count != this.lastCount) {
                this.hasToBuildNoteList_ = true;
                this.updateLabel_(count);
            }
            this.show();
        }
        else {
            this.hide();
        }
        this.lastCount = count;
        return count;
    }
};


Indicator.prototype.updateLabel_ = function(nn_notes) {
    this.domElements_.label.innerHTML = [nn_notes, PluralForm.get(nn_notes, Util.Locale.get('indicatorNote')), this.label_].join(' ');
};

Indicator.prototype.show = function() {
    Util.Css.show(this.domElements_.indicator);
};

Indicator.prototype.attachTo = function(document, container) {
    if(document && document.body && (!this.currentDocument_ || this.currentDocument_ != document)) {
        this.currentDocument_ = document;
        container = container || document.body;
        if(!this.domElements_) {
            this.createDomElements_(document);
        }
        else {
            this.detach();
        }
        this.hasToBuildNoteList_ = true;
        this.lastCount = 0;
        Util.Css.hide(this.domElements_.indicator);
        container.appendChild(this.domElements_.indicator);
    }
};

Indicator.prototype.detach = function() {
    if(this.domElements_ && this.domElements_.indicator) {
        Util.Dom.detach(this.domElements_.indicator);
    }
};

Indicator.prototype.showAndCreateNoteList_  = function() {
    var container = this.domElements_.container,
        document = this.currentDocument_;
    if(this.hasToBuildNoteList_) {
        Util.Dom.removeChildren(container);
        var notes = this.notes_;
        for(var i = 0, length = notes.length;i < length; i++) {
            var div = document.createElement('div');
            div.className = "floatnotes-indicator-text";
            div.setAttribute('rel', notes[i].getGuid());
            div.textContent = notes[i].getTitle();
            container.appendChild(div);
        }
        this.hasToBuildNoteList_ = false;
    }			
    Util.Css.show(container);
};

Indicator.prototype.hideList = function() {
    Util.Css.hide(this.domElements_.container);
};

Indicator.prototype.hide = function() {
    Util.Css.hide(this.domElements_.indicator);
    this.hideList();
};

Indicator.prototype.createDomElements_ = function(document) {
    var self = this;	

    var indicator = document.createElement('div');
    indicator.className = "floatnotes-indicator";
    indicator.id = this.id_;

    var label = document.createElement('div');
    label.className = "floatnotes-indicator-label";

    var container = document.createElement('div');
    container.className = "floatnotes-indicator-container";
    container.textContent = "Loading...";

    Util.Css.hide(container);

    indicator.addEventListener('mouseover', function(e) {
        e.stopPropagation();
        self.proxy_.stopTimeout();
        self.showAndCreateNoteList_();
    }, true);

    indicator.addEventListener('mouseout', function(e) {
        e.stopPropagation();
        self.proxy_.startTimeout();
        self.hideList();
    }, true);

    indicator.addEventListener('click', function(e) {
        if(e.target.className == 'floatnotes-indicator-text') {
            self.hideList();
            self.proxy_.getView().focusNote(e.target.getAttribute('rel'));
        }
    }, true);

    indicator.appendChild(label);
    indicator.appendChild(container);

    this.domElements_ = {
        indicator: indicator,
        label: label,
        container: container
    };
    indicator = label = container = null;
};

Indicator.prototype.redraw = function() {
    if(this.domElements_) {
        Util.Css.css(this.domElements_.indicator, 'fontSize', Preferences.fontSize + 'px');
    }
};


function IndicatorProxy() {
    this.timer_ = Util.Mozilla.getTimer();
    this.above_ = new Indicator(this, 'floatnotes-above');
    this.above_.setLabel(Util.Locale.get('aboveIndicatorString'));
    this.below_ = new Indicator(this, 'floatnotes-below');
    this.below_.setLabel(Util.Locale.get('belowIndicatorString'));
}

var FloatNotesInPageIndicator = IndicatorProxy;

IndicatorProxy.prototype.timer_ = null;
IndicatorProxy.prototype.above_ = null;
IndicatorProxy.prototype.below_ = null;
IndicatorProxy.prototype.view_ = null;

IndicatorProxy.prototype.setView = function(view) {
    this.view_ = view;
};

IndicatorProxy.prototype.getView = function() {
    return this.view_;
};

IndicatorProxy.prototype.updateAndShow = function(document, notes) {
    if(Preferences.showIndicator && notes.length > 0) {
        var above = [],
            below = [],
            window = notes[0].getWindow(),
            wintop = +window.pageYOffset,
            winbottom = wintop + (+window.innerHeight);

        AF(isNaN(wintop), "Window top is a proper number");
        AF(isNaN(winbottom), "Window height is a proper number");

        for(var i = notes.length; i--;) {
            var note = notes[i],
                noteData = note.getNoteData();

            if(note.getElementNode() && !note.isFixed()) {

                var top = noteData.y;
                var bottom = top + noteData.h;

                if (wintop > bottom) {
                    above.push(note);
                }
                else if(winbottom < top) {
                    below.push(note);
                }
            }
        }

        this.startTimeout();
        this.above_.updateAndShow(document, above);
        this.below_.updateAndShow(document, below);
    }
};

IndicatorProxy.prototype.attachTo = function(document, node) {
    this.above_.attachTo(document, node);
    this.below_.attachTo(document, node);
};

IndicatorProxy.prototype.detach = function(document) {
    this.above_.detach(document);
    this.below_.detach(document);
};

IndicatorProxy.prototype.hide = function() {
    this.above_.hide();
    this.below_.hide();
};

IndicatorProxy.prototype.startTimeout = function() {
    if(Preferences.fadeOutAfter > 0) {
        this.timer_.initWithCallback({
            notify: Util.Js.bind(function(){ 
                this.hide();
            }, this)
        }, Preferences.fadeOutAfter*1000, this.timer_.TYPE_ONE_SHOT);
    }
};

IndicatorProxy.prototype.stopTimeout = function() {
    this.timer_.cancel();
};

IndicatorProxy.prototype.redraw = function() {
    this.above_.redraw();
    this.below_.redraw();

};
