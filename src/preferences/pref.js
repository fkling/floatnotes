/*storage*/
pref("extensions.floatnotes.dbLocation", 0);
pref("extensions.floatnotes.dbDir", "");


/* note properties */
pref("extensions.floatnotes.width", 150);
pref("extensions.floatnotes.height", 150);
pref("extensions.floatnotes.color", "#FCFACF");
pref("extensions.floatnotes.transparency", "0.9");
pref("extensions.floatnotes.draggingTransparency", "0.8");
pref("extensions.floatnotes.fontSize", 13);

/* location */

/*
 Default URL for notes:
 -1 : Complete URL inluding search string (if any)
 -2 : URL without search string
 -3 : Wildcard URL
 -4: Complete URL including anchor
 0 : Wildcard host
*/
pref("extensions.floatnotes.location", -2);
pref("extensions.floatnotes.updateOnHashChange", false);
pref("extensions.floatnotes.includePageForHashURLs", true);
pref("extensions.floatnotes.ignoreProtocol", true);

/* interface */
pref("extensions.floatnotes.showIndicator", true);
pref("extensions.floatnotes.fadeOutAfter", 3);
pref("extensions.floatnotes.scrolltimer", 100);
pref("extensions.floatnotes.showMenu", true);
pref("extensions.floatnotes.showContextHide", false);
pref("extensions.floatnotes.showContextDelete", false);

/* notes manager */
pref("extensions.floatnotes.savedSearches", '[]');

/* notifications */
pref("extensions.floatnotes.confirmDelete", true);
pref("extensions.floatnotes.showSiteNotSupported", true);

/* meta data */
pref("extensions.floatnotes.firstrun", true);
pref("extensions.floatnotes.version", "0.0");
