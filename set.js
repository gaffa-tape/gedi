
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

    var reference = model;

    for(; index < pathLength; index++){
        var key = pathParts[index];

        // if we have hit a non-object property on the reference and we have more keys after this one
        // make an object (or array) here and move on.
        if ((typeof reference[key] !== "object" || reference[key] === null) && index < pathLength - 1) {
            if (!isNaN(key)) {
                reference[key] = [];
            }
            else {
                reference[key] = {};
            }
        }
        if (index === pathLength - 1) {
            // if we are at the end of the line, set to the model
            reference[key] = value;
        }
            //otherwise, RECURSANIZE!
        else {
            reference = reference[key];
        }
    }
}

function overwriteModel(replacement, model){
    for (var modelProp in model) {
        delete model[modelProp];
    }
    for (var replacementProp in replacement) {
        model[replacementProp] = replacement[replacementProp];
    }
}

module.exports = set;