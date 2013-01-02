//Copyright (C) 2012 Kory Nunn

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

(function (undefined) {
    "use strict";

    //Create gedi
    var gediConstructor = window.gedi = window.gedi || newGedi;

    //"constants"
    gediConstructor.pathSeparator = "/";
    gediConstructor.upALevel = "..";
    gediConstructor.rootPath = "";
    gediConstructor.pathStart = "[";
    gediConstructor.pathEnd = "]";
    gediConstructor.pathWildcard = "*";



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
            this.fastEach(function (value, index) {
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

        Array.prototype.fastEach = Array.prototype.fastEach || function (callback) {
            for (var i = 0; i < this.length; i++) {
                if (callback(this[i], i, this)) break;
            }
            return this;
        };
        
        function pathTokenCallback(value, scopedVariables) {
            return get(Path.parse(scopedVariables._gediModelContext_).append(value), model);
        }


        //***********************************************
        //
        //      Path token converter
        //
        //***********************************************

        function detectPathToken(expression) {
            if (expression.charAt(0) === '[') {
                var index = 1,
                    escapes = 0;
                do {
                    if (expression.charAt(index) === '\\' && (expression.charAt(index + 1) === '[' || expressioncharAt(index + 1) === ']')) {
                        expression = expression.slice(0, index) + expression.slice(index + 1);
                        index++;
                        escapes++;
                    }
                    else {
                        index++;
                    }
                } while (expression.charAt(index) !== ']' && index < expression.length);

                if (index > 1) {
                    var value = expression.slice(0, index + 1);
                    return {
                        value: value,
                        index: index + escapes + 1,
                        callback: pathTokenCallback
                    };
                }
            }
        }

        //***********************************************
        //
        //      Gel integration
        //
        //***********************************************

        if (window.gel) {
            gel = new window.gel();
            
            gel.tokenConverters.others.path = detectPathToken;

            gel.functions.isDirty = isDirty;

            gel.functions.getAllDirty = function (path) {
                var path = Path.parse(this._gediModelContext_).append(path),
                    source = get(path),
                    result,
                    itemPath
                if (source == null) {
                    return null;
                }

                result = source.constructor();

                for (var key in source) {
                    if (source.hasOwnProperty(key)) {
                        itemPath = path.append(key);
                        if (result instanceof Array) {
                            isDirty(itemPath) && result.push(source[key]);
                        } else {
                            isDirty(itemPath) && (result[key] = source[key]);
                        }
                    }
                }

                return result;
            };
        }

        //***********************************************
        //
        //      Get
        //
        //***********************************************


        // Lots of similarities between get and set, refactor later to reuse code.
        function get(path, model) {
            if (path) {

                var reference = model;

                path = Path.parse(path);

                path.fastEach(function (key, index) {
                    if (reference === null || reference === undefined) {
                        return true;
                    } else if (typeof reference[key] === "object") {
                        reference = reference[key];

                    /*
                    else if there isn't anything at this key, exit the loop,
                    and return undefined.
                    */
                    }
                    else if (reference[key] === undefined) {
                        reference = undefined;
                        return true;

                    /*
                    otherwise, we're at the end of the line. return whatever's
                    there
                    */
                    }
                    else {
                        reference = reference[key];
                        return true;
                    }
                });

                return reference;
            }
            return model;
        }


        //***********************************************
        //
        //      Set
        //
        //***********************************************

        function set(path, value) {
            //passed a null or undefined path, do nothing.
            if (!path) {
                return;
            }

            //If you just pass in an object, you are overwriting the model.
            if (typeof path === "object" && !(path instanceof Path) && !(path instanceof Expression)) {
                for (var modelProp in model) {
                    delete model[modelProp];
                    trigger(modelProp);
                }
                for (var pathProp in path) {
                    model[pathProp] = path[pathProp];
                    trigger(new Path(pathProp), model[pathProp]);
                }
                return;
            }

            path = Path.parse(path);  

            var reference = model;

            path.fastEach(function (key, index, path) {

                //if we have hit a non-object property on the reference and we have more keys after this one
                //make an object (or array) here and move on.
                if ((typeof reference[key] !== "object" || reference[key] === null) && index < path.length - 1) {
                    if (!isNaN(key)) {
                        reference[key] = [];
                    }
                    else {
                        reference[key] = {};
                    }
                }
                if (index === path.length - 1) {
                    // if we are at the end of the line, set to the model
                    reference[key] = value;
                }
                    //otherwise, RECURSANIZE!
                else {
                    reference = reference[key];
                }
            });
        }

        //***********************************************
        //
        //      Remove
        //
        //***********************************************

        function remove(path, model) {
            var reference = model;

            path = Path.parse(path);

            path.fastEach(function (key, index, path) {
                //if we have hit a non-object and we have more keys after this one,
                //return true to break out of the fastEach loop.
                if (typeof reference[key] !== "object" && index < path.length - 1) {
                    return true;
                }
                if (index === path.length - 1) {
                    // if we are at the end of the line, delete the last key

                    if (!isNaN(reference.length)) {
                        reference.splice(key, 1);
                    } else {
                        delete reference[key];
                    }
                }
                    //otherwise, RECURSANIZE!
                else {
                    reference = reference[key];
                }
            });
        }

        //***********************************************
        //
        //      Trigger Binding
        //
        //***********************************************

        function trigger(path, modelChangeEvent) {
            if (eventsPaused) {
                return;
            }

            path = Path.parse(path);

            var reference = internalBindings,
                references = [];

            modelChangeEvent = modelChangeEvent || {
                target: path
            };

            function triggerListeners(reference, sink) {
                if (reference != undefined && reference !== null) {
                    reference.fastEach(function (callback) {

                        callback(modelChangeEvent);

                    });
                    if (sink) {
                        for (var key in reference) {
                            if (reference.hasOwnProperty(key) && Array.isArray(reference[key])) {
                                triggerListeners(reference[key], sink);
                            }
                        }
                    }
                }
            }

            path.fastEach(function (key) {

                if (!isNaN(key) || Array.prototype.hasOwnProperty(key)) {
                    key = "_" + key;
                }

                if (reference !== undefined && reference !== null) {
                    reference = reference[key];
                    references.push(reference);
                }
            });

            triggerListeners(references.pop(), true);

            while (references.length) {
                var reference = references.pop();

                triggerListeners(reference);
            }
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

        function setBinding(binding, callback) {

            var path,
                reference = internalBindings;

            //If the binding has opperators in it, break them apart and set them individually.
            if (!(binding instanceof Path)) {
                var paths = Expression.parse(binding).paths;

                paths.fastEach(function (path) {
                    setBinding(path, callback);
                });
                return;
            }

            path = binding;

            path.fastEach(function (key, index, path) {

                //escape properties of the array with an underscore.
                // numbers mean a binding has been set on an array index.
                // array property bindings like length can also be set, and thats why all array properties are escaped.
                if (!isNaN(key) || [].hasOwnProperty(key)) {
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
            });
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
                var tokens = gel.getTokens(expressionString, 'path');
                tokens.fastEach(function (token) {
                    paths.push(Path.parse(token.value));
                });
            } else {
                return [expressionString];
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

        function getAbsolutePath() {
            var args = Array.prototype.slice.call(arguments),
                absoluteParts = [];

            args.fastEach(function (path) {
                if(!(path instanceof Path)){
                    path = Path.parse(path);
                }

                path.fastEach(function (pathPart, partIndex, parts) {

                    if (pathPart === gediConstructor.upALevel) {
                        // Up a level? Remove the last item in absoluteParts
                        absoluteParts.pop();

                    } else if (pathPart === gediConstructor.rootPath) {
                        // Root path? Do nothing
                        absoluteParts = [];

                    } else {
                        // any following valid part? Add it to the absoluteParts.
                        absoluteParts.push(pathPart);

                    }
                });
            });

            // Convert the absoluteParts to a Path.
            return new Path(absoluteParts);
        }

        //***********************************************
        //
        //      Model Get
        //
        //***********************************************

        function modelGet(binding, parentPath) {
            if (binding && gel) {
                var gelResult,
                    expression = binding,
                    context = {
                        "_gediModelContext_": parentPath
                    };

                if (binding instanceof Path || binding instanceof Expression) {
                    expression = binding.toString();
                }

                gelResult = gel.parse(expression, context);

                return gelResult;
            }
            if (parentPath) {
                binding = getAbsolutePath(parentPath, binding);
            }
            return get(binding, model);
        }

        //***********************************************
        //
        //      Model Set
        //
        //***********************************************

        function modelSet(path, value, parentPath, dirty) {
            if(typeof path === 'object' && !Path.mightParse(value)){
                dirty = value;
                value = path;
                setDirtyState(null, dirty);
            }else if(parentPath instanceof Boolean){
                dirty = parentPath;
                parentPath = undefined;
            }else if(parentPath){
                path = new Path(parentPath).append(path);
            }
            
            if (Path.mightParse(path)) {
                setDirtyState(path, dirty);
            }
            trigger(path);
            return set(path, value, model);
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
            }else if(parentPath){
                path = new Path(parentPath).append(path);
            }
            
            if (Path.mightParse(path)) {
                setDirtyState(path, dirty);
            }
            trigger(path);
            return remove(path, model);
        }

        //***********************************************
        //
        //      Set Dirty State
        //
        //***********************************************  

        function setDirtyState(path, dirty) {
            var reference = dirtyModel;

            dirty = dirty !== false;

            path = Path.parse(path);

            path.fastEach(function (key, index) {
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
            });
            
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
                var tempPrototype = {},
                    arrayProto = [];
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

        function Path(path) {
            var self = this,
                absolute = false;

            //Passed a Path? pass it back.
            if (path instanceof Path) {
                return path.slice();
            }

            //passed a string or array? make a new Path.
            if (typeof path === "string") {
                if (path.charAt(0) === gediConstructor.pathStart) {
                    path = pathToRaw(path);
                }
                var keys = path.split(gediConstructor.pathSeparator);
                keys.fastEach(function (key) {
                    self.push(key);
                });
            } else if (path instanceof Array) {
                path.fastEach(function (key) {
                    self.push(key);
                });
            }

            self.original = path;
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
            var str = this.join(gediConstructor.pathSeparator);
            return str && rawToPath(str) || undefined;
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
            var args = Array.prototype.slice.call(arguments),
                newPath = this.slice();

            return getAbsolutePath.apply(this, [this].concat(args));
        };
        Path.prototype.last = function () {
            return this[this.length - 1];
        };
        Path.parse = function (path) {

            if (path instanceof Expression) {
                // Check if the passed in path is an Expression, that is also just a Path.

                var detectedPathToken = detectPathToken(path.original);

                if (detectedPathToken.index === path.original.length) {
                    path = new Path(detectedPathToken.value);
                } else {
                    console.warn('could not parse Expression directly to Path');
                }
            }

            return path instanceof this && path || new Path(path);
        };
        Path.mightParse = function (path) {
            return path instanceof this || path instanceof Expression || typeof path === 'string' || Array.isArray(path);
        };

        //***********************************************
        //
        //      Expression Object
        //
        //***********************************************

        function Expression(expression) {
            var self = this,
                absolute = false;

            //Passed an Expression? pass it back.
            if (expression instanceof Expression) {
                return expression;
            }

            //passed a string or array? make a new Expression.
            if (typeof expression === "string") {
                var tokens = gel.tokenise(expression);
                tokens.fastEach(function (key) {
                    self.push(key);
                });
            }

            self.original = expression;

            self.paths = getPathsInExpression(self);
        }
        Expression.prototype = inheritFromArray();
        Expression.prototype.toString = function () {
            return this.original;
        };
        Expression.parse = function (expression) {
            expression instanceof Path && (expression = expression.toString());

            return expression instanceof this && expression || new Expression(expression);
        };

        function gedi() {
            
        }

        gedi.prototype = {
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

            trigger: trigger,

            isDirty: isDirty,

            setDirtyState: function (path, dirty) {
                return setDirtyState(path, dirty);
            }
        };

        return new gedi();

    }
})();