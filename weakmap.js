var WM;

window.WeakMap = window.WeakMap || function () {
    var privates = Name()

    return {
        get: function (key, fallback) {
            var store = privates(key)
            return store.hasOwnProperty("value") ?
                store.value : fallback
        },
        set: function (key, value) {
            privates(key).value = value
        },
        has: function(key) {
            return "value" in privates(key)
        },
        "delete": function (key) {
            return delete privates(key).value
        }
    }

    function namespace(obj, key) {
        var store = { identity: key },
            valueOf = obj.valueOf

        Object.defineProperty(obj, "valueOf", {
            value: function (value) {
                return value !== key ?
                    valueOf.apply(this, arguments) : store
            },
            writable: true
        })

        return store
    }

    function Name() {
        var key = {}
        return function (obj) {
            var store = obj.valueOf(key)
            return store && store.identity === key ?
                store : namespace(obj, key)
        }
    }
};

if(typeof WeakMap !== 'undefined'){
    WM = WeakMap;
}else if(typeof window !== 'undefined'){
    var rv = -1; // Return value assumes failure.
    if (navigator.appName == 'Microsoft Internet Explorer'){
        var match = navigator.userAgent.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/);
        if (match && match[1] <= 9){
            WM = require('leak-map');
        }
    }
}

WM || (WM = require('weak-map'));

module.exports = WM;