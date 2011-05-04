Components.utils.import("resource://gre/modules/PluralForm.jsm");



var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;
var Util = (function() {
    var modules = ['Dom', 'Js', 'Locale', 'Css', 'Mozilla', 'Platform', 'Dialog'];
    var t = {_modules:{}};
    for(var i  = modules.length; i--;) {
        var module = modules[i];
        t.__defineGetter__(module, (function(module) {
            return function() {
                Cu.import("resource://floatnotes/util-" + module + ".js", this._modules);
                this.__defineGetter__(module, function() {
                    return this._modules[module];
                });
                return this[module];
            };
        }(module)));
    }
    return t;
}());
Cu.import("resource://floatnotes/Shared.js");

Cu.import("resource://floatnotes/preferences.js");

EXPORTED_SYMBOLS = ["IndicatorProxy", "Indicator"];


var IndicatorProxy = {
    init: function() {
        this._timer = Components.classes["@mozilla.org/timer;1"]
            .createInstance(Components.interfaces.nsITimer);
        
        this.above = new Indicator(Indicator.BELOW);
        this.below = new Indicator(Indicator.ABOVE);
    },
    updateAndShow: function(doc, notes) {
        if(Preferences.showIndicator) {
            this.startTimeout();
            this.above.updateAndShow(doc, notes);
            this.below.updateAndShow(doc, notes);
        }
    },
    attachTo: function(doc, node) {
        this.above.attachTo(doc, node);
        this.below.attachTo(doc, node);

    },
    detach: function() {
        this.above.detach();
        this.below.detach();
    },
    hideAll: function() {
        this.above.hideAll();
        this.below.hideAll();
    },

    startTimeout: function() {
        var that = this;
        if(Preferences.fadeOutAfter > 0) {
            this._timer.initWithCallback({notify: function(){ 
                that.hideAll();
            }}, Preferences.fadeOutAfter*1000, this._timer.TYPE_ONE_SHOT);
        }
    },

    updateUI: function() {
        this.above.updateUI();
        this.below.updateUI();

    },

    stopTimeout: function() {
        this._timer.cancel();
    }
};




function Indicator(type) {
    this.notes = null;

    if(type == Indicator.BELOW) {
        this.label = Util.Locale.get('belowIndicatorString');
    }
    else if(type == Indicator.ABOVE) {
        this.label = Util.Locale.get('aboveIndicatorString');
    }
    this.type = type;
    this.lastCount = 0;
}

Indicator.ABOVE = 1;
Indicator.BELOW = -1;

Indicator.prototype = {
    updateAndShow: function(doc, notes) {
        if(this.ele) {
            var count = 0;
            this.lastNotes = this._getCurrentNotesFrom(notes);
            count = this.lastNotes.length; ;

            if(count > 0) {
                if(count != this.lastCount) {
                    this.updateList = true;
                    this._updateLabel(count);
                }
                this._show();
            }
            else {
                this.hideAll();
            }
            this.lastCount = count;
            return count;
        }
    },

    _getCurrentNotesFrom: function(notes) {
        var that = this;
        return notes.filter(function(note){ 
            return note.position == that.type && !note.isFixed;
        });
    },

    _updateLabel: function(nn_notes) {
        this.ele.label.innerHTML = nn_notes + ' ' + PluralForm.get(nn_notes, Util.Locale.get('indicatorNote')) +  " " + this.label;
    },

    _show: function() {
        Util.Css.show(this.ele.indicator);
    },

    attachTo: function(doc, node) {
        if(doc && doc.body && (!this.current_doc || this.current_doc != doc)) {
            this.current_doc = doc;
            node = node || doc.body;
            if(!this.ele) {
                this._createDOM(doc);
            }
            else {
                this.detach();
            }
            this.updateList = true;
            this.lastCount = 0;
            this.ele.indicator.style.display = "none";
            node.appendChild(this.ele.indicator);
        }
    },

    detach: function() {
        if(this.ele && this.ele.indicator && this.ele.indicator.parentNode) {
            this.ele.indicator.parentNode.removeChild(this.ele.indicator);
        }
    },

    _createAndShowNoteList: function() {
        Util.Css.show(this.ele.container);
        if(this.updateList) {
            this.ele.container.textContent = '';	
            var notes = this.lastNotes;
            for(var i = 0, length = notes.length;i < length; i++) {
                var div = this.current_doc.createElement('div');
                div.className = "floatnotes-indicator-text";
                div.setAttribute('rel', notes[i].guid);
                div.textContent = notes[i].data.content.substring(0,30);
                this.ele.container.appendChild(div);
            }
            this.updateList = false;
        }			
    },	
    _hide: function() {
        Util.Css.hide(this.ele.container);
    },

    hideAll: function() {
        Util.Css.hide(this.ele.indicator);
        this._hide();
    },

    _createDOM: function(doc) {
        var that = this;	

        var indicator = doc.createElement('div');
        indicator.className = "floatnotes-indicator";

        if(this.type == Indicator.ABOVE) {
            indicator.id = "floatnotes-above";
        }
        else {
            indicator.id = "floatnotes-below";
        }

        var label = doc.createElement('div');
        label.className = "floatnotes-indicator-label";

        var container = doc.createElement('div');
        container.className = "floatnotes-indicator-container";
        container.textContent = "Loading...";

        Util.Css.hide(container);

        indicator.addEventListener('mouseover', function(e) {
            e.stopPropagation();
            IndicatorProxy.stopTimeout();
            that._createAndShowNoteList();
        }, true);

        indicator.addEventListener('mouseout', function(e) {
            e.stopPropagation();
            IndicatorProxy.startTimeout();
            that._hide();
        }, true);

        indicator.addEventListener('click', function(e) {
            if(e.target.className == 'floatnotes-indicator-text') {
                that._hide();
                IndicatorProxy.view.focusNote(e.target.getAttribute('rel'));
            }
        }, true);

        if(this.type == Indicator.BELOW) {
            indicator.style.cssText = "position: fixed; bottom: 0; left: 0, display: none";
            indicator.appendChild(container);
            indicator.appendChild(label);
        }
        else if(this.type == Indicator.ABOVE) {
            indicator.style.cssText =  "position: fixed; top: 0; left: 0, display: none";
            indicator.appendChild(label);
            indicator.appendChild(container);
        }

        this.ele = {
            "indicator": indicator,
            "label": label,
            "container": container
        };
        indicator = label = container = null;
    },

    updateUI: function() {
        if(this.ele) {
            this.ele.indicator.style.fontSize = Preferences.fontSize + 'px';
        }
    }
};
