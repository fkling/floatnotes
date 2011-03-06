EXPORTED_SYMBOLS = ['Js'];

var Js = {
    removeObjectFromArray: function(object, array) {
        var index = array.indexOf(object);
        if(index >= 0) {
            array.splice(index, 1);
        }
    },

    updateObject: function(object, values) {
        for(var attr in object) {
            var value = values[attr];
            if(object.hasOwnProperty(attr) && value) {
                object[attr] = value;
            }
        }
    },

    bind: function(func, obj) {
        if(typeof Function.prototype.bind === "function") {
            return func.bind(obj);
        }
        else {
            return function() {
                func.apply(obj, arguments);
            }
        }
    }
}
