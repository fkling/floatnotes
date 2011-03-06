EXPORTED_SYMBOLS = ['Dom'];

var events = {};

var Dom = {
    removeChildren: function(node) {
        while(node.hasChildNodes()) {
            node.removeChild(node.firstChild);
        }
    },

    fireEvent: function(document, element, event) {
        if(document.createEvent) {
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent(event, true, true ); // event type,bubbling,cancelable
            return !element.dispatchEvent(evt);
        }
    },

    propagateEvent: function(element, event) {
        return !element.dispatchEvent(event);
    },

    addEventListener: function(id, target, event, func, capture) {
        capture = capture || false;
        target.addEventListener(event, func, capture);
        events[id] = {target: target, event: event, func: func, capture: capture};
    },

    removeEventListener: function(id) {
        var event = events[id];
        if(event) {
            event.target.removeEventListener(event.event, event.func, event.capture);
        }
    }
}
