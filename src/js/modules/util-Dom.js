EXPORTED_SYMBOLS = ['Dom'];

var Dom = {
    removeChildren: function(node) {
        while(node.hasChildNodes()) {
            node.removeChild(node.firstChild);
        }
    },

    fireEvent: function(document, element,event) {
        if(document.createEvent) {
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent(event, true, true ); // event type,bubbling,cancelable
            return !element.dispatchEvent(evt);
        }
    }
}
