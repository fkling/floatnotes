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
    }
}
