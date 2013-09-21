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
        this.path = this.original;
        this.result = get(resolvePath(scope.get('_gediModelContext_'), this.original), model);
        this.sourcePathInfo = {
            path: this.original
        };
    };
    gediConstructor.PathToken = PathToken;
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

    function findValueIn(value, source){
        var result;
        each(source, function(item, key){
            if(item === value){
                result = key;
                return true;
            }
        });
        return result;
    }

    function createResultPathsObject(token, source, trackSubPaths){
        var innerPathInfo = token.sourcePathInfo,
            originPath = '[]',
            sourcePathInfo = {};

        if(trackSubPaths){
            sourcePathInfo.subPaths = source && typeof source === 'object' && new source.constructor();
        }

        if(token instanceof Gel.Token){
            if(token instanceof PathToken){
                originPath = token.original;
                sourcePathInfo.original = token.result;
            }
        }
        sourcePathInfo.original = innerPathInfo && innerPathInfo.original || token.result;
        sourcePathInfo.path = innerPathInfo && innerPathInfo.path || originPath;

        return sourcePathInfo;
    }

    function createKeytracker(fn){
        return function(scope, args){
            var firstArgToken = args.getRaw(0),
                source = args.get(0),
                result,
                isArray,
                innerPathInfo,
                sourcePathInfo;

            if(!source){
                return;
            }

            isArray = Array.isArray(source);

            //Run the function
            result = fn(scope, args);

            innerPathInfo = firstArgToken.sourcePathInfo;
            sourcePathInfo = createResultPathsObject(firstArgToken, source, true);

            if(sourcePathInfo.subPaths){
                for(var key in result){
                    if(isArray && isNaN(key)){
                        continue;
                    }

                    sourcePathInfo.subPaths[key] = appendPath(sourcePathInfo.path, createPath(findValueIn(result[key], sourcePathInfo.original)));
                }
            }

            args.callee.sourcePathInfo = sourcePathInfo;

            return result;
        };
    }

    var originalFilter = gel.scope.filter;
    function addResultItem(resultList, item, key, sourcePathInfo, innerPathInfo){
        resultList.push(item);
        if(sourcePathInfo.subPaths){
            sourcePathInfo.subPaths[key] = innerPathInfo && innerPathInfo.subPaths && innerPathInfo.subPaths[key] || appendPath(sourcePathInfo.path, createPath(key));
        }
    }
    gel.scope.filter = function(scope, args) {
        var firstArgToken = args.getRaw(0),
            source = args.get(0),
            sourcePathInfo = createResultPathsObject(firstArgToken, source, true),
            innerPathInfo = firstArgToken.sourcePathInfo,
            filteredList = source && typeof source === 'object' && new source.constructor();

        var functionToCompare = args.get(1);

        if(!filteredList){
            return undefined;
        }

        var isArray = Array.isArray(source),
            item;

        for(var key in source){
            if(isArray && isNaN(key)){
                continue;
            }
            item = source[key];
            if(typeof functionToCompare === "function"){
                if(scope.callWith(functionToCompare, [item])){
                    addResultItem(filteredList, item, key, sourcePathInfo, innerPathInfo);
                }
            }else{
                if(item === functionToCompare){
                    addResultItem(filteredList, item, key, sourcePathInfo, innerPathInfo);
                }
            }
        }

        args.callee.sourcePathInfo = sourcePathInfo;

        return filteredList;
    };

    gel.scope.slice = function(scope, args){
        var sourceTokenIndex = 0,
            sourceToken,
            source = args.next(),
            start,
            end,
            sourcePathInfo,
            innerPathInfo;

        if(args.hasNext()){
            start = source;
            source = args.next();
            sourceTokenIndex++;
        }
        if(args.hasNext()){
            end = source;
            source = args.next();
            sourceTokenIndex++;
        }

        if(!source || !source.slice){
            return;
        }

        // clone source
        source = source.slice();

        sourceToken = args.getRaw(sourceTokenIndex);
        sourcePathInfo = createResultPathsObject(sourceToken, source, true),
        innerPathInfo = sourceToken.sourcePathInfo;

        var result = source.slice(start, end);

        if(sourcePathInfo.subPaths){
            sourcePathInfo.subPaths = innerPathInfo && innerPathInfo.subPaths && innerPathInfo.subPaths.slice(start, end);
        }

        args.callee.sourcePathInfo = sourcePathInfo;

        return result;
    };

    var originalSort = gel.scope.sort;
    gel.scope.sort = createKeytracker(originalSort);

    gel.scope.last = function(scope, args){
        var sourceToken = args.getRaw(0),
            source = args.get(0),
            sourcePathInfo = createResultPathsObject(sourceToken, source),
            innerPathInfo = sourceToken.sourcePathInfo;

        if(sourcePathInfo && innerPathInfo && innerPathInfo){
            sourcePathInfo.path = innerPathInfo.subPaths && innerPathInfo.subPaths[innerPathInfo.subPaths.length - 1] || appendPath(sourcePathInfo.path, createPath(source.length - 1));
            args.callee.sourcePathInfo = sourcePathInfo;
        }

        return source[source.length - 1];
    };

    var tokenConverters = (function(){
            var result = {},
                converterList = gel.tokenConverters;

            for(var i = 0; i < converterList.length; i++){
                result[converterList[i].name] = converterList[i];
            }

            return result;
        }());

    var originalPeriodEvaluate = tokenConverters.PeriodToken.prototype.evaluate;
    tokenConverters.PeriodToken.prototype.evaluate = function(scope){
        var targetPath;

        originalPeriodEvaluate.call(this, scope);

        if(this.targetToken.sourcePathInfo){
            targetPath = this.targetToken.sourcePathInfo.path
        }


        if(targetPath){
            this.sourcePathInfo = {
                path: appendPath(targetPath, createPath(this.identifierToken.original))
            };
        }
    };

    tokenConverters.FunctionToken.prototype.evaluate = function(scope){
        var parameterNames = this.childTokens.slice(),
        fnBody = parameterNames.pop();

        this.result = function(scope, args){
            scope = new scope.constructor(scope);

            for(var i = 0; i < parameterNames.length; i++){
                var parameterToken = args.getRaw(i);
                scope.set(parameterNames[i].original, args.get(i));
                if(parameterToken instanceof Gel.Token && parameterToken.sourcePathInfo){
                    scope.set('__sourcePathInfoFor__' + parameterNames[i].original, parameterToken.sourcePathInfo);
                }
            }

            fnBody.evaluate(scope);

            if(args.callee){
                args.callee.sourcePathInfo = fnBody.sourcePathInfo;
            }

            return fnBody.result;
        }
    };

    tokenConverters.IdentifierToken.prototype.evaluate = function(scope){
        this.result = scope.get(this.original);
        this.sourcePathInfo = scope.get('__sourcePathInfoFor__' + this.original);
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

        callback.references.push(path);

        if (parentPath) {
            path = resolvePath(createRootPath(), parentPath, path);
        }

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
                    // Root path? Reset parts to be absolute.
                    absoluteParts = [''];

                } else if (pathPart === gediConstructor.upALevel) {
                    // Up a level? Remove the last item in absoluteParts
                    lastRemoved = absoluteParts.pop();
                } else if (pathPart.slice(0,2) === gediConstructor.upALevel) {
                    var argument = pathPart.slice(2);
                    //named
                    while(absoluteParts.slice(-1).pop() !== argument){
                        if(absoluteParts.length === 0){
                            throw "Named path part was not found: '" + pathPart + "', in path: '" + arguments[argumentIndex] + "'.";
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

    function getSourcePathInfo(expression, parentPath, subPathOpperation){
        var gelResult,
            scope = {
                _gediModelContext_: parentPath
            };

        var resultToken = gel.evaluate(expression, scope, true)[0],
            sourcePathInfo = resultToken.sourcePathInfo;

        if(sourcePathInfo){
            if(sourcePathInfo.subPaths){
                each(sourcePathInfo.subPaths, function(item){
                    subPathOpperation(item);
                });
                return true;
            }
            expression = sourcePathInfo.path;
        }

        return expression;
    }

    function DeletedItem(){}

    function modelSet(expression, value, parentPath, dirty) {
        if(typeof expression === 'object' && !createPath(expression)){
            dirty = value;
            value = expression;
            expression = createRootPath();
        }else if(typeof parentPath === 'boolean'){
            dirty = parentPath;
            parentPath = undefined;
        }

        if(expression && gel && !arguments[4]){
            expression = getSourcePathInfo(expression, parentPath, function(subPath){
                modelSet(subPath, value, parentPath, dirty, true);
            });
            if(expression === true){
                return;
            }
        }

        parentPath = parentPath || createPath();
        expression = resolvePath(parentPath, expression);


        setDirtyState(expression, dirty);
        set(expression, value, model);
        if(!(value instanceof DeletedItem)){
            trigger(expression);
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

        if(expression && gel && !arguments[3]){
            parentPaths = {};
            expression = getSourcePathInfo(expression, parentPath, function(subPath){
                modelSet(subPath, new DeletedItem(), parentPath, dirty, true);
                parentPaths[appendPath(subPath, createPath(gediConstructor.upALevel))] = null;
            });

            for(var key in parentPaths){
                if(parentPaths.hasOwnProperty(key)){
                    var parentObject = get(resolvePath(parentPath, key), model),
                        isArray = Array.isArray(parentObject);

                    if(isArray){
                        for(var i = 0; i < parentObject.length; i++){
                            if(parentObject[i] instanceof DeletedItem){
                                parentObject.splice(i, 1);
                                i--;
                            }
                        }
                    }else{
                        for(var key in parentObject){
                            if(parentObject[key] instanceof DeletedItem){
                                delete parentObject[key];
                            }
                        }
                    }
                }
            }

            if(expression === true){
                return;
            }
        }

        parentPath = parentPath || createPath();
        expression = resolvePath(parentPath, expression);

        setDirtyState(expression, dirty);

        var reference = remove(expression, model);

        if(Array.isArray(reference)){
            //trigger one above
            expression = resolvePath('[/]', appendPath(expression, createPath(gediConstructor.upALevel)));
        }

        trigger(expression);
    }

    //***********************************************
    //
    //      Set Dirty State
    //
    //***********************************************

    function setDirtyState(expression, dirty, parentPath) {

        var reference = dirtyModel;

        if(expression && gel && !arguments[3]){
            expression = getSourcePathInfo(expression, parentPath, function(subPath){
                setDirtyState(subPath, dirty, parentPath, true);
            });
            if(expression === true){
                return;
            }
        }

        if(!createPath(expression)){
            throw exceptions.invalidPath;
        }

        parentPath = parentPath || createPath();


        dirty = dirty !== false;

        if(isPathRoot(expression)){
            dirtyModel = {
                '_isDirty_': dirty
            };
            return;
        }

        var index = 0;

        if(isPathAbsolute(expression)){
            index = 1;
        }

        var pathParts = pathToParts(resolvePath(parentPath, expression));

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

        if(typeof path === 'number'){
            path = path.toString();
        }

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
            return rawToPath(parts.join(gediConstructor.pathSeparator));
        }
    }

    function createRootPath(){
        return createPath([gediConstructor.rootPath, gediConstructor.rootPath]);
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
                }else if(nextChar === ']' || nextChar === '['){
                    path = path.slice(0, i) + path.slice(i + 1);
                }else if(nextChar === gediConstructor.pathSeparator){
                    parts.push(path.slice(lastPartIndex), i);
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

    function Gedi() {}

    Gedi.prototype = {
        paths: {
            create: createPath,
            resolve: resolvePath,
            isRoot: isPathRoot,
            isAbsolute: isPathAbsolute,
            append: appendPath,
            toParts: pathToParts
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