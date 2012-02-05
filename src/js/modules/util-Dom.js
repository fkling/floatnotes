//!#include "../header.js"
"use strict";

var EXPORTED_SYMBOLS = ['Dom'];

var events = {};

var Dom = {
    removeChildren: function(node) {
        while(node.firstChild) {
            node.removeChild(node.firstChild);
        }
    },

    detach: function(node) {
        if(node.parentNode) {
            node.parentNode.removeChild(node);
        }
        return node;
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
    },

    scrollWindow: function(e, window) {
        var x, y;
        if(e.pageY < window.pageYOffset) {
            y = e.pageY - window.pageYOffset;
        }
        else if (e.pageY > window.innerHeight + window.pageYOffset) {
            y = e.pageY - (window.innerHeight + window.pageYOffset);
        }

        if(e.pageX < window.pageXOffset) {
            x = e.pageX - window.pageXOffset;
        }
        else if (e.pageX > window.innerWidth + window.pageXOffset) {
            x = e.pageX - (window.innerWidth + window.pageXOffset);
        }

        if(x || y) { LOG('Scroll detect by x:' + x + ' and y:' + y);
            window.scrollBy(x,y);
        }
    }
};
