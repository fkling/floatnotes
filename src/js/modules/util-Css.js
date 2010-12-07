EXPORTED_SYMBOLS = ['Css'];

var Css = (function() {
    var util = {
        css: function(node, style) {
            if(node && node.style) {
                for (var key in style) {
                    node.style[key] = style[key];
                }
            }
        },
        show: function(node) {
            if(node && node.style) {
                node.style.display = "block";
            }
        },
        hide: function(node) {
            if(node && node.style) {
                node.style.display = "none";
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
                var pattern = new RegExp('\\b' + cls + '\\b');
                node.className = node.className.replace(pattern, ' ');
            }
        },
        hasClass: function(node, class) {
            if(node && node.className) {
                var pattern = new RegExp('\\b' + class + '\\b');
                return pattern.test(node.className);
            }
            return false;
        },
        toggleClass: function(node, class) {
            if(util.hasClass(node, class)) {
                util.removeClass(node, class);
            }
            else {
                util.addClass(node, class);
            }
        }
    };
    return util;
}());
