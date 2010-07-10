#if DEBUG
#include "../test/floatnotestest.js"
window.floatnotestest = new FNT(new FloatNotes());
window.addEventListener("load", function(event){floatnotestest.init();}, false);

#else

window.gFloatNotes = new FloatNotes();
window.addEventListener("load", function(event){gFloatNotes.init();}, false);
window.addEventListener("contextmenu", function(e) {gFloatNotes.updateContext(e);}, true);
window.addEventListener("contextmenu", function(e) {gFloatNotes.updateMenuItems(e);}, false);

#endif