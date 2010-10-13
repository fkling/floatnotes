//!#ifndef __INCLUDE_INDICATOR_
//!#define __INCLUDE_INDICATOR_

//!#include "util.js"


IndicatorProxy = {
    init: function(view) {
        this.view = view;
        this.above = new Indicator(Indicator.BELOW);
        this.below = new Indicator(Indicator.ABOVE);
    },
    updateAndShow: function(doc, notes) {
        this.above.updateAndShow(doc, notes);
        this.below.updateAndShow(doc, notes);
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
        this.stopTimeout();
        var that = this;
        this._timer = window.setTimeout(function(){ 
            that.hideAll();
        }, 
        this.view.indicator_timeout*1000);
    },

    stopTimeout: function() {
        if(this._timer) {
            window.clearTimeout(this._timer);
            this._timer = null;
        }
    }
}




function Indicator(type) {
    this.notes = null;

    if(type == Indicator.BELOW) {
        this.label = util.getString('belowIndicatorString');
    }
    else if(type == Indicator.ABOVE) {
        this.label = util.getString('aboveIndicatorString');
    }
    this.type = type;
    this.lastCount = 0;
}

Indicator.ABOVE = 1;
Indicator.BELOW = -1;

Indicator.prototype = {
    updateAndShow: function(doc, notes) {
        if(this.ele) {
            var u = util;
            var count = 0;
            this.lastNotes = this._getCurrentNotesFrom(notes);
            count = this.lastNotes.length; LOG(count + ' notes ' + this.type);

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
        return notes.filter(function(note){ return note.position == that.type && !note.hasStatus(status.EDITING | status.FIXED);});
    },

    _updateLabel: function(nn_notes) {
        this.ele.label.innerHTML = nn_notes + ' ' + (nn_notes > 1 ? util.getString('pluralIndicatorString'): util.getString('singularIndicatorString')) +  " " + this.label;
    },

    _show: function() {
        util.show(this.ele.indicator);
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
        util.show(this.ele.container);
        if(this.updateList) {
            this.ele.container.textContent = '';	
            var notes = this.lastNotes;
            for(var i = 0, length = notes.length;i < length; i++) {
                var div = this.current_doc.createElement('div');
                div.className = "floatnotes-indicator-text";
                div.setAttribute('rel', notes[i].dom.id);
                div.textContent = notes[i].data.content.substring(0,30);
                this.ele.container.appendChild(div);
            }
            this.updateList = false;
        }			
    },	
    _hide: function() {
        util.hide(this.ele.container);
    },

    hideAll: function() {
        util.hide(this.ele.indicator);
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

        util.hide(container);

        indicator.addEventListener('mouseover', function(e) {
            IndicatorProxy.stopTimeout();
            that._createAndShowNoteList();
        }, false);

        indicator.addEventListener('mouseout', function(e) {
            IndicatorProxy.startTimeout();
            that._hide();
        }, false);

        indicator.addEventListener('click', function(e) {
            if(e.target.className == 'floatnotes-indicator-text') {
                that._hide();
                var t = gBrowser.contentDocument.getElementById(e.target.getAttribute('rel'));
                gBrowser.contentDocument.defaultView.scrollTo(0, Math.max(parseInt(t.style.top) - 20, 0));
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
    }
};

//!#endif
