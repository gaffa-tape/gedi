//Copyright (C) 2012 Kory Nunn

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory(require('gel-js'));
    } else if (typeof define === 'function' && define.amd) {
        define(['gel'], factory);
    } else {
        root.Gedi = factory(root.Gel);
    }
}(this, function(Gel){
    "use strict";

    //Create gedi
    var gediConstructor = newGedi;

    //"constants"
    gediConstructor.pathSeparator = "/";
    gediConstructor.upALevel = "..";
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
        };
        
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

                        return new Gel.Token(
                            this,
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
        
        gel.tokenConverters.push({
            name: 'gediPathToken',
            precedence:4,
            tokenise:detectPathToken,
            parse: function(){},
            evaluate: function(scope){
                this.result = get(resolvePath(scope.get('_gediModelContext_'), this.original), model);
            }
        });

        gel.scope.isDirty = function(scope, args){
            var pathToken = args.raw()[0];
            
            return isDirty(resolvePath(scope.get('_gediModelContext_'), (pathToken && pathToken.name === 'gediPathToken') ? pathToken.original : new Path()));                              
        }

        gel.scope.getAllDirty = function (scope, args) {
            var pathToken = args.raw()[0],
                path = resolvePath(scope.get('_gediModelContext_'), (pathToken && pathToken.name === 'gediPathToken') && pathToken.original),
                source = get(path, model),
                result,
                itemPath;
                
            if (source == null) {
                return null;
            }

            result = source.constructor();

            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    itemPath = resolvePath(path, key);
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

            path = Path.parse(path);
            
            if(path.isRoot()){
                return model;
            }

            var reference = model,
                index = 0,
                pathLength = path.length;

            if(path.isAbsolute()){
                index = 1;
            }

            for(; index < pathLength; index++){
                var key = path[index];

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

            memoiseCache[path.toString()] = {
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
            if (typeof path === "object" && !(path instanceof Path) && !(path instanceof Expression)) {
                value = path;
                path = Path.root();
            }

            path = Path.parse(path);
            
            if(path.isRoot()){                
                overwriteModel(value, model);
                return;
            }

            var index = 0,
                pathLength = path.length;

            if(path.isAbsolute()){
                index = 1;
            }

            var reference = model;

            for(; index < pathLength; index++){
                var key = path[index];
                
                // if we have hit a non-object property on the reference and we have more keys after this one
                // make an object (or array) here and move on.
                if ((typeof reference[key] !== "object" || reference[key] === null) && index < path.length - 1) {
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

            path = Path.parse(path);

            if(path.isRoot()){                
                overwriteModel({}, model);
                return;
            }

            var index = 0,
                pathLength = path.length;

            if(path.isAbsolute()){
                index = 1;
            }

            for(; index < pathLength; index++){
                var key = path[index];                
                //if we have hit a non-object and we have more keys after this one
                if (typeof reference[key] !== "object" && index < path.length - 1) {
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
            if (eventsPaused) {
                return;
            }

            path = Path.parse(path);

            var reference = internalBindings,
                references = [reference],
                target = resolvePath('[/]', path);

            function triggerListeners(reference, sink) {
                if (reference != undefined && reference !== null) {
                    for(var index = 0; index < reference.length; index++){
                        var callback = reference[index],
                            callbackBinding = callback.binding,
                            parentPath = callback.parentPath,
                            wildcardIndex = callbackBinding.indexOf(gediConstructor.pathWildcard),
                            wildcardMatchFail;

                        if(wildcardIndex >= 0 && Expression.parse(callbackBinding).paths[0].toString() === callbackBinding.toString()){

                            //fully resolve the callback path
                            callbackBinding = resolvePath('[/]', callback.parentPath, callbackBinding);

                            //null out the now not needed parent path
                            parentPath = null;

                            fastEach(callbackBinding, function(pathPart, i){
                                if(pathPart === gediConstructor.pathWildcard){
                                    callbackBinding[i] = target[i];
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
                            getValue: function(scope){
                                return modelGet(callbackBinding, parentPath, scope);
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

            if(path.isAbsolute()){
                index = 1;
            }

            for(; index < path.length; index++){
                var key = path[index];

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
                var reference = references.shift();

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
            if (!(binding instanceof Path)) {
                var paths = Expression.parse(binding).paths;

                fastEach(paths, function (path) {
                    setBinding(path, callback, parentPath);
                });
                return;
            }

            path = binding;
                        
            if (parentPath) {
                path = resolvePath('[/]', parentPath, path);
            }

            callback.references.push(path);

            // Handle wildcards

            var firstWildcardIndex = path.indexOf(gediConstructor.pathWildcard);
            if(firstWildcardIndex>=0){
                path = path.slice(0, firstWildcardIndex);                
            }
            
            if(path.isRoot()){
                reference.push(callback);
                return;
            }

            var index = 0;

            if(path.isAbsolute()){
                index = 1;
            }

            for(; index < path.length; index++){
                var key = path[index];

                //escape properties of the array with an underscore.
                // numbers mean a binding has been set on an array index.
                // array property bindings like length can also be set, and thats why all array properties are escaped.
                if (!isNaN(key) || key in arrayProto) {
                    key = "_" + key;
                }

                //if we have more keys after this one
                //make an array here and move on.
                if (typeof reference[key] !== "object" && index < path.length - 1) {
                    reference[key] = [];
                    reference = reference[key];
                }
                else if (index === path.length - 1) {
                    // if we are at the end of the line, add the callback
                    reference[key] = reference[key] || [];
                    reference[key].push(callback);
                }
                    //otherwise, RECURSANIZE! (ish...)
                else {
                    reference = reference[key];
                }
            };
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
            
            if(!(path instanceof Path)){
                fastEach(Expression.parse(path).paths, function(path){
                    removeBinding(path, callback);
                });
                return;
            }

            var resolvedPath = resolvePath(parentPath, path),
                bindingPathParts = [];

            for(var i = 0; i < resolvedPath.length; i++){
                if(parseInt(resolvedPath[i]).toString() === resolvedPath[i]){
                    bindingPathParts[i] = '_' + resolvedPath[i];
                }else{
                    bindingPathParts[i] = resolvedPath[i];
                }
            }

            var escapedPath = new Path(bindingPathParts);

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

        function getPathsInExpression(exp) {
            var paths = [],
                expressionString = exp instanceof Expression ? exp.original : exp;

            if (gel) {
                var tokens = gel.tokenise(expressionString);
                for(var index = 0; index < tokens.length; index++){
                var token = tokens[index];
                    if(token.name === 'gediPathToken'){
                        paths.push(Path.parse(token.original));
                    }
                }
            } else {
                return [Path.parse(expressionString)];
            }
            return paths;
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
            return gediConstructor.pathStart + rawPath + gediConstructor.pathEnd;
        }

        //***********************************************
        //
        //      Get Absolute Path
        //
        //***********************************************

        function resolvePath() {
            var absoluteParts = [];

            for(var i = 0; i < arguments.length; i++){
                var path = arguments[i];

                if(!(path instanceof Path)){
                    path = Path.parse(path);
                }

                for(var index = 0; index < path.length; index++){
                    var pathPart = path[index];

                    if(path.length === 0){
                        // Empty path, maintain parent path.
                    } else if (pathPart === gediConstructor.upALevel) {
                        // Up a level? Remove the last item in absoluteParts
                        absoluteParts.pop();

                    } else if (pathPart === gediConstructor.rootPath) {
                        // Root path? Do nothing
                        absoluteParts = [''];

                    } else {
                        // any following valid part? Add it to the absoluteParts.
                        absoluteParts.push(pathPart);

                    }
                }
            }

            // Convert the absoluteParts to a Path.
            return new Path(absoluteParts);
        }

        //***********************************************
        //
        //      Model Get
        //
        //***********************************************

        function modelGet(binding, parentPath, scope) {
            if(parentPath && !(typeof parentPath === "string" || parentPath instanceof Path)){
                scope = parentPath;
                parentPath = new Path();
            }

            if (binding && gel) {
                var gelResult,
                    expression = binding;

                scope = scope || {};

                scope['_gediModelContext_'] = parentPath;

                if (binding instanceof Path || binding instanceof Expression) {
                    expression = binding.toString();
                }

                return gel.evaluate(expression, scope);
            }
            
            parentPath = parentPath || new Path();
            
            binding = resolvePath(parentPath, binding);
            
            return get(binding, model);
        }

        //***********************************************
        //
        //      Model Set
        //
        //***********************************************

        function modelSet(path, value, parentPath, dirty) {
            if(typeof path === 'object' && !Path.mightParse(path)){
                dirty = value;
                value = path;
                path = Path.root();
            }else if(typeof parentPath === 'boolean'){
                dirty = parentPath;
                parentPath = undefined;
            }
            
            parentPath = parentPath || new Path();
            
            path = new resolvePath(parentPath, path);            

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
            
            parentPath = parentPath || new Path();
            
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
            
            if(!Path.mightParse(path)){
                throw exceptions.invalidPath;
            }

            parentPath = parentPath || new Path();
            
            path = resolvePath(parentPath, path);

            dirty = dirty !== false;

            if(path.isRoot()){                
                dirtyModel = {
                    '_isDirty_': dirty
                };
                return;
            }

            var index = 0;

            if(path.isAbsolute()){
                index = 1;
            }

            for(; index < path.length; index++){
                var key = path[index];
                if ((typeof reference[key] !== "object" || reference[key] === null) && index < path.length - 1) {
                    reference[key] = {};
                }
                if (index === path.length - 1) {
                    reference[key] = {};
                    reference[key]['_isDirty_'] = dirty;
                }
                else {
                    reference = reference[key];
                }
            }
            
            if(!path.length){
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

            path = Path.parse(path);

            reference = get(path, dirtyModel);

            return !!hasDirtyChildren(reference);
        }

        //Public Objects ******************************************************************************

        // IE7 is a pile of shit and won't let you inherit from arrays.
        function inheritFromArray() {
            inheritFromArray.canInherit = inheritFromArray.canInherit || (function () {
                function ie7Test() { }
                ie7Test.prototype = new Array();
                var instance = new ie7Test();
                instance.push(1);
                return instance.length === 1;
            })();

            if (inheritFromArray.canInherit) {
                return new Array();
            } else {
                var tempPrototype = {};
                for (var key in arrayProto) {
                    tempPrototype[key] = arrayProto[key];
                }
                
                tempPrototype.length = 0;
                tempPrototype.pop = arrayProto.pop;
                tempPrototype.push = arrayProto.push;
                tempPrototype.slice = arrayProto.slice;
                tempPrototype.splice = arrayProto.splice;
                tempPrototype.join = arrayProto.join;
                tempPrototype.indexOf = arrayProto.indexOf;
                // add fastEach
                tempPrototype.fastEach = arrayProto.fastEach;
                return tempPrototype;
            }
        }

        //***********************************************
        //
        //      Path Object
        //
        //***********************************************

        var memoisedPathTokens = {};

        function pathTokenToPath(pathToken){
            var result = pathToken.original.slice(1,-1);

            if(result.indexOf('\\') < 0){
                return result;
            }

            for(var i = 0; i < result.length; i++){
                if(result.charAt(i) === '\\'){
                    if(result.charAt(i+1) === '\\' || result.charAt(i+1) === ']' || result.charAt(i+1) === '['){
                        result = result.slice(0, i) + result.slice(i + 1);
                    }
                }
            }

            return result;
        }

        function constructPath(instance, path){

            // passed in an Expression or an 'expression formatted' Path (eg: '[bla]')            
            if(memoisedPathTokens[path]){
                path = memoisedPathTokens[path];
            }else if ((typeof path === "string" && path.charAt(0) === gediConstructor.pathStart) || path instanceof Expression) {
                var pathString = path.toString(),
                    detectedPathToken = detectPathToken(pathString);

                if (detectedPathToken && detectedPathToken.length === pathString.length) {
                    path = memoisedPathTokens[pathString] = pathTokenToPath(detectedPathToken);
                } else {
                    console.warn('Invalid Path syntax');
                }
            }

            if(typeof path === 'string'){
                var pathParts;
                if(path.indexOf(gediConstructor.pathSeparator) >= 0){
                    pathParts = path.split(gediConstructor.pathSeparator);
                    if(pathParts[0] === '' && pathParts[1] === ''){
                        pathParts.pop();
                    }
                }else{
                    if(path === ''){
                        pathParts = [];
                    }else{
                        pathParts = [path];
                    }
                }

                while(pathParts.length){
                    instance.push(pathParts.shift());
                }

            } else if (path instanceof Array || path instanceof Path) {
                for (var i = 0; i < path.length; i++) {                    
                    instance.push(path[i]);
                }
            }

            instance.original = path;

            return instance;
        }

        function Path(path) {
            return constructPath(this, path);
        }
        Path.prototype = inheritFromArray();
        Path.prototype.push = Path.prototype.push || function () {
            Array.prototype.push.apply(this, arguments);
            this.length++;
        }
        Path.prototype.pop = Path.prototype.pop || function () {
            Array.prototype.pop.apply(this, arguments);
            this.length--;
        }
        Path.prototype.toString = function () {
            return rawToPath(this.join(gediConstructor.pathSeparator));
        };
        Path.prototype.toRawString = function () {
            return this.join(gediConstructor.pathSeparator);
        };
        Path.prototype.slice = function () {            
            return new Path(Array.prototype.slice.apply(this, arguments));
        };
        Path.prototype.splice = function () {
            return new Path(Array.prototype.splice.apply(this, arguments));
        };
        Path.prototype.append = function () {
            var result = this.slice();

            fastEach(arguments, function(arg){
                fastEach(Path.parse(arg), function(argPart){
                    result.push(argPart);
                });
            });

            return result;
        };
        Path.prototype.last = function () {
            return this[this.length - 1];
        };
        Path.prototype.isRoot = function () {
            return (this.length === 1 && this.isAbsolute()) || this.length === 0;
        };
        Path.prototype.isAbsolute = function () {
            return this[0] === gediConstructor.rootPath;
        };
        Path.prototype.toJSON = function(){
            return this.toString();
        };
        Path.parse = function (path) {  
            return path instanceof this && path || new Path(path);
        };
        Path.mightParse = function (path) {
            return path instanceof this || path instanceof Expression || typeof path === 'string' || Array.isArray(path);
        };
        Path.root = function () {
            return new Path(gediConstructor.rootPath);
        };

        //***********************************************
        //
        //      Expression Object
        //
        //***********************************************

        function Expression(input) {
            var expression = this,
                absolute = false;

            //Passed an Expression? pass it back.
            if (input instanceof Expression) {
                return input;
            }
            
            expression.original = input;

            if (typeof input === "string") {
                //passed a string or array? make a new Expression.
                var tokens = gel.tokenise(input);
                fastEach(tokens, function (key) {
                    expression.push(key);
                });
            }
            expression.paths = getPathsInExpression(expression);
        }
        Expression.prototype = inheritFromArray();
        Expression.prototype.toString = function () {
            return this.original;
        };
        Expression.prototype.toJSON = function(){
            return this.toString();
        };
        Expression.parse = function (input) {
            input instanceof Path && (input = input.toString());

            return input instanceof Expression && input || new Expression(input);
        };

        function Gedi() {
            
        }

        Gedi.prototype = {
            Path: Path,
            Expression: Expression,


            // *************************************************************************
            // DO NOT USE THIS API.
            // If you are using this, you are almost definitally doing something wrong.
            pauseEvents: pauseModelEvents,
            resumeEvents: resumeModelEvents,
            // *************************************************************************

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

            setDirtyState: function (path, dirty) {
                return setDirtyState(path, dirty);
            },
            
            gel: gel // expose gel instance for extension
        };

        return new Gedi();

    }

    return gediConstructor;
}));