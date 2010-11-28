/* note properties */
pref("extensions.floatnotes.width", 150);
pref("extensions.floatnotes.height", 200);
pref("extensions.floatnotes.color", "#FCFACF");
pref("extensions.floatnotes.transparency", "0.9");

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

/* interface */
pref("extensions.floatnotes.showIndicator", true);
pref("extensions.floatnotes.fadeOutAfter", 3);
pref("extensions.floatnotes.scrolltimer", 100);

/* notes manager */
pref("extensions.floatnotes.savedSearches", '[]');

/* notifications */
pref("extensions.floatnotes.confirmDelete", true);
pref("extensions.floatnotes.showUriNotSupported", true);

/* meta data */
pref("extensions.floatnotes.firstrun", true);
pref("extensions.floatnotes.version", "0.0");
