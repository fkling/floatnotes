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
                var className = node.className.replace(pattern, ' ');
                node.className = className.replace(/\s+/, ' ');
            }
        },
        hasClass: function(node, class) {
            if(node && node.className) {
                var pattern = new RegExp('\\b' + class + '\\b');
                return pattern.test(node.className);
            }
            return false;
        },
        hasAncestorWithClass: function(node, class) {
            if(node && node.parentNode) {
                do {
                    node = node.parentNode;
                }
                while(!util.hasClass(node, class) && node !== null) ;
                return node !== null;
            }
            return false;
        },
        isOrIsContained: function(target, class) {
            return util.hasClass(target, class) ? true : util.hasAncestorWithClass(target, class);
        },
        toggleClass: function(node, class) {
            if(util.hasClass(node, class)) {
                util.removeClass(node, class);
            }
            else {
                util.addClass(node, class);
            }
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
       }
    };
    return util;
}());
