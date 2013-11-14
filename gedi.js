//Copyright (C) 2012 Kory Nunn

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var Gel = require('gel-js'),
    HybridMap = require('hybrid-map').HybridMap,
    createPathToken = require('./pathToken'),
    Token = Gel.Token,
    paths = require('gedi-paths'),
    pathConstants = paths.constants,
    createSpec = require('spec-js');

//Create gedi
var gediConstructor = newGedi;

var exceptions = {
    invalidPath: 'Invalid path syntax'
};

var arrayProto = [];
var isBrowser = typeof Node != 'undefined';


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

        // Storage for tracking references within the model
        modelReferences = new HybridMap(),

        // Storage for tracking the dirty state of the model
        dirtyModel = {},

        // gel instance
        gel,

        PathToken = createPathToken(get, model);

    // Add a new object who's references should be tracked.
    function addModelReference(path, object){
        if(!object || typeof object !== 'object'){
            return;
        }

        var path = paths.resolve(paths.createRoot(),path),
            objectReferences = modelReferences.get(object);

        if(!objectReferences){
            objectReferences = {};
            modelReferences.set(object, objectReferences);
        }

        if(!(path in objectReferences)){
            objectReferences[path] = null;
        }

        if(isBrowser && object instanceof Node){
            return;
        }

        for(var key in object){
            var prop = object[key];

            // Faster to check again here than to create pointless paths.
            if(prop && typeof prop === 'object' && !modelReferences.has(prop)){
                addModelReference(paths.append(path, paths.create(key)), prop);
            }
        }
    }

    function removeModelReference(path, object){
        if(!object || typeof object !== 'object'){
            return;
        }

        var path = paths.resolve(paths.createRoot(),path),
            objectReferences = modelReferences.get(object),
            refIndex;

        if(!objectReferences){
            return;
        }

        delete objectReferences[path];

        if(!Object.keys(objectReferences).length){
            modelReferences.del(object);
        }

        for(var key in object){
            var prop = object[key];

            // Faster to check again here than to create pointless paths.
            if(prop && typeof prop === 'object' && prop !== object){
                removeModelReference(paths.append(path, paths.create(key)), prop);
            }
        }
    }

    function triggerModelReferences(targetPath){
        var parentPath = paths.resolve(paths.createRoot(), targetPath, paths.create(pathConstants.upALevel)),
            parentObject = get(parentPath, model);

        if(!parentObject || typeof parentObject !== 'object'){
            return;
        }

        var objectReferences = modelReferences.get(parentObject);

        if(!objectReferences){
            return;
        }

        for(var path in objectReferences){
            if(path !== parentPath){
                trigger(path);
            }
        }
    }

    //Initialise model references
    addModelReference('[/]', model);

    //internal functions

    //***********************************************
    //
    //      IE indexOf polyfill
    //
    //***********************************************

    //IE Specific idiocy

    Array.prototype.indexOf = Array.prototype.indexOf || function (object) {
        for (var i = 0; i < this.length; i++) {
            if (this === object){
                return i;
            }
        }
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

    function each(object, callback) {
        var isArray = Array.isArray(object);
        for (var key in object) {
            if(isArray && isNaN(key)){
                continue;
            }
            if(callback(object[key], key, object)){
                break;
            }
        }
        return object;
    }

    //***********************************************
    //
    //      Gel integration
    //
    //***********************************************

    gel = new Gel();

    gel.tokenConverters.push(PathToken);

    gel.scope.isDirty = function(scope, args){
        var token = args.raw()[0];

        return isDirty(paths.resolve(scope.get('_gmc_'), (token instanceof PathToken) ? token.original : paths.create()));
    };

    gel.scope.getAllDirty = function (scope, args) {
        var token = args.raw()[0],
            path = paths.resolve(scope.get('_gmc_'), (token instanceof PathToken) && token.original),
            source = get(path, model),
            result,
            itemPath;

        if (source == null) {
            return null;
        }

        result = source.constructor();

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                itemPath = paths.resolve(path, paths.create(key));
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

    //***********************************************
    //
    //      Remove
    //
    //***********************************************

    function remove(path, model) {
        var reference = model;

        memoiseCache = {};

        var pathParts = paths.toParts(path),
            index = 0,
            pathLength = pathParts.length;

        if(paths.isRoot(path)){
            overwriteModel({}, model);
            return;
        }

        if(paths.isAbsolute(path)){
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
            target = paths.resolve('[/]', path);

        function triggerListeners(reference, bubble) {
            if (reference != undefined && reference !== null) {
                for(var index = 0; index < reference.length; index++){
                    var callback = reference[index],
                        callbackBinding = callback.binding,
                        callbackBindingParts,
                        parentPath = callback.parentPath,
                        wildcardIndex = callbackBinding.indexOf(pathConstants.wildcard),
                        wildcardMatchFail;

                    if(bubble && !callback.captureBubbling){
                        continue;
                    }

                    if(wildcardIndex >= 0 && getPathsInExpression(callbackBinding)[0] === callbackBinding){

                        //fully resolve the callback path
                        callbackBindingParts = paths.toParts(paths.resolve('[/]', callback.parentPath, callbackBinding));

                        //null out the now not needed parent path
                        parentPath = null;

                        for(var i = 0; i < callbackBindingParts.length; i++) {
                            var pathPart = callbackBindingParts[i];
                            if(pathPart === pathConstants.wildcard){
                                callbackBindingParts[i] = target[i];
                            }else if (pathPart !== target[i]){
                                return wildcardMatchFail = true;
                            }
                        }

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

                if (!bubble) {
                    for (var key in reference) {
                        if (reference.hasOwnProperty(key) && Array.isArray(reference[key])) {
                            triggerListeners(reference[key], bubble);
                        }
                    }
                }
            }
        }

        var index = 0;

        if(paths.isAbsolute(path)){
            index = 1;
        }

        var pathParts = paths.toParts(path);

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
            triggerListeners(reference, true);
        }

        triggerListeners(references.pop());
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
        if (!paths.create(binding)) {
            var expressionPaths = getPathsInExpression(binding),
                boundExpressions = {};

            for(var i = 0; i < expressionPaths.length; i++) {
                var path = expressionPaths[i];
                if(!boundExpressions[path]){
                    boundExpressions[path] = true;
                    setBinding(path, callback, parentPath);
                }
            }

            return;
        }

        path = binding;

        callback.references.push(path);

        // Should bubble.
        if(path.slice(-2) === path.upALevel){
            callback.captureBubbling = true;
        }

        if (parentPath) {
            path = paths.resolve(paths.createRoot(), parentPath, path);
        }

        // Handle wildcards

        if(path.indexOf(pathConstants.wildcard)>=0){
            var parts = paths.toParts(path);
            path = paths.create(parts.slice(0, parts.indexOf(pathConstants.wildcard)));
        }

        if(paths.isRoot(path)){
            reference.push(callback);
            return;
        }

        var index = 0;

        if(paths.isAbsolute(path)){
            index = 1;
        }

        var pathParts = paths.toParts(path);

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
                for(var i = 0; i < callback.references.length; i++) {
                    removeBinding(callback.references[i], callback);
                }
            }else{
                internalBindings = [];
            }
            return;
        }

        var expressionPaths = getPathsInExpression(path);
        if(expressionPaths.length > 1){
            for(var i = 0; i < expressionPaths.length; i++) {
                removeBinding(expressionPaths[i], callback);
            }
            return;
        }

        var resolvedPathParts = paths.toParts(paths.resolve(parentPath, path)),
            bindingPathParts = [];

        for(var i = 0; i < resolvedPathParts.length; i++){
            if(parseInt(resolvedPathParts[i]).toString() === resolvedPathParts[i]){
                bindingPathParts[i] = '_' + resolvedPathParts[i];
            }else{
                bindingPathParts[i] = resolvedPathParts[i];
            }
        }

        var escapedPath = paths.create(bindingPathParts);

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
            return memoisedExpressionPaths[expression] = [paths.create(expression)];
        }
        return memoisedExpressionPaths[expression] = paths;
    }

    //***********************************************
    //
    //      Model Get
    //
    //***********************************************

    function modelGet(binding, parentPath, scope, returnAsTokens) {
        if(parentPath && typeof parentPath !== "string"){
            scope = parentPath;
            parentPath = paths.create();
        }

        if (binding) {
            var gelResult,
                expression = binding;

            scope = scope || {};

            scope['_gmc_'] = parentPath;

            return gel.evaluate(expression, scope, returnAsTokens);
        }

        parentPath = parentPath || paths.create();

        binding = paths.resolve(parentPath, binding);

        return get(binding, model);
    }

    //***********************************************
    //
    //      Model Set
    //
    //***********************************************

    function getSourcePathInfo(expression, parentPath, subPathOpperation){
        var scope = {
                _gmc_: parentPath
            },
            path;

        var resultToken = gel.evaluate(expression, scope, true)[0],
            sourcePathInfo = resultToken.sourcePathInfo;

        if(sourcePathInfo){
            if(sourcePathInfo.subPaths){
                each(sourcePathInfo.subPaths, function(item){
                    subPathOpperation(item);
                });
                return;
            }
            path = sourcePathInfo.path;
        }else{
            path = resultToken.path;
        }
        if(path){
            subPathOpperation(path);
        }
    }

    function DeletedItem(){}

    function modelSet(expression, value, parentPath, dirty) {
        if(typeof expression === 'object' && !paths.create(expression)){
            dirty = value;
            value = expression;
            expression = paths.createRoot();
        }else if(typeof parentPath === 'boolean'){
            dirty = parentPath;
            parentPath = undefined;
        }

        if(expression && !arguments[4]){
            getSourcePathInfo(expression, parentPath, function(subPath){
                modelSet(subPath, value, parentPath, dirty, true);
            });
            return;
        }

        parentPath = parentPath || paths.create();
        expression = paths.resolve(parentPath, expression);

        setDirtyState(expression, dirty);

        var previousValue = get(expression, model);

        set(expression, value, model);

        if(!(value instanceof DeletedItem)){
            addModelReference(expression, value);
            trigger(expression);
            triggerModelReferences(expression);
        }

        if(!(value && typeof value !== 'object') && previousValue && typeof previousValue === 'object'){
            removeModelReference(expression, previousValue);
        }
    }

    //***********************************************
    //
    //      Model Remove
    //
    //***********************************************

    function modelRemove(expression, parentPath, dirty) {
        if(parentPath instanceof Boolean){
            dirty = parentPath;
            parentPath = undefined;
        }

        if(expression && !arguments[3]){
            parentPaths = {};
            getSourcePathInfo(expression, parentPath, function(subPath){
                modelSet(subPath, new DeletedItem(), parentPath, dirty, true);
                parentPaths[paths.append(subPath, paths.create(pathConstants.upALevel))] = null;
            });

            for(var key in parentPaths){
                if(parentPaths.hasOwnProperty(key)){
                    var parentPath = paths.resolve(parentPath || paths.createRoot(), paths.create(key)),
                        parentObject = get(parentPath, model),
                        isArray = Array.isArray(parentObject);

                    if(isArray){
                        var anyRemoved;
                        for(var i = 0; i < parentObject.length; i++){
                            if(parentObject[i] instanceof DeletedItem){
                                parentObject.splice(i, 1);
                                i--;
                                anyRemoved = true;
                            }
                        }
                        if(anyRemoved){
                            trigger(paths.append(parentPath));
                        }
                    }else{
                        for(var key in parentObject){
                            if(parentObject[key] instanceof DeletedItem){
                                delete parentObject[key];
                                trigger(paths.append(parentPath, paths.create(key)));
                            }
                        }
                    }
                }
            }

            return;
        }

        parentPath = parentPath || paths.create();
        expression = paths.resolve(parentPath, expression);

        setDirtyState(expression, dirty);

        var removedItem = get(expression, model),
            parentObject = remove(expression, model);

        if(Array.isArray(parentObject)){
            //trigger one above
            trigger(paths.resolve('[/]', paths.append(expression, paths.create(pathConstants.upALevel))));
        }else{
            trigger(expression);
        }

        removeModelReference(expression, removedItem);
        triggerModelReferences(expression);
    }

    //***********************************************
    //
    //      Set Dirty State
    //
    //***********************************************

    function setDirtyState(expression, dirty, parentPath) {

        var reference = dirtyModel;

        if(expression && !arguments[3]){
            getSourcePathInfo(expression, parentPath, function(subPath){
                setDirtyState(subPath, dirty, parentPath, true);
            });
            return;
        }

        if(!paths.create(expression)){
            throw exceptions.invalidPath;
        }

        parentPath = parentPath || paths.create();


        dirty = dirty !== false;

        if(paths.isRoot(expression)){
            dirtyModel = {
                '_isDirty_': dirty
            };
            return;
        }

        var index = 0;

        if(paths.isAbsolute(expression)){
            index = 1;
        }

        var pathParts = paths.toParts(paths.resolve(parentPath, expression));

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


    function Gedi() {}

    Gedi.prototype = {
        paths: {
            create: paths.create,
            resolve: paths.resolve,
            isRoot: paths.isRoot,
            isAbsolute: paths.isAbsolute,
            append: paths.append,
            toParts: paths.toParts
        },

        /**
            ## .get

            model.get(expression, parentPath, scope, returnAsTokens)

            Get data from the model

                // get model.stuff
                var data = model.get('[stuff]');

            Expressions passed to get will be evaluated by gel:

                // get a list of items that have a truthy .selected property.
                var items = model.get('(filter [items] {item item.selected})');

            You can scope paths in the expression to a parent path:

                // get the last account.
                var items = model.get('(last [])', '[accounts]')'

        */
        get: modelGet,

        /**
            ## .set

            model.set(expression, value, parentPath, dirty)

            Set data into the model

                // set model.stuff to true
                model.set('[stuff]', true);

            Expressions passed to set will be evaluated by gel:

                // find all items that are not selected and set them to be selected
                model.set('(map (filter [items] {item (! item.selected)}) {item item.selected})', true);

            You can scope paths in the expression to a parent path:

                // set the last account to a different account.
                model.set('(last [])', '[accounts]', someAccount);

        */
        set: modelSet,

        /**
            ## .remove

            model.remove(expression, value, parentPath, dirty)

            If the target key is on an object, the key will be deleted.
            If the target key is an index in an array, the item will be spliced out.

            remove data from the model

                // remove model.stuff.
                model.remove('[stuff]');

            Expressions passed to remove will be evaluated by gel:

                // remove all selected items.
                model.remove('(filter [items] {item item.selected})');

            You can scope paths in the expression to a parent path:

                // remove the last account.
                model.remove('(last [])', '[accounts]');

        */
        remove: modelRemove,

        utils: {
            get:get,
            set:set
        },

        init: function (model) {
            this.set(model, false);
        },

        /**
            ## .bind

            model.bind(expression, callback, parentPath)

            bind a callback to change events on the model

        */
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