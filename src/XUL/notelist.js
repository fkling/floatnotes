"use strict";
/*global Components*/
Components.utils['import']("resource://floatnotes/SQLiteDatabase.js");
Components.utils['import']("resource://floatnotes/manager.js");
Components.utils['import']("resource://floatnotes/preferences.js");
Components.utils['import']("resource://floatnotes/util-Locale.js");
Components.utils['import']("resource://floatnotes/util-Dialog.js");
Components.utils['import']("resource://floatnotes/util-Mozilla.js");
Components.utils['import']("resource://floatnotes/URLHandler.js");
Components.utils['import']("resource://floatnotes/Shared.js");
Components.utils['import']("resource://gre/modules/PluralForm.jsm");

// DOM elements
var textBox = document.getElementById('text');
var colorPicker = document.getElementById('color');
var inputBrdcast = document.getElementById('isEnabled');
var deleteButton = document.getElementById('delete');
var saveSearchButton = document.getElementById('saveSearch');
var searchBox = document.getElementById('search');
var searchList = document.getElementById('searches');
var tree = document.getElementById('notes');

// Global vars
var pref = Preferences;
var doObserve = true;

function saveData() {
    treeView.saveCurrentSelection();
}

textBox.addEventListener('focus', function() {
    window.addEventListener('mousedown', saveData, true);
}, true);

textBox.addEventListener('blur', function() {
    window.removeEventListener('mousedown', saveData, true);
    saveData();
}, false);


textBox.addEventListener('click',  function(e) {
    e.stopPropagation();
}, true);


window.addEventListener('unload', function() {
    treeView.saveCurrentSelection();
}, true);


var observer = {
    doObserve: true,
    registerObserver: function() {
        var obsService = Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService);
        obsService.addObserver(this, 'floatnotes-note-update', false);
        obsService.addObserver(this, 'floatnotes-note-delete', false);
        obsService.addObserver(this, 'floatnotes-note-urlchange', false);
        obsService.addObserver(this, 'floatnotes-note-add', false);
        var that = this;
        function remove() {
            that.removeObserver();
        }
        window.addEventListener('unload',remove , true);
        this._removeUnloadListener = function() { window.removeEventListener('unload', remove, true);};
    },

    removeObserver: function() {
        this._removeUnloadListener();
        var obsService = Components.classes["@mozilla.org/observer-service;1"]
                        .getService(Components.interfaces.nsIObserverService);
        obsService.removeObserver(this, 'floatnotes-note-update');
        obsService.removeObserver(this, 'floatnotes-note-delete');
        obsService.removeObserver(this, 'floatnotes-note-urlchange');
        obsService.removeObserver(this, 'floatnotes-note-add');
    },

    observe: function(subject, topic, data) {
        if(this.doObserve) {
            search.dirty = true;
            search();
        }
    }
}



var dragHandler = {
    dragStart: function dragStart(event) {
        var index = searchList.getIndexOfItem(event.target);
        if(index > 0) {
            event.dataTransfer.setData('text/plain', index);
        }
        event.stopPropagation();
    },

    dragOver: function dragOver(event) {
        event.preventDefault();
        event.target.style.borderBottom = "2px solid black";
    },

    dragLeave: function dragLeave(event) {
        event.preventDefault();
        event.target.style.borderBottom = "";
    },

    onDrop: function onDrop(event) {
        var sourceIndex = +event.dataTransfer.getData("text/plain");
        var targetIndex = searchList.getIndexOfItem(event.target);
        if(targetIndex >= 0 && sourceIndex !== targetIndex) {
            var source = searchList.removeItemAt(sourceIndex);
            var target = event.target.nextElementSibling;
            if(target) {
                searchList.insertBefore(source, target);
            }
            else {
                searchList.appendChild(source);
            }
            searchManager.move(sourceIndex, targetIndex);
        }
    }
};


var SearchManager = {
  searches: [
    [Locale.get('notelist.saved_search.all'), '']
  ].concat(pref.savedSearches),

  openEditDialog: function() {
    var item = searchList.selectedItem;
    if (item && searchList.selectedIndex > 0) {
      window.openDialog(
        "chrome://floatnotes/content/editSearch.xul",
        "Edit Search",
        "modal",
        searchList,
        this
      );
    }
  },

  deleteSelectedSearch: function() {
    var index = searchList.selectedIndex;
    if (index != null && index > 0) {
       this.deleteSearch(index);
       // select the previous item (always exists)
       searchList.selectItem(searchList.getItemAtIndex(index - 1));
       searchList.removeItemAt(index);
    }
  },

  getCurrentSearchKeywords: function() {
    return searchBox.value ? searchBox.value.split(' ') : [];
  },

  saveSearch: function() {
    var keywords = this.getCurrentSearchKeywords();
    if (keywords.length > 0 ) {
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                  .getService(Components.interfaces.nsIPromptService);
      var check = {value: false};
      var name = {value: ""};
      var result = true;
      while (!name.value && result) {
        result = prompts.prompt(
          null,
          Locale.get('notelist.save_search.title'),
          Locale.get('notelist.save_search.name'),
          name,
          null,
          check
        );
      }
      if (result) {
        this.addSearch(name.value, keywords.join(' '));
      }
    }
  },

  buildList: function() {
    // memorize selected index
    var selected_index = 
      searchList.selectedIndex > 0 ? searchList.selectedIndex : 0;
    this.emptyList();
    for (var i = 0, l = this.searches.length; i<l; i++) {
      searchList.appendItem.apply(searchList, this.searches[i]);
    }
    searchList.selectedIndex = selected_index;
  },

  addSearch: function(name, keywords) {
    this.searches.push([name,keywords]);
    searchBox.value = '';
    this._save();
    var item = searchList.appendItem(name, keywords);
    searchList.selectedItem = item;
  },

  emptyList: function() {
    for (var i = searchList.itemCount -1; i >=0; i--) {
      searchList.removeItemAt(i);
    }
  },

  moveSearch: function(which, to) {
    var removed = this.searches.splice(which, 1);
    this.searches.splice(to + 1, 0, removed[0]);
    this._save();
  },

  deleteSearch: function(index) {
    this.searches.splice(index, 1);
    this._save();
  },

  _save: function() {
    pref.savedSearches = this.searches.slice(1);
  },

  update: function(index, name, keywords) {
    this.searches[index] = [name, keywords];
    this._save();
    var item = searchList.getItemAtIndex(index);
    item.label = name;
    item.value = keywords;
    if (item === searchList.selectedItem) {
      search();
    }
  },

  updateButtons: function() {
    document.getElementById('searchListButtons')
      .setAttribute('disabled', (searchList.selectedIndex === 0));
  }
};


function loadPage() {
    if(treeView.selection.count === 1) {
        var note = treeView.data[treeView.selection.currentIndex];
        if(note) {
            var url = FloatNotesURLHandler.getNoteUrl(note);
            if(url.lastIndexOf('*') === url.length - 1) {
                var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                    .getService(Components.interfaces.nsIPromptService);
                promptService.alert(window, '',Locale.get('notelist.notify_multiple_pages'));
                return;
            }
            Shared.focusNote = note.guid;
            Mozilla.openAndReuseOneTabPerURL(url);
        }
    }
}

function search() {
    var words = searchBox.value ? searchBox.value.split(' ') : [];
    var selectedSearch = searchList.selectedItem;
    var searchMsg = document.getElementById('searchMsg');
    if(selectedSearch && selectedSearch.value) {
        words = selectedSearch.value.split(' ').concat(words);
        searchMsg.value = Locale.get('notelist.search_msg', [words.join(' ')]);
        searchMsg.style.display = 'block';
    }
    else {
        searchMsg.style.display = 'none';
    }
    clear();
    if(search.dirty || (words.toString() !== search.LastSearch.toString())) {
        if(words.length > 0) {
            search.dirty = false;
            db.getNotesContaining(words).then(function(notes) {
                treeView.data = notes;
                if(typeof tree.boxObject.invalidate === 'function') {
                    tree.boxObject.invalidate();
                }
                updateCounter();
                if(searchBox.value) {
                    saveSearchButton.style.display = 'inline';
                }
                else {
                    saveSearchButton.style.display = 'none';
                }
                sort();
            });
        }
        else {
            db.getAllNotes().then(function(notes) {
                treeView.data = notes;
                tree.view = treeView;
                updateCounter();
                document.getElementById('saveSearch').style.display = 'none';
                sort();
            });
        }
        search.LastSearch = words;
    }
}
search.LastSearch = [];
search.dirty = true;

function getTitle(text) {
    var index = text.indexOf("\n");
    if (index >= 0) {
        return " " + text.substring(0, index);
    }
    else {
        return " " + text;
    }
}

function updateCounter() {
    var str = treeView.rowCount;
    str += ' ' + PluralForm.get(str, Locale.get('indicatorNote'));
    document.getElementById('counter').value = str;
}

function saveNote(value, attr, selection) {
    if(typeof selection === 'number' || treeView.selection.count === 1) {
        selection = (typeof selection === 'number' ) ? selection : treeView.selection.currentIndex;
        var note = treeView.data[selection];

        if(typeof note !== 'undefined' && value !== note[attr]) {
            note[attr] = value
            observer.doObserve = false;
            manager.saveNote(note).then(function(result){
                observer.doObserve=true;
                note.modification_date = result.noteData.modification_date;
                tree.boxObject.invalidateRow(selection);
            });
        }
    }
}

function deleteNote() {
    var selection = treeView.selection;
    if(selection && selection.count >=1) {
        doObserve = false;
        if(selection.count === 1) {
            if(Dialog.confirmDeletion(1)) {
                manager.deleteNote(treeView.data[selection.currentIndex].guid).then(function() {
                    doObserve = true;
                });
                search();
            }
        }
        else {
            if(Dialog.confirmDeletion(2)) {
                var start = {};
                var end =  {};
                var numRanges = tree.view.selection.getRangeCount();
                var data = treeView.data;
                for (var t = 0; t < numRanges; t++){
                    tree.view.selection.getRangeAt(t,start,end);
                    for (var v = start.value; v <= end.value; v++){
                        doObserve = false;
                        manager.deleteNote(data[v].guid).then(function() {
                            doObserve = true;
                        });
                    }
                }
                search();
            }
        }
    }
}


function clear() {
    if(treeView.selection) {
        treeView.selection.clearSelection();
    }
    inputBrdcast.setAttribute('disabled', true);
    textBox.value="";
    colorPicker.color = "";
}

function sort(column) {
	var columnName;
	var order = tree.getAttribute("sortDirection") === "ascending" ? 1 : -1;
	//if the column is passed and it's already sorted by that column, reverse sort
	if (column) {
		columnName = column.id;
		if (tree.getAttribute("sortResource") === columnName) {
			order *= -1;
		}
	} else {
		columnName = tree.getAttribute("sortResource");
	}

	function columnSort(a, b) {
		if (prepareForComparison(a[columnName]) > prepareForComparison(b[columnName])) return 1 * order;
		if (prepareForComparison(a[columnName]) < prepareForComparison(b[columnName])) return -1 * order;
		//tie breaker: name ascending is the second level sort
		if (columnName != "url") {
			if (prepareForComparison(a["url"]) > prepareForComparison(b["url"])) return 1;
			if (prepareForComparison(a["url"]) < prepareForComparison(b["url"])) return -1;
		}
		return 0;
	}
	treeView.data = treeView.data.sort(columnSort);
	//setting these will make the sort option persist
	tree.setAttribute("sortDirection", order === 1 ? "ascending" : "descending");
	tree.setAttribute("sortResource", columnName);
	tree.view = treeView;
	//set the appropriate attributes to show to indicator
	var cols = tree.getElementsByTagName("treecol");
	for (var i = 0; i < cols.length; i++) {
		cols[i].removeAttribute("sortDirection");
	}
	document.getElementById(columnName).setAttribute("sortDirection", order === 1 ? "ascending" : "descending");
}

//prepares an object for easy comparison against another. for strings, lowercases them
function prepareForComparison(o) {
	if (typeof o === "string") {
		return o.toLowerCase();
	}
	return o;
}


var db = new FloatNotesSQLiteDatabase();
var manager = FloatNotesManager.getInstance();

var searchManager = {
};


var faviconService = Components.classes["@mozilla.org/browser/favicon-service;1"]
                     .getService(Components.interfaces.nsIFaviconService);
var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);

var treeView = {
    data: [],
    get rowCount() {
        return this.data.length;
    },
    getCellText : function(row,column){
        if (column.id === "content") return getTitle(this.data[row].content);
        if (column.id === "url") return this.data[row].url;
        if (column.id === "modification_date") return this.data[row].modification_date.toLocaleString();
        if (column.id === "creation_date") return this.data[row].creation_date.toLocaleString();
    },
    setTree: function(treebox){ this.treebox = treebox; },
    isContainer: function(row){ return false; },
    isSeparator: function(row){ return false; },
    isSorted: function(){ return false; },
    getLevel: function(row){ return 0; },
    getImageSrc: function(row,column){
        if (column.id === "content") {
            var note = this.data[row];
            var url = FloatNotesURLHandler.getNoteUrl(note);
            if(url.charAt(url.length - 1) === '*') {
                url = url.substring(0, url.length);
            }
            return faviconService.getFaviconImageForPage(ioService.newURI(url, null, null)).spec;
        }
        return null;
    },
    getRowProperties: function(row,props){},
    getCellProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){},
    selectionChanged: function() {
        var count = this.selection.count;
        var note;
        if(count === 0) {
            inputBrdcast.setAttribute('disabled', true);
            textBox.value = "";
            colorPicker.value = "";

        }
        else if(count === 1) {
            var index = this.selection.currentIndex;
            note = this.data[index];
            inputBrdcast.setAttribute('disabled', false);
            textBox.disabled = false;
            textBox.value = note.content;
            colorPicker.color = note.color;
        }
        else {
            textBox.value = "";
            colorPicker.color = "";
            inputBrdcast.setAttribute('disabled', true);
            deleteButton.disabled = false;
        }
    },
    cycleHeader: function(col) {

    },
    saveCurrentSelection: function() {
        if(this.selection && this.selection.count === 1) {
            var index = this.selection.currentIndex;
            saveNote(textBox.value, 'content', index);
            saveNote(colorPicker.color, 'color', index);
        }
    }

};

SearchManager.buildList();
observer.registerObserver();
