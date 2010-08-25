//!#ifndef __INCLUDE_INDICATOR_
//!#define __INCLUDE_INDICATOR_

//!#include "util.js"

function Indicator(type, notesManager) {
	this.notes
	this.ABOVE = 1;
	this.BELOW = -1;
	
	if(type == this.BELOW) {
		this.label = util.getString('belowIndicatorString');
	}
	else if(type == this.ABOVE) {
		this.label = util.getString('aboveIndicatorString');
	}
	this.type = type;
	this.lastCount = 0;
	
}

Indicator.prototype = {
	update: function(doc) {
		if(this.ele) {
			var that = this;
			var u = util;
			
			this.lastNotes = gFloatNotesManager.docs[doc.location].filter(function(note){ return note.view == that.type && !note.hasStatus(status.EDITING | status.FIXED);});
			var count = this.lastNotes.length;
			if(count > 0) {
				if(count != this.lastCount) {
					this.updateList = true;
					this.ele.label.innerHTML = count + ' ' + (count > 1 ? u.getString('pluralIndicatorString'): u.getString('singularIndicatorString')) +  " " + this.label;
				}
				u.show(this.ele.indicator);
				this.startTimeout();
			}
			else {
				this.hideAll();
			}
			this.lastCount = count;
			return count;
		}
	},
	startTimeout: function() {
		this.stopTimeout();
		var that = this;
		this.timer = window.setTimeout(function(){ that.hideAll();}, gFloatNotesManager.indicator_timeout*1000);
	},
	
	stopTimeout: function() {
		if(this.timer) {
			window.clearTimeout(this.timer);
			this.timer = null;
		}
	},
	
	startInternalTimeout: function() {
		if(this.internal_timer) {
			window.clearTimeout(this.internal_timer);
			this.internal_timer = null;
		}
		var that = this;
		this.timer = window.setTimeout(function(){ that.hideAll();}, 5000);
	},
	
	attachTo: function(doc) {
		if(doc) {
			this.current_doc = doc;
			if(!this.ele) {
				this.createDOM(doc);
			}
			else {
		  		this.detach();
			}
			this.updateList = true;
			this.lastCount = 0;
	  		this.ele.indicator.style.display = "none";
	  		doc.body.appendChild(this.ele.indicator);
		}
  	},
  	
  	detach: function() {
  		if(this.ele && this.ele.indicator && this.ele.indicator.parentNode) {
  			this.ele.indicator.parentNode.removeChild(this.ele.indicator);
  		}
  	},
  	
  	createAndShowNoteList: function() {
  		this.ele.container.style.display = 'block';
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
  	hide: function() {  			
  		util.hide(this.ele.container);
  	},
  	
  	hideAll: function() {
  		util.hide(this.ele.indicator);
  		this.hide();
  	},
  	
  	createDOM: function(doc) {
		var that = this;	
		
  		var indicator = doc.createElement('div');
  		indicator.className = "floatnotes-indicator";
  		
  		if(this.type == this.ABOVE) {
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
  			that.stopTimeout();
  			that.createAndShowNoteList();
  		}, false);
  		
  		indicator.addEventListener('mouseout', function(e) {
  			that.startTimeout();
  			that.hide();
  		}, false);

  		indicator.addEventListener('click', function(e) {
  			if(e.target.className == 'floatnotes-indicator-text') {
  				that.hide();
  				var t = gBrowser.contentDocument.getElementById(e.target.getAttribute('rel'));
  				gBrowser.contentDocument.defaultView.scrollTo(0, Math.max(parseInt(t.style.top) - 20, 0));
  			}
  		}, true);
  		
  		if(this.type == this.BELOW) {
			indicator.style.cssText = "position: fixed; bottom: 0; left: 0, display: none";
			indicator.appendChild(container);
			indicator.appendChild(label);  		
		}
		else if(this.type == this.ABOVE) {
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