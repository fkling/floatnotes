#ifndef __INCLUDE_INDICATOR_
#define __INCLUDE_INDICATOR_

#include "util.js"

function Indicator(type) {
	this.ABOVE = 1;
	this.BELOW = -1;
	
	if(type == this.BELOW) {
		this.label = util.getString('belowIndicatorString');
	}
	else if(type == this.ABOVE) {
		this.label = util.getString('aboveIndicatorString');
	}
	this.type = type;
	
}

Indicator.prototype = {
	update: function(doc) {
		if(this.ele) {
			var that = this;
			this.hide(true);
			var n = gFloatNotesManager.docs[doc.location].filter(function(note){ return note.view == that.type && !(note.status & status.EDITING);}).length;
			if(n > 0) {
				this.updateList = true;
				this.ele.label.innerHTML = n + ' ' + (n > 1 ? util.getString('pluralIndicatorString'): util.getString('singularIndicatorString')) +  " " + this.label;
				this.ele.indicator.style.display = "block";
				this.startTimeout();
			}
			else {
				this.hide();
			}
			return n;
		}
	},
	startTimeout: function() {
		this.stopTimeout();
		var that = this;
		this.timer = window.setTimeout(function(){ that.hide(true);}, gFloatNotesManager.indicator_timeout*1000);
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
		this.timer = window.setTimeout(function(){ that.hide(true);}, 5000);
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
	  		this.ele.indicator.style.display = "none";
	  		doc.body.appendChild(this.ele.indicator);
		}
  	},
  	
  	detach: function() {
  		if(this.ele && this.ele.indicator && this.ele.indicator.parentNode) {
  			this.ele.indicator.parentNode.removeChild(this.ele.indicator);
  			//this.dom.parentNode = null;
  		}
  	},
  	
  	updateNoteList: function() {
  		this.updateList = false;
  		this.ele.container.style.display = 'block';
		this.ele.container.textContent = '';
		
		var notes = gFloatNotes.docs[this.current_doc.location];  			
		for each(var note in notes) {
			if(note.view == this.type) {
				var div = this.current_doc.createElement('div');
				div.className = "floatnotes-indicator-text";
				div.setAttribute('rel', note.dom.id);
				div.textContent = note.data.content.substring(0,30);
				this.ele.container.appendChild(div);
			}
		}
  		
  	},
  	
  	hide: function(all) {
  		if(all)
  			this.ele.indicator.style.display = "none";
  		this.ele.container.style.display = 'none';
  		this.ele.container.textContent = "Loading...";
  	},
  	
  	createDOM: function(doc) {
		var that = this;	
		
  		var indicator = doc.createElement('div');
  		indicator.id = "floatnotes-above";
  		indicator.className = "floatnotes-indicator";
  			
  		var label = doc.createElement('div');
  		label.className = "floatnotes-indicator-label";
  		
  		var container = doc.createElement('div');
  		container.className = "floatnotes-indicator-container";
  		container.textContent = "Loading...";
  		
  		
  		util.css(container, {"display": 'none'});
  		
  		indicator.addEventListener('mouseover', function(e) {
  			that.stopTimeout();
  			if(that.updateList)
  				that.updateNoteList();
  			that.startInternalTimeout();
  		}, false);
  	
  		indicator.addEventListener('click', function(e) {
  			if(e.target.className == 'floatnotes-indicator-text') {
  				var t = gBrowser.contentDocument.getElementById(e.target.getAttribute('rel'));
  				gBrowser.contentDocument.defaultView.scrollTo(0, Math.max(parseInt(t.style.top) - 20, 0));
  				that.hide();
  			}
  		}, true);
  		
  		if(this.type == this.BELOW) {
			util.css(indicator,{"position": 'fixed', "bottom": "0px", "left": "0px", 'display': 'none'});
			indicator.appendChild(container);
			indicator.appendChild(label);  		
		}
		else if(this.type == this.ABOVE) {
			util.css(indicator, {"position": 'fixed', "top": "0px", "left": "0px", 'display': 'none'});
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

#endif