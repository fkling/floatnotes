EXPORTED_SYMBOLS = ['Css'];

var Css = {
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
            else if(node.className.indexOf(cls) == -1) {
                node.className = node.className + " " + cls;
            }
        }
    },
    removeClass: function(node, cls) {
        if(node && node.className && node.className.indexOf(cls) >= 0) {
            var pattern = new RegExp('\\s*' + cls + '\\s*');
            node.className = node.className.replace(pattern, ' ');
        }
    }
}
