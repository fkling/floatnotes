//!#include "../header.js"
"use strict";
var EXPORTED_SYMBOLS = ['Css'];


function min3(a,b,c) { return (a<b)?((a<c)?a:c):((b<c)?b:c); }
function max3(a,b,c) { return (a>b)?((a>c)?a:c):((b>c)?b:c); }

function HueShift(h,s) {
    h+=s;
    while (h>=360.0) {
        h-=360.0;
    }
    while (h<0.0) {
        h+=360.0;
    }
    return h;
}

function RGB2HSV (rgb) {
    var hsv = {},
    R = rgb.r / 255,
    G = rgb.g / 255,
    B = rgb.b / 255,
    M = max3(R, G, B),
    m = min3(R, G, B),
    C = M - m;

    if (hsv.saturation === 0) {
        hsv.hue = undefined;
    }
    else if (R == M) {
        hsv.hue = ((G - B) / C) % 6;
    }
    else if (G == M) {
        hsv.hue = ((B - R) / C) + 2;
    }
    else if (B == M) {
        hsv.hue = ((R - G) / C) + 4;
    }
    hsv.hue *= 60;

    hsv.value = M;
    hsv.saturation = C === 0 ? 0 : C / hsv.value;
    return hsv;
}

// RGB2HSV and HSV2RGB are based on Color Match Remix [http://color.twysted.net/]
// which is based on or copied from ColorMatch 5K [http://colormatch.dk/]
function HSV2RGB(hsv) {
    var rgb_,
    C = hsv.value * hsv.saturation,
    H = hsv.hue / 60,
    X = C * (1 - Math.abs((H % 2) - 1)),
    m = hsv.value - C;

    if(typeof hsv.hue === 'undefined') {
        rgb_ = [0, 0, 0];
    }
    else if(0 <= H && H < 1) {
        rgb_ = [C, X, 0];
    }
    else if(1 <= H && H < 2) {
        rgb_ = [X, C, 0];
    }
    else if(2 <= H && H < 3) {
        rgb_ = [0, C, X];
    }
    else if(3 <= H && H < 4) {
        rgb_ = [0, X, C];
    }
    else if(4 <= H && H < 5) {
        rgb_ = [X, 0, C];
    }
    else if(5 <= H && H < 6) {
        rgb_ = [C, 0, X];
    }

    return {
        r: Math.round((rgb_[0] + m) * 255),
        g: Math.round((rgb_[1] + m) * 255),
        b: Math.round((rgb_[2] + m) * 255)
    };
}


var hexdig='0123456789ABCDEF';
function Dec2Hex(d) {
    return hexdig.charAt((d-(d%16))/16)+hexdig.charAt(d%16);
}


var Css = (function() {
    var util = {
        // Generates the CSS named used in the plugin
        name: function(name) {
            return name + '@U@';
        },
        css: function(node, property, value) {
            if(arguments.length === 2) {
                if(typeof property === 'string') {
                    return node.style[property];
                }
                else {
                    var style = node.style;
                    for(var prop in property) {
                        style[prop] = property[prop];
                    }
                }
            }
            else if(arguments.length === 3) {
                node.style[property] = value;
            }
        },
        show: function() {
            for(var i = arguments.length; i--; ) {
                var node = arguments[i];
                if(node.style) {
                    node.style.display = "block";
                }
            }
        },
        hide: function() {
            for(var i = arguments.length; i--; ) {
                var node = arguments[i];
                if(node.style) {
                    node.style.display = "none";
                }
            }
        },
        addClass: function(node, cls) {
            if(node) {
                if(!node.className) {
                    node.className = cls;
                }
                else if(!util.hasClass(node, cls)) {
                    node.className = node.className + " " + cls;
                }
            }
        },
        removeClass: function(node, cls) {
            if(node && node.className && util.hasClass(node, cls)) {
                var className = (' ' + node.className + ' ').replace(' ' + cls + ' ', ' ');
                node.className = className.replace(/\s+/, ' ').replace(/^\s+|\s+$/g, '');
            }
        },
        hasClass: function(node, cls) {
            return node && node.classList && node.classList.contains(cls);
        },
        toggleClass: function(node, cls, add) {
            if(node && (add || typeof add === 'undefined' && !Css.hasClass(node, cls))) {
                Css.addClass(node, cls);
            }
            else if(node && (typeof add !== 'undefined' && !add ||  Css.hasClass(node, cls))) {
                Css.removeClass(node, cls);
            }
        },
        hasAncestorWithClass: function(node, cls) {
            if(node && node.parentNode) {
                do {
                    node = node.parentNode;
                }
                while(!util.hasClass(node, cls) && node !== null) ;
                return node !== null;
            }
            return false;
        },
        isOrIsContained: function(target, cls) {
            return (util.hasClass(target, cls) || util.hasAncestorWithClass(target, cls));
        },
        findHighestZIndex: function(document, elem) {
            var elems = document.getElementsByTagName(elem);
            var highest = 0;
            for (var i = 0; i < elems.length; i++) {
                var zindex=document.defaultView.getComputedStyle(elems[i],null).getPropertyValue("z-index");
                if ((zindex > highest) && (zindex != 'auto')) {
                    highest = zindex;
                }
            }
            return highest;
        },
        isDarkColor: function(rgb) {
            var values = rgb.match(/\w{2}/g);
            return (parseInt(values[0], 16) + parseInt(values[1], 16) + parseInt(values[2], 16)) / 3 <= 128; 
        }
    };
    return util;
}());
