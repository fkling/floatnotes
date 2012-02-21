"use strict";
/*global document:true, window:true*/

Components.utils['import']("resource://floatnotes/util-Locale.js");
Components.utils['import']("resource://floatnotes/SQLiteDatabase.js");
/*global Locale:true FloatNotesSQLiteDatabase:true*/

function openHelp() {
    var helpURL = document.getElementsByTagName("prefwindow")[0].currentPane.helpTopic;
    openUILinkIn(helpURL, 'tab');
}
function enableHashUrls() {
    var value = document.getElementById('location-enableHash').checked;
    document.getElementById('location-includePageHash').disabled = !value;
    var elements = document.querySelectorAll('.hash_url');
    for(var i = elements.length; i--; ) {
        if(elements[i].selected) {
            elements[i].parentNode.selectedIndex = 0;
        }
        elements[i].disabled  = !value;
    }
} 

function getDisplayName(file) {

}

function readDbLocation() {
    var location = +document.getElementById('dbLocation').value,
    dbDir = document.getElementById('dbDir'),
    chooseDb = document.getElementById('chooseDir');

    dbDir.disabled = chooseDb.disabled = location !== 1;
}

function updateDbFile(from, to) {
    var  db = FloatNotesSQLiteDatabase.getInstance(),
    move = true, merge = false, cancel = false;
    if(!from.equals(to) && to.exists()) {
        //TODO: Ask for merge, overwrite, cancel
    }

    if(move && !cancel) { // move or override DB
        db.moveTo(to);
        return true;
    }
    else if(merge) { // merge previous and existing DB
        return true;
    }
    else if(!move && !cancel) { // discard current DB
        db.setDatabase(to);
        return true;
    }
    return false;
}

/**
   * Displays a file picker in which the user can choose the location where
   * downloads are automatically saved, updating preferences and UI in
   * response to the choice, if one is made.
*/
function chooseFile() {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var nsILocalFile = Components.interfaces.nsILocalFile;

    var fp = Components.classes["@mozilla.org/filepicker;1"]
    .createInstance(nsIFilePicker);
    var title = Locale.get("storage.chooseDbFolderTitle");
    fp.init(window, title, nsIFilePicker.modeSave);
    fp.appendFilters(nsIFilePicker.filterAll);

    var currentDir = document.getElementById("dbDir");

    // First try to open what's currently configured
    if (currentDir.value) {
        fp.displayDirectory = getFile(currentDir.value);
    }
    var result = fp.show();
    if (result == nsIFilePicker.returnOK || result == nsIFilePicker.returnReplace) {
        var currentFile = FloatNotesSQLiteDatabase.getInstance().getStorageFile();
        if(updateDbFile(currentFile, fp.file)) {
            currentDir.value = fp.file.path;
        }
    }
}

function displayFilePref() {
    var currentDirPref = document.getElementById("dbDir"),
        dbFileField = document.getElementById('dbFileField');

    if(currentDirPref.value) {
        // Used in defining the correct path to the folder icon.
        var ios = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
        var fph = ios.getProtocolHandler("file")
        .QueryInterface(Components.interfaces.nsIFileProtocolHandler);

        dbFileField.label = currentDirPref.value;

        dbFileField.image = "moz-icon://" +  fph.getURLSpecFromFile(getFile(currentDirPref.value)) + "?size=16";

            // don't override the preference's value in UI
    }
    else {
        dbFileField.label = '';
        dbFileField.image = '';
    }
    return undefined;
}

function updateDb() {
    var currentLocation = +this.value,
        db = FloatNotesSQLiteDatabase.getInstance(),
        dbDir =  document.getElementById("dbDir");
    if(currentLocation === 0) {
        updateDbFile(db.getStorageFile(), db.getDefaultStorageFile());
        dbDir.value = '';
    }
    else if(!dbDir.value) {
        chooseFile();        
    }
    return currentLocation;
}

function getFile(path) {
    var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(path);
    return file;
}
enableHashUrls();

