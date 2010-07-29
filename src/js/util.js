#ifndef __INCLUDE_UTIL__
#define __INCLUDE_UTIL__

var util = {
	css: function(node, style) {
			if(node && node.style) {
				for (var key in style) {
					node.style[key] = style[key];
				}
			}
	},
	show: function(node) {
		if(node && node.style) {
			node.style.display = "block";
		}
	},
	hide: function(node) {
		if(node && node.style) {
			node.style.display = "none";
		}
	},
	addClass: function(node, cls) {
		if(node && node.className && node.className.indexOf(cls) == -1) {
			node.className = node.className + " " + cls;
		}
	},
	removeClass: function(node, cls) {
		if(node && node.className && node.className.indexOf(cls) >= 0) {
			var pattern = new RegExp('\\s*' + cls + '\\s*');
			node.className = node.className.replace(pattern, ' ');
		}
	},
	fireEvent: function(element,event) {
		// dispatch for firefox + others
		var evt = document.createEvent("HTMLEvents");
		evt.initEvent(event, true, true ); // event type,bubbling,cancelable
		return !element.dispatchEvent(evt);
	},
	getPreferencesService: function() {
		if(!this._preferencesService) {
			this._preferencesService = Components.classes["@mozilla.org/preferences-service;1"]
			                          .getService(Components.interfaces.nsIPrefBranch)
			                          .getBranch("extensions.floatnotes.");
		}
		return this._preferencesService;
	},
	getCurrentVersion: function() {
		if(!this._currentVersion) {
			var extensionManager = Components.classes["@mozilla.org/extensions/manager;1"]
			                                           .getService(Components.interfaces.nsIExtensionManager);
			this._currentVersion = extensionManager.getItemForID("floatnotes@felix-kling.de").version;
		}
		return this._currentVersion;
	},
	getString: function(string, params) {
		if(!this._stringBundle) {
			this._stringBundle = document.getElementById("floatnotes-stringbundle");
		}
		
		this.getString = function(string, params) {
			if(params) {
				return this._stringBundle.getFormattedString(string, params);
			}
			else {
				return this._stringBundle.getString(string);
			}
		};
		
		return this.getString(string, params);
	}
};

#endif