var paths = require('gedi-paths'),
    memoiseCache = {};

// Lots of similarities between get and set, refactor later to reuse code.
function get(path, model) {
    if (!path) {
        return model;
    }

    var memoiseObject = memoiseCache[path];
    if(memoiseObject && memoiseObject.model === model){
        return memoiseObject.value;
    }

    if(paths.isRoot(path)){
        return model;
    }

    var pathParts = paths.toParts(path),
        reference = model,
        index = 0,
        pathLength = pathParts.length;

    if(paths.isAbsolute(path)){
        index = 1;
    }

    for(; index < pathLength; index++){
        var key = pathParts[index];

        if (reference == null) {
            break;
        } else if (typeof reference[key] === "object") {
            reference = reference[key];
        } else {
            reference = reference[key];

            // If there are still keys in the path that have not been accessed,
            // return undefined.
            if(index < pathLength - 1){
                reference = undefined;
            }
            break;
        }
    }

    memoiseCache[path] = {
        model: model,
        value: reference
    };

    return reference;
}

function overwriteModel(replacement, model){
    if(typeof replacement !== 'object' || replacement === null){
        throw "The model must be an object";
    } 
    if(replacement === model){
        return;
    }
    for (var modelProp in model) {
        delete model[modelProp];
    }
    for (var replacementProp in replacement) {
        model[replacementProp] = replacement[replacementProp];
    }
}

function set(path, value, model) {
    // passed a null or undefined path, do nothing.
    if (!path) {
        return;
    }

    memoiseCache = {};

    // If you just pass in an object, you are overwriting the model.
    if (typeof path === "object") {
        value = path;
        path = paths.createRoot();
    }

    var pathParts = paths.toParts(path),
        index = 0,
        pathLength = pathParts.length;

    if(paths.isRoot(path)){
        overwriteModel(value, model);
        return;
    }

    if(paths.isAbsolute(path)){
        index = 1;
    }

    var reference = model,
        keysChanged,
        previousReference,
        previousKey;

    for(; index < pathLength; index++){
        var key = pathParts[index];

        // if we have hit a non-object property on the reference and we have more keys after this one
        // make an object (or array) here and move on.
        if ((typeof reference !== "object" || reference === null) && index < pathLength) {
            if (!isNaN(key)) {
                reference = previousReference[previousKey] = [];
            }
            else {
                reference = previousReference[previousKey] = {};
            }
        }
        if (index === pathLength - 1) {
            // if we are at the end of the line, set to the model
            if(!(key in reference)){
                keysChanged = true;
            }
            reference[key] = value;
        }
            //otherwise, dig deeper
        else {
            previousReference = reference;
            previousKey = key;
            reference = reference[key];
        }
    }

    return keysChanged;
}

module.exports = {
    get: get,
    set: set
};