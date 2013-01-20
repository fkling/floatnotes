"use strict";
/*jshint browser:true*/
/*global Components*/
Components.utils['import']("resource://floatnotes/SQLiteDatabase.js");
Components.utils['import']("resource://floatnotes/manager.js");
Components.utils['import']("resource://floatnotes/preferences.js");
Components.utils['import']("resource://floatnotes/util-Locale.js");
Components.utils['import']("resource://floatnotes/util-Dialog.js");
Components.utils['import']("resource://floatnotes/util-Mozilla.js");
Components.utils['import']("resource://floatnotes/URLHandler.js");
Components.utils['import']("resource://floatnotes/Shared.js");
Components.utils['import']("resource://floatnotes/when.js");
Components.utils['import']("resource://gre/modules/PluralForm.jsm");
/*global FloatNotesSQLiteDatabase, FloatNotesManager, Preferences, Locale,
  Dialog, Mozilla, FloatNotesURLHandler, Shared, PluralForm, FloatNotesWhen*/

// DOM elements
var textBox = document.getElementById('text');
var colorPicker = document.getElementById('color');
var inputBrdcast = document.getElementById('isEnabled');
var deleteButton = document.getElementById('delete');
var saveSearchButton = document.getElementById('saveSearch');
var searchBox = document.getElementById('search');
var searchList = document.getElementById('searches');
var searchMsg = document.getElementById('searchMsg');
var tree = document.getElementById('notes');

// Global vars
var pref = Preferences;
var PromptService =
  Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
  .getService(Components.interfaces.nsIPromptService);

var db = new FloatNotesSQLiteDatabase();
var manager = FloatNotesManager.getInstance();

var faviconService =
  Components.classes["@mozilla.org/browser/favicon-service;1"]
    .getService(Components.interfaces.nsIFaviconService);
var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);


window.addEventListener('mousedown', function handler() {
  NoteManager.saveSelectedNote();
}, true);

window.addEventListener('unload', function handler() {
  window.removeEventListener('unload', handler, true);
  NoteManager.saveSelectedNote();
}, true);


var observer = {
    doObserve: true,
    registerObserver: function() {
        var obsService = Components.classes["@mozilla.org/observer-service;1"]
          .getService(Components.interfaces.nsIObserverService);
        obsService.addObserver(this, 'floatnotes-note-update', false);
        obsService.addObserver(this, 'floatnotes-note-delete', false);
        obsService.addObserver(this, 'floatnotes-note-add', false);

        window.addEventListener('unload', function handler() {
          obsService.removeObserver(this, 'floatnotes-note-update', false);
          obsService.removeObserver(this, 'floatnotes-note-delete', false);
          obsService.removeObserver(this, 'floatnotes-note-add', false);
          window.removeEventListener('unload', handler, true);
          obsService = null;
        }.bind(this), true);
    },

    observe: function(subject, topic, guid) {
        if(this.doObserve) {
          switch (topic) {
            case 'floatnotes-note-update':
              NoteManager.updateNoteWithGUID(guid);
              break;
            case 'floatnotes-note-delete':
              NoteManager.removeNoteWithGUID(guid);
              break;
            case 'floatnotes-note-add':
              break;
          }
        }
    }
};


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
        event.target.style.borderBottom = "";
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
            SearchManager.moveSearch(sourceIndex, targetIndex);
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

  getSearchKeywords: function() {
    var selectedSearch = searchList.selectedItem;
    var words = [];
    if(selectedSearch && selectedSearch.value) {
        words.push.apply(words, selectedSearch.value.split(' '));
    }
    words.push.apply(words, this.getCurrentSearchKeywords());
    return words;
  },

  saveSearch: function() {
    var keywords = this.getSearchKeywords();
    if (keywords.length > 0 ) {
      var check = {value: false};
      var name = {value: ""};
      var result = true;
      while (!name.value && result) {
        result = PromptService.prompt(
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
      NoteManager.search();
    }
  },

  updateButtons: function() {
    document.getElementById('searchListButtons')
      .setAttribute('disabled', (searchList.selectedIndex === 0));
  }
};


var NoteManager = {
  _notes: {},
  _notesSorted: [],
  _lastKeywords: [],
  _dirty: true,

  getNoteAtIndex: function(i) {
    return this._notesSorted[i];
  },

  getNumberOfNotes: function() {
    return this._notesSorted.length;
  },

  setDirty: function(dirty) {
    this._dirty = dirty;
  },

  loadPageForSelectedNote: function() {
    if (this.hasSingleSelection()) {
      var note = this.getSelectedNote();
      if (note) {
        var url = FloatNotesURLHandler.getNoteUrl(note);
        // we cannot load wild card URLs
        if (url.lastIndexOf('*') === url.length - 1) {
          PromptService.alert(
            window,
            '',
            Locale.get('notelist.notify_multiple_pages')
          );
          return;
        }
        Shared.focusNote = note.guid;
        Mozilla.openAndReuseOneTabPerURL(url);
      }
    }
  },

  getSelectedNote: function() {
    return TreeView.data[TreeView.selection.currentIndex];
  },

  hasSingleSelection: function() {
    return TreeView.selection.count === 1;
  },

  search: function() {
    var words = SearchManager.getSearchKeywords();
    if (words.length > 0) {
      searchMsg.value = Locale.get('notelist.search_msg', [words.join(' ')]);
      searchMsg.style.display = 'block';
    }
    else {
      searchMsg.style.display = 'none';
    }
    this.clearSelection();
    if (this._dirty || (words.toString() !== this._lastKeywords.toString())) {
      this._lastKeywords = words;
      if (words.length > 0) {
        this._dirty = false;
        db.getNotesContaining(words).then(function(notes) {
          this.setData(notes);
          if (searchBox.value) {
            saveSearchButton.style.display = 'inline';
          }
          else {
            saveSearchButton.style.display = 'none';
          }
        }.bind(this));
      }
      else {
        db.getAllNotes().then(function(notes) {
          this.setData(notes);
          document.getElementById('saveSearch').style.display = 'none';
        }.bind(this));
      }
    }
  },

  _updateTree: function(start_index, end_index) {
    if (!TreeView.treebox) {
      tree.view = TreeView;
    }

    if (arguments.length === 2) {
      TreeView.treebox.invalidateRange(start_index, end_index);
    }
    else if (arguments.length === 1) {
      TreeView.treebox.invalidateRange(start_index, start_index);
    }
    else {
      TreeView.treebox.invalidate();
    }
  },

  setData: function(notes) {
    var num_notes = this._notesSorted.length
    this._notesSorted.length = 0;
    this._notesSorted.push.apply(this._notesSorted, notes);

    // clear _notes
    for (var id in this._notes) {
      delete this._notes[id];
    }

    for (var i = 0, l = notes.length; i < l; i++) {
      this._notes[notes[i].guid] = notes[i];
    }

    if (TreeView.treebox) {
      TreeView.treebox.rowCountChanged(0, this._notesSorted.length - num_notes);
    }
    this.sortNotesBy();
    this.updateNoteCounter();
  },

  updateNoteCounter: function() {
    var str = TreeView.rowCount;
    str += ' ' + PluralForm.get(str, Locale.get('indicatorNote'));
    document.getElementById('counter').value = str;
  },

  _getSelectedNotes: function() {
    var selection = tree.view.selection;
    var ranges = selection.getRangeCount();
    var start = {};
    var end = {};
    var notes = [];

    for (var i = 0; i < ranges; i++) {
      selection.getRangeAt(i, start, end);
      for (var j = start.value; j <= end.value; j++) {
        notes.push(this._notesSorted[j]);
      }
    }

    return notes;
  },

  _setSelectedNotes: function(notes) {
    var index;
    var selection = tree.view.selection;
    var add = false;
    for (var i = 0, l = notes.length; i < l; i++) {
      if ((index = this._notesSorted.indexOf(notes[i])) > -1) {
        selection.rangedSelect(index, index, add);
        add = true;
      }
    }
  },

  clearSelection: function() {
    if(TreeView.selection) {
        TreeView.selection.clearSelection();
    }
    inputBrdcast.setAttribute('disabled', true);
    textBox.value="";
    colorPicker.color = "";
  },

  saveSelectedNote: function() {
    var notes = this._getSelectedNotes();
    if (notes.length === 1) {
      var note = notes[0];
      var update = false;
      var new_color = colorPicker.color;
      var new_text = textBox.value;

      if (new_color !== note.color) {
        note.color = new_color;
        update = true;
      }
      if (new_text !== note.content) {
        note.content = new_text;
        update = true;
      }
      if (update) {
        observer.doObserve = false;
        manager.saveNote(note).then(function(result){
          observer.doObserve = true;
          note.modification_date = result.noteData.modification_date;
          TreeView.treebox.invalidateRow(this._notesSorted.indexOf(note));
        }.bind(this));
      }
    }
  },

  updateNoteWithGUID: function(guid) {
    if (guid in this._notes) {
      var old_note = this._notes[guid];
      manager.getNote(guid).then(function(note) {
        // doube check
        if (guid in this._notes) {
          this._notes[guid] = note;
          var index = this._notesSorted.indexOf(old_note);
          this._notesSorted[index] = note;
          TreeView.treebox.invalidateRow(index);
          if (
            tree.view.selection.isSelected(index) &&
            tree.view.selection.count === 1) {
              this.updateForm();
          }
        }
      }.bind(this));
    }
  },

  deleteSelectedNotes: function() {
    var selection = tree.view.selection;
    if (selection.count > 0 && Dialog.confirmDeletion(selection.count)) {
      observer.doObserve = false;
      var notes = this._getSelectedNotes();
      var deferrds = [];
      for (var i = 0, l = notes.length; i < l; i++) {
        var note = notes[i];
        deferrds.push(manager.deleteNote(note.guid).then(function(note) {
          this._removeNote(note);
        }.bind(this, note)));
      }
      FloatNotesWhen.all(deferrds, function() {
        observer.doObserve = true;
        this.updateNoteCounter();
      }.bind(this));
    }
  },

  removeNoteWithGUID: function(guid) {
    if (guid in this._notes) {
      this._removeNote(this._notes[guid]);
    }
  },

  _removeNote: function(note) {
    var index = this._notesSorted.indexOf(note);
    if (index > -1) {
      this._notesSorted.splice(index, 1);
      TreeView.treebox.rowCountChanged(index, -1);
      tree.view.selection.adjustSelection(index, -1);
      this.updateForm();
    }
  },

  updateForm: function() {
    var selection = tree.view.selection;
    // Multiple notes can be deleted, but only one can be edited
    switch (selection.count) {
      case 0:
        textBox.value = "";
        textBox.disabled = true;
        colorPicker.color = "";
        inputBrdcast.setAttribute('disabled', true);
        deleteButton.disabled = true;
        break;
      case 1:
        var note = this._getSelectedNotes()[0];
        textBox.value = note.content;
        textBox.disabled = false;
        colorPicker.color = note.color;
        inputBrdcast.setAttribute('disabled', false);
        deleteButton.disabled = false;
        break;
      default:
        textBox.value = "";
        textBox.disabled = true;
        colorPicker.color = "";
        inputBrdcast.setAttribute('disabled', true);
        deleteButton.disabled = false;
    }
  },

  _normalize: function(value) {
    if (typeof value === "string") {
      return value.toLowerCase();
    }
    return value;
  },

  _getSortFunctionFor: function(column_name, direction) {
    return function(a, b) {
      var value_a = this._normalize(a[column_name]);
      var value_b = this._normalize(b[column_name]);
      if (value_a > value_b) {
        return 1 * direction;
      }
      if (value_a < value_b) {
        return -1 * direction;
      }
      //tie breaker: name ascending is the second level sort
      if (column_name != "url") {
        var url_a = this._normalize(a[column_name]);
        var url_b = this._normalize(b[column_name]);
        if (url_a > url_b) {
          return 1;
        }
        if (url_a < url_b) {
          return -1;
        }
      }
      return 0;
    }.bind(this);
  },

  sortNotesBy: function(column) {
    var column_name;
    var direction = tree.getAttribute("sortDirection") === "ascending" ? 1 : -1;
    var selected_notes = this._getSelectedNotes();

    if (column) {
      column_name = column.id;
      if (tree.getAttribute("sortResource") === column_name) {
        direction *= -1;
      }
    }
    else {
      column_name = tree.getAttribute("sortResource");
    }

    this._notesSorted.sort(
      this._getSortFunctionFor(column_name, direction)
    );
    //setting these will make the sort option persist
    tree.setAttribute(
      'sortDirection',
      direction === 1 ? "ascending" : "descending"
    );
    tree.setAttribute("sortResource", column_name);
    //set the appropriate attributes to show to indicator
    var cols = tree.getElementsByTagName("treecol");
    for (var i = 0; i < cols.length; i++) {
      cols[i].removeAttribute("sortDirection");
    }
    document.getElementById(column_name).setAttribute(
      "sortDirection",
      direction === 1 ? "ascending" : "descending"
    );
    this._setSelectedNotes(selected_notes);
    this._updateTree();
  }
};

function getTitle(text) {
    var index = text.indexOf("\n");
    if (index >= 0) {
        return " " + text.substring(0, index);
    }
    else {
        return " " + text;
    }
}



var TreeView = {
  getCellText : function(row, column){
    var note = NoteManager.getNoteAtIndex(row);
    var value;
    if (column.id === "content") {
      value = getTitle(note.content);
    }
    else if (column.id === "url") {
      value = note.url;
    }
    else if (column.id === "modification_date") {
      value = note.modification_date.toLocaleString();
    }
    else if (column.id === "creation_date") {
      value = note.creation_date.toLocaleString();
    }
    return value;
    },
  setTree: function(treebox){ this.treebox = treebox; },
  isContainer: function(row){ return false; },
  isSeparator: function(row){ return false; },
  isSorted: function(){ return true; },
  getLevel: function(row){ return 0; },
  getImageSrc: function(row, column){
    var note = NoteManager.getNoteAtIndex(row);
    if (column.id === "content") {
      var url = FloatNotesURLHandler.getNoteUrl(note);
      if(url.charAt(url.length - 1) === '*') {
          url = url.substring(0, url.length);
      }
      try {
        // Some URLs appear to be invalid, e.g. file: URLs
        return faviconService.getFaviconImageForPage(
          ioService.newURI(url, null, null)
        ).spec;
      }
      catch(e) {
        return null;
      }
    }
    return null;
  },
  getRowProperties: function(row,props){},
  getCellProperties: function(row,col,props){},
  getColumnProperties: function(colid,col,props){},
  selectionChanged: function() {
    NoteManager.updateForm();
  },
  cycleHeader: function(col) { },
};

Object.defineProperty(TreeView, 'rowCount', {
  get: function() { return NoteManager.getNumberOfNotes(); }
});

SearchManager.buildList();
observer.registerObserver();
