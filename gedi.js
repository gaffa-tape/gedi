//Copyright (C) 2012 Kory Nunn

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var Gel = require('gel-js'),
    createSpec = require('spec-js');
//Create gedi
var gediConstructor = newGedi;

//"constants"
gediConstructor.pathSeparator = "/";
gediConstructor.upALevel = "..";
gediConstructor.currentKey = "#";
gediConstructor.rootPath = "";
gediConstructor.pathStart = "[";
gediConstructor.pathEnd = "]";
gediConstructor.pathWildcard = "*";    

var exceptions = {
    invalidPath: 'Invalid path syntax',
    expressionsRequireGel: 'Gel is required to use Expressions in Gedi'
};

var arrayProto = [];


//***********************************************
//
//      Gedi object.
//
//***********************************************

//Creates the public gedi constructor
function newGedi(model) {
        
    // Storage for the applications model 
    model = model || {};

        // Storage for model event handles
    var internalBindings = [],

        // Storage for tracking the dirty state of the model
        dirtyModel = {},

        // Whether model events are paused
        eventsPaused = false,
        
        // gel instance
        gel;
    
    //internal functions

    //***********************************************
    //
    //      IE indexOf polyfill
    //
    //***********************************************

    //IE Specific idiocy

    Array.prototype.indexOf = Array.prototype.indexOf || function (object) {
        fastEach(this, function (value, index) {
            if (value === object) {
                return index;
            }
        });
    };

    // http://stackoverflow.com/questions/498970/how-do-i-trim-a-string-in-javascript
    String.prototype.trim = String.prototype.trim || function () { return this.replace(/^\s\s*/, '').replace(/\s\s*$/, ''); };

    // http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
    Array.isArray = Array.isArray || function (obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    };

    //End IE land.


    //***********************************************
    //
    //      Array Fast Each
    //
    //***********************************************

    function fastEach(array, callback) {
        for (var i = 0; i < array.length; i++) {
            if (callback(array[i], i, array)) break;
        }
        return array;
    }
    
    function pathTokenCallback(value, scopedVariables) {
        return get(resolvePath(scopedVariables._gediModelContext_, value), model);
    }


    //***********************************************
    //
    //      Path token converter
    //
    //***********************************************

    function detectPathToken(substring){
        if (substring.charAt(0) === '[') {
            var index = 1;
                
            do {
                if (
                    (substring.charAt(index) === '\\' && substring.charAt(index + 1) === '\\') || // escaped escapes
                    (substring.charAt(index) === '\\' && (substring.charAt(index + 1) === '[' || substring.charAt(index + 1) === ']')) //escaped braces
                ) {
                    index++;
                }
                else if(substring.charAt(index) === ']'){                        
                    var original = substring.slice(0, index+1);

                    return new PathToken(
                        original,
                        original.length
                    );
                }
                index++;
            } while (index < substring.length);
        }
    }

    //***********************************************
    //
    //      Gel integration
    //
    //***********************************************

    gel = new Gel();

    function PathToken(){}
    PathToken = createSpec(PathToken, Gel.Token);
    PathToken.prototype.precedence = 4;
    PathToken.tokenise = detectPathToken;
    PathToken.prototype.evaluate = function(scope){
        this.result = get(resolvePath(scope.get('_gediModelContext_'), this.original), model);
    };
    gel.tokenConverters.push(PathToken);

    gel.scope.isDirty = function(scope, args){
        var token = args.raw()[0];
        
        return isDirty(resolvePath(scope.get('_gediModelContext_'), (token instanceof PathToken) ? token.original : createPath()));                              
    };

    gel.scope.getAllDirty = function (scope, args) {
        var token = args.raw()[0],
            path = resolvePath(scope.get('_gediModelContext_'), (token instanceof PathToken) && token.original),
            source = get(path, model),
            result,
            itemPath;
            
        if (source == null) {
            return null;
        }

        result = source.constructor();

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                itemPath = resolvePath(path, createPath(key));
                if (result instanceof Array) {
                    isDirty(itemPath) && result.push(source[key]);
                } else {
                    isDirty(itemPath) && (result[key] = source[key]);
                }
            }
        }

        return result;
    };

    //***********************************************
    //
    //      Get
    //
    //***********************************************

    var memoiseCache = {};

    // Lots of similarities between get and set, refactor later to reuse code.
    function get(path, model) {
        if (!path) {
            return model;
        }
            
        var memoiseObject = memoiseCache[path.toString()];
        if(memoiseObject && memoiseObject.model === model){
            return memoiseObject.value;
        }
        
        if(isPathRoot(path)){
            return model;
        }

        var pathParts = pathToParts(path),
            reference = model,
            index = 0,
            pathLength = pathParts.length;

        if(isPathAbsolute(path)){
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
    

    //***********************************************
    //
    //      Overwrite Model
    //
    //***********************************************

    function overwriteModel(replacement, model){
        for (var modelProp in model) {
            delete model[modelProp];
        }
        for (var replacementProp in replacement) {
            model[replacementProp] = replacement[replacementProp];
        }
    }
    

    //***********************************************
    //
    //      Set
    //
    //***********************************************

    function set(path, value, model) {
        // passed a null or undefined path, do nothing.
        if (!path) {
            return;
        }

        memoiseCache = {};

        // If you just pass in an object, you are overwriting the model.
        if (typeof path === "object") {
            value = path;
            path = createRootPath;
        }

        var pathParts = pathToParts(path),
            index = 0,
            pathLength = pathParts.length;

        if(isPathRoot(path)){                
            overwriteModel(value, model);
            return;
        }

        if(isPathAbsolute(path)){
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

    //***********************************************
    //
    //      Remove
    //
    //***********************************************

    function remove(path, model) {
        var reference = model;

        memoiseCache = {};

        var pathParts = pathToParts(path),
            index = 0,
            pathLength = pathParts.length;

        if(isPathRoot(path)){
            overwriteModel({}, model);
            return;
        }

        if(isPathAbsolute(path)){
            index = 1;
        }

        for(; index < pathLength; index++){
            var key = pathParts[index];                
            //if we have hit a non-object and we have more keys after this one
            if (typeof reference[key] !== "object" && index < pathLength - 1) {
                break;
            }
            if (index === pathLength - 1) {
                // if we are at the end of the line, delete the last key

                if (reference instanceof Array) {
                    reference.splice(key, 1);
                } else {
                    delete reference[key];
                }
            } else {
                reference = reference[key];
            }
        }

        return reference;
    }

    
    //***********************************************
    //
    //      Trigger Binding
    //
    //***********************************************

    function trigger(path) {

        var reference = internalBindings,
            references = [reference],
            target = resolvePath('[/]', path);

        function triggerListeners(reference, sink) {
            if (reference != undefined && reference !== null) {
                for(var index = 0; index < reference.length; index++){
                    var callback = reference[index],
                        callbackBinding = callback.binding,
                        callbackBindingParts,
                        parentPath = callback.parentPath,
                        wildcardIndex = callbackBinding.indexOf(gediConstructor.pathWildcard),
                        wildcardMatchFail;

                    if(wildcardIndex >= 0 && getPathsInExpression(callbackBinding)[0] === callbackBinding){

                        //fully resolve the callback path
                        callbackBindingParts = pathToParts(resolvePath('[/]', callback.parentPath, callbackBinding));

                        //null out the now not needed parent path
                        parentPath = null;

                        fastEach(callbackBindingParts, function(pathPart, i){
                            if(pathPart === gediConstructor.pathWildcard){
                                callbackBindingParts[i] = target[i];
                            }else if (pathPart !== target[i]){
                                return wildcardMatchFail = true;
                            }
                        });
                        if(wildcardMatchFail){
                            continue;
                        }
                    }

                    callback({
                        target: target, 
                        getValue: function(scope, returnAsTokens){
                            return modelGet(callbackBinding, parentPath, scope, returnAsTokens);
                        }
                    });
                }
                
                if (sink) {
                    for (var key in reference) {
                        if (reference.hasOwnProperty(key) && Array.isArray(reference[key])) {
                            triggerListeners(reference[key], sink);
                        }
                    }
                }
            }
        }

        var index = 0;

        if(isPathAbsolute(path)){
            index = 1;
        }

        var pathParts = pathToParts(path);

        for(; index < pathParts.length; index++){
            var key = pathParts[index];
            if (!isNaN(key) || key in arrayProto) {
                key = "_" + key;
            }

            if (reference !== undefined && reference !== null) {
                reference = reference[key];
                references.push(reference);
            }
        }

        // Top down, less likely to cause changes this way.

        while (references.length > 1) {
            reference = references.shift();
            triggerListeners(reference);
        }

        triggerListeners(references.pop(), true);
    }

    //***********************************************
    //
    //      Pause Model Events
    //
    //***********************************************

    function pauseModelEvents() {
        eventsPaused = true;
    }

    //***********************************************
    //
    //      Resume Model Events
    //
    //***********************************************

    function resumeModelEvents() {
        eventsPaused = false;
    }

    //***********************************************
    //
    //      Set Binding
    //
    //***********************************************

    function setBinding(binding, callback, parentPath) {

        var path,
            reference = internalBindings;
        
        callback.binding = callback.binding || binding;
        callback.parentPath = parentPath;
        if(!callback.references){
            callback.references = [];
        }

        //If the binding has opperators in it, break them apart and set them individually.
        if (!createPath(binding)) {
            var paths = getPathsInExpression(binding);

            fastEach(paths, function (path) {
                setBinding(path, callback, parentPath);
            });
            return;
        }

        path = binding;
                    
        if (parentPath) {
            path = resolvePath(createRootPath(), parentPath, path);
        }

        callback.references.push(path);

        // Handle wildcards

        var firstWildcardIndex = path.indexOf(gediConstructor.pathWildcard);
        if(firstWildcardIndex>=0){
            path = path.slice(0, firstWildcardIndex);                
        }
        
        if(isPathRoot(path)){
            reference.push(callback);
            return;
        }

        var index = 0;

        if(isPathAbsolute(path)){
            index = 1;
        }

        var pathParts = pathToParts(path);

        for(; index < pathParts.length; index++){
            var key = pathParts[index];

            //escape properties of the array with an underscore.
            // numbers mean a binding has been set on an array index.
            // array property bindings like length can also be set, and thats why all array properties are escaped.
            if (!isNaN(key) || key in arrayProto) {
                key = "_" + key;
            }

            //if we have more keys after this one
            //make an array here and move on.
            if (typeof reference[key] !== "object" && index < pathParts.length - 1) {
                reference[key] = [];
                reference = reference[key];
            }
            else if (index === pathParts.length - 1) {
                // if we are at the end of the line, add the callback
                reference[key] = reference[key] || [];
                reference[key].push(callback);
            }
                //otherwise, RECURSANIZE! (ish...)
            else {
                reference = reference[key];
            }
        }
    }


    //***********************************************
    //
    //      Remove Binding
    //
    //***********************************************
    
    function removeBinding(path, callback){
        var callbacks;
        
        if(typeof path === 'function'){
            callback = path;
            path = null;
        }

        var parentPath = callback ? callback.parentPath : null;
        
        if(path == null){
            if(callback != null && callback.references){
                fastEach(callback.references, function(path){                        
                    removeBinding(path, callback);
                });
            }else{
                internalBindings = [];
            }
            return;
        }

        var paths = getPathsInExpression(path);
        if(paths.length > 1){
            fastEach(paths, function(path){
                removeBinding(path, callback);
            });
            return;
        }

        var resolvedPathParts = pathToParts(resolvePath(parentPath, path)),
            bindingPathParts = [];

        for(var i = 0; i < resolvedPathParts.length; i++){
            if(parseInt(resolvedPathParts[i]).toString() === resolvedPathParts[i]){
                bindingPathParts[i] = '_' + resolvedPathParts[i];
            }else{
                bindingPathParts[i] = resolvedPathParts[i];
            }
        }

        var escapedPath = createPath(bindingPathParts);

        if(!callback){
            set(escapedPath, [], internalBindings);
        }
        
        callbacks = get(escapedPath, internalBindings);            

        if(!callbacks){
            return;
        }

        for (var i = 0; i < callbacks.length; i++) {                
            if(callbacks[i] === callback){
                callbacks.splice(i, 1);
                return;
            }
        }
    }


    //***********************************************
    //
    //      Get Paths
    //
    //***********************************************
    var memoisedExpressionPaths = {};
    function getPathsInExpression(expression) {
        var paths = [];

        if(memoisedExpressionPaths[expression]){
            return memoisedExpressionPaths[expression];
        }

        if (gel) {
            var tokens = gel.tokenise(expression);
            for(var index = 0; index < tokens.length; index++){
            var token = tokens[index];
                if(token instanceof PathToken){
                    paths.push(token.original);
                }
            }
        } else {
            return memoisedExpressionPaths[expression] = [createPath(expression)];
        }
        return memoisedExpressionPaths[expression] = paths;
    }

    //***********************************************
    //
    //      Path to Raw
    //
    //***********************************************

    function pathToRaw(path) {
        return path && path.slice(1, -1);
    }

    //***********************************************
    //
    //      Raw To Path
    //
    //***********************************************

    function rawToPath(rawPath) {
        return gediConstructor.pathStart + (rawPath == null ? '' : rawPath) + gediConstructor.pathEnd;
    }

    //***********************************************
    //
    //      Get Absolute Path
    //
    //***********************************************

    var memoisePathCache = {};
    function resolvePath() {
        var memoiseKey = '';

        for(var argumentIndex = 0; argumentIndex < arguments.length; argumentIndex++){
            memoiseKey += arguments[argumentIndex];
        }

        if(memoisePathCache[memoiseKey]){
            return memoisePathCache[memoiseKey];
        }

        var absoluteParts = [],
            lastRemoved,
            pathParts,
            pathPart;

        for(var argumentIndex = 0; argumentIndex < arguments.length; argumentIndex++){
            pathParts = pathToParts(arguments[argumentIndex]);

            if(!pathParts || !pathParts.length){
                continue;
            }

            for(var pathPartIndex = 0; pathPartIndex < pathParts.length; pathPartIndex++){
                pathPart = pathParts[pathPartIndex];

                if(pathParts.length === 0){
                    // Empty path, maintain parent path.
                } else if (pathPart === gediConstructor.currentKey) {
                    // Has a last removed? Add it back on.
                    if(lastRemoved != null){
                        absoluteParts.push(lastRemoved);
                        lastRemoved = null;
                    }
                } else if (pathPart === gediConstructor.rootPath) {
                    // Root path? Do nothing
                    absoluteParts = [''];

                } else if (pathPart === gediConstructor.upALevel) {
                    // Up a level? Remove the last item in absoluteParts
                    lastRemoved = absoluteParts.pop();
                } else if (pathPart.slice(0,2) === gediConstructor.upALevel) {
                    var argument = pathPart.slice(2);
                    //named
                    while(absoluteParts.slice(-1).pop() !== argument){
                        if(absoluteParts.length === 0){
                            throw "Named path part was not found: '" + pathPart + "', in path: '" + path + "'.";
                        }
                        lastRemoved = absoluteParts.pop();
                    }
                } else {
                    // any following valid part? Add it to the absoluteParts.
                    absoluteParts.push(pathPart);
                }
            }
        }

        // Convert the absoluteParts to a Path and memoise the result.
        return memoisePathCache[memoiseKey] = createPath(absoluteParts);
    }

    //***********************************************
    //
    //      Model Get
    //
    //***********************************************

    function modelGet(binding, parentPath, scope, returnAsTokens) {
        if(parentPath && typeof parentPath !== "string"){
            scope = parentPath;
            parentPath = createPath();
        }

        if (binding && gel) {
            var gelResult,
                expression = binding;

            scope = scope || {};

            scope['_gediModelContext_'] = parentPath;

            return gel.evaluate(expression, scope, returnAsTokens);
        }
        
        parentPath = parentPath || createPath();
        
        binding = resolvePath(parentPath, binding);
        
        return get(binding, model);
    }

    //***********************************************
    //
    //      Model Set
    //
    //***********************************************

    function modelSet(path, value, parentPath, dirty) {
        if(typeof path === 'object' && !createPath(path)){
            dirty = value;
            value = path;
            path = createRootPath();
        }else if(typeof parentPath === 'boolean'){
            dirty = parentPath;
            parentPath = undefined;
        }
        
        parentPath = parentPath || createPath();
        
        path = resolvePath(parentPath, path);

        setDirtyState(path, dirty);
        set(path, value, model);
        trigger(path);
    }

    //***********************************************
    //
    //      Model Remove
    //
    //***********************************************

    function modelRemove(path, parentPath, dirty) {
        if(parentPath instanceof Boolean){
            dirty = parentPath;
            parentPath = undefined;
        }
        
        parentPath = parentPath || createPath();
        
        path = resolvePath(parentPath, path);            
        
        setDirtyState(path, dirty);

        var reference = remove(path, model);

        if(Array.isArray(reference)){
            //trigger one above
            path = resolvePath('[/]', path.append('..'));
        }

        trigger(path);
    }

    //***********************************************
    //
    //      Set Dirty State
    //
    //***********************************************  

    function setDirtyState(path, dirty, parentPath) {

        var reference = dirtyModel;
        
        if(!createPath(path)){
            throw exceptions.invalidPath;
        }

        parentPath = parentPath || createPath();
        

        dirty = dirty !== false;

        if(isPathRoot(path)){                
            dirtyModel = {
                '_isDirty_': dirty
            };
            return;
        }

        var index = 0;

        if(isPathAbsolute(path)){
            index = 1;
        }

        var pathParts = pathToParts(resolvePath(parentPath, path));

        for(; index < pathParts.length; index++){
            var key = pathParts[index];
            if ((typeof reference[key] !== "object" || reference[key] === null) && index < pathParts.length - 1) {
                reference[key] = {};
            }
            if (index === pathParts.length - 1) {
                reference[key] = {};
                reference[key]['_isDirty_'] = dirty;
            }
            else {
                reference = reference[key];
            }
        }
        
        if(!pathParts.length){
            dirtyModel['_isDirty_'] = dirty;
        }
    }

    //***********************************************
    //
    //      Is Dirty
    //
    //***********************************************  

    function isDirty(path) {
        var reference,
            hasDirtyChildren = function (ref) {
                if (typeof ref !== 'object') {
                    return false;
                }
                if (ref['_isDirty_']) {
                    return true;
                } else {
                    for (var key in ref) {
                        if (hasDirtyChildren(ref[key])) {
                            return true;
                        }
                    }
                }
            };

        reference = get(path, dirtyModel);

        return !!hasDirtyChildren(reference);
    }

    //Public Objects ******************************************************************************

    var memoisedPathTokens = {};

    function createPath(path){

        if(path == null){
            return rawToPath();
        }

        // passed in an Expression or an 'expression formatted' Path (eg: '[bla]')            
        if(memoisedPathTokens[path]){
            return memoisedPathTokens[path];
        }else if (typeof path === "string"){
            if(path.charAt(0) === gediConstructor.pathStart) {
                var pathString = path.toString(),
                    detectedPathToken = detectPathToken(pathString);

                if (detectedPathToken && detectedPathToken.length === pathString.length) {
                    return memoisedPathTokens[pathString] = detectedPathToken.original;
                } else {
                    return false;
                }
            }else{
                return createPath(rawToPath(path));
            }
        }

        if(path instanceof Array) {
            
            var parts = [];
            for (var i = 0; i < path.length; i++) {
                var pathPart = path[i];
                if(pathPart.indexOf('\\') >= 0){
                    pathPart = pathPart.replace(/([\[|\]|\\|\/])/g, '\\$1');
                }
                parts.push(pathPart);
            }
            return rawToPath(path.join(gediConstructor.pathSeparator));
        }
    }

    function createRootPath(){
        return createPath([gediConstructor.rootPath]);
    }

    function pathToParts(path){
        if(!path){
            return;
        }
        if(Array.isArray(path)){
            return path;
        }

        path = path.slice(1,-1);

        var lastPartIndex = 0,
            parts,
            nextChar,
            currentChar;

        if(path.indexOf('\\') < 0){
            if(path === ""){
                return [];
            }
            return path.split(gediConstructor.pathSeparator);
        }

        parts = [];

        for(var i = 0; i < path.length; i++){
            currentChar = path.charAt(i);
            if(currentChar === gediConstructor.pathSeparator){
                parts.push(path.slice(lastPartIndex,i));
                lastPartIndex = i+1;
            }else if(currentChar === '\\'){
                nextChar = path.charAt(i+1);
                if(nextChar === '\\'){
                    path = path.slice(0, i) + path.slice(i + 1);
                    i++;
                }else if(nextChar === ']' || nextChar === '['){
                    path = path.slice(0, i) + path.slice(i + 1);
                }else if(nextChar === gediConstructor.pathSeparator){
                    i++;
                }
            }
        }
        parts.push(path.slice(lastPartIndex));

        return parts;
    }

    function appendPath(){
        var parts = pathToParts(arguments[0]);

        for (var argumentIndex = 1; argumentIndex < arguments.length; argumentIndex++) {
            var pathParts = pathToParts(arguments[argumentIndex]);
            for (var partIndex = 0; partIndex < pathParts.length; partIndex++) {
                    parts.push(pathParts[partIndex]);
            }
        }

        return createPath(parts);
    }

    function isPathAbsolute(path){
        return pathToParts(path)[0] === gediConstructor.rootPath;
    }

    function isPathRoot(path){
        var parts = pathToParts(path);
        return (isPathAbsolute(parts) && parts[0] === parts[1]) || parts.length === 0;
    }

    function Gedi() {
        
    }

    Gedi.prototype = {
        paths: {
            create: createPath,
            resolve: resolvePath,
            isRoot: isPathRoot,
            isAbsolute: isPathAbsolute,
            append: appendPath
        },

        get: modelGet,

        set: modelSet,

        remove: modelRemove,
        
        utils: {
            get:get,
            set:set
        },

        init: function (model) {
            this.set(model, false);
        },

        bind: setBinding,

        debind: removeBinding,

        trigger: trigger,

        isDirty: isDirty,

        setDirtyState: setDirtyState,

        gel: gel, // expose gel instance for extension

        getNumberOfBindings: function(){
            function getNumCallbacks(reference){
                var length = reference.length;
                for (var key in reference) {
                    if(isNaN(key)){
                        length += getNumCallbacks(reference[key]);
                    }
                }
                return length;
            }

            return getNumCallbacks(internalBindings);
        }
    };

    return new Gedi();
}

module.exports = gediConstructor;