//Copyright (C) 2012 Kory Nunn

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var Gel = require('gel-js'),
    createPathToken = require('./pathToken'),
    Token = Gel.Token,
    paths = require('gedi-paths'),
    pathConstants = paths.constants,
    createSpec = require('spec-js'),
    createEvents = require('./events'),
    modelOperations = require('./modelOperations'),
    get = modelOperations.get,
    set = modelOperations.set;

//Create gedi
var gediConstructor = newGedi;

var exceptions = {
    invalidPath: 'Invalid path syntax'
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


        // gel instance
    var gel = new Gel(),

        // Storage for tracking the dirty state of the model
        dirtyModel = {},

        PathToken = createPathToken(get, model),

        // Storage for model event handles
        events = createEvents(modelGet, gel, PathToken);


    //Initialise model references
    events.addModelReference('[/]', model);

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

    gel.tokenConverters.push(PathToken);

    gel.scope.isDirty = function(scope, args){
        var token = args.getRaw(0, true);

        if(!token){
            return false;
        }

        var path = (token instanceof PathToken) ? token.original : token.sourcePathInfo && token.sourcePathInfo.path;

        if(!path){
            return false;
        }

        return isDirty(paths.resolve(scope.get('_gmc_'), path));
    };

    gel.scope.getAllDirty = function (scope, args) {
        var token = args.getRaw(0, true),
            source = token && token.result;

        if (source == null) {
            return null;
        }

        var result = source.constructor(),
            path = (token instanceof PathToken) ? token.original : token.sourcePathInfo && token.sourcePathInfo.path;

        if(!path){
            return result;
        }

        var resolvedPath = paths.resolve(scope.get('_gmc_'), path),
            result,
            itemPath;

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

    function getSourcePathInfo(expression, parentPath, scope, subPathOpperation){
        var scope = scope || {},
            path;

        scope._gmc_ = parentPath;

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

    function modelSetPath(path, value, parentPath, dirty, scope){
        parentPath = parentPath || paths.create();
        path = paths.resolve(parentPath, path);

        setDirtyState(path, dirty);

        var previousValue = get(path, model);

        var keysChanged = set(path, value, model);

        if(!(value instanceof DeletedItem)){
            events.addModelReference(path, value);
            events.trigger(path, keysChanged);
        }

        if(!(value && typeof value !== 'object') && previousValue && typeof previousValue === 'object'){
            events.removeModelReference(path, previousValue);
        }
    }

    function modelSet(expression, value, parentPath, dirty, scope) {
        if(typeof expression === 'object' && !paths.create(expression)){
            dirty = value;
            value = expression;
            expression = paths.createRoot();
        }else if(typeof parentPath === 'boolean'){
            dirty = parentPath;
            parentPath = undefined;
        }

        getSourcePathInfo(expression, parentPath, scope, function(subPath){
            modelSetPath(subPath, value, parentPath, dirty, scope);
        });
    }

    //***********************************************
    //
    //      Model Remove
    //
    //***********************************************

    function modelRemove(expression, parentPath, dirty, scope) {
        if(parentPath instanceof Boolean){
            dirty = parentPath;
            parentPath = undefined;
        }

        itemParentPaths = {};
        getSourcePathInfo(expression, parentPath, scope, function(subPath){
            modelSetPath(subPath, new DeletedItem(), parentPath, dirty, scope);
            itemParentPaths[paths.append(subPath, paths.create(pathConstants.upALevel))] = null;
        });

        for(var key in itemParentPaths){
            if(itemParentPaths.hasOwnProperty(key)){
                var itemParentPath = paths.resolve(parentPath || paths.createRoot(), key),
                    parentObject = get(itemParentPath, model),
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
                        events.trigger(itemParentPath);
                    }
                }
                // Always run keys version, because array's might have non-index keys
                for(var key in parentObject){
                    if(parentObject[key] instanceof DeletedItem){
                        delete parentObject[key];
                        events.trigger(paths.append(itemParentPath, key));
                    }
                }
            }
        }

    }

    //***********************************************
    //
    //      Set Dirty State
    //
    //***********************************************

    function setPathDirtyState(path, dirty, parentPath, scope){
        var reference = dirtyModel;
        if(!paths.create(path)){
            throw exceptions.invalidPath;
        }

        parentPath = parentPath || paths.create();


        dirty = dirty !== false;

        if(paths.isRoot(path)){
            dirtyModel = {
                '_isDirty_': dirty
            };
            return;
        }

        var index = 0;

        if(paths.isAbsolute(path)){
            index = 1;
        }

        var pathParts = paths.toParts(paths.resolve(parentPath, path));

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

    function setDirtyState(expression, dirty, parentPath, scope) {
        getSourcePathInfo(expression, parentPath, scope, function(subPath){
            setPathDirtyState(subPath, dirty, parentPath, scope);
        });
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
        bind: events.bind,

        /**
            ## .debind

            model.debind(expression, callback)

            debind a callback

        */
        debind: events.debind,

        /**
            ## .trigger

            model.trigger(path)

            trigger events for a path

        */
        trigger: events.trigger,

        /**
            ## .isDirty

            model.isDirty(path)

            check if a path in the model has been changed since being marked as clean.

        */
        isDirty: isDirty,

        /**
            ## .setDirtyState

            model.setDirtyState(path, dirty, parentPath)

            explicity mark a path in the model as dirty or clean

        */
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