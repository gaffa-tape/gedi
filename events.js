var WeakMap = require('weakmap'),
    paths = require('gedi-paths'),
    pathConstants = paths.constants
    modelOperations = require('./modelOperations'),
    get = modelOperations.get,
    set = modelOperations.set;

var isBrowser = typeof Node != 'undefined';

module.exports = function(modelGet, gel, PathToken){
    var modelBindings,
        modelBindingDetails,
        callbackReferenceDetails,
        modelReferences;

    function resetEvents(){
        modelBindings = {};
        modelBindingDetails = new WeakMap();
        callbackReferenceDetails = new WeakMap();
        modelReferences = new WeakMap();
    }

    resetEvents();

    function ModelEventEmitter(){
        this.alreadyEmitted = {};
    }
    ModelEventEmitter.prototype.emit = function(eventDetails){
        if(!Array.isArray(eventDetails)){
            eventDetails = [eventDetails];
        }
        for(var i = 0; i < eventDetails.length; i++) {
            var eventDetail = eventDetails[i];

            if(eventDetail.binding in this.alreadyEmitted){
                continue;
            }

            this.alreadyEmitted[eventDetail.binding] = null;

            eventDetail.callback({
                target: eventDetail.target,
                binding: eventDetail.binding,
                captureType: eventDetail.captureType,
                getValue: eventDetail.getValue
            });
        }
    };

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

    function setBinding(path, details){
        // Handle wildcards
        if(path.indexOf(pathConstants.wildcard)>=0){
            var parts = paths.toParts(path);
            path = paths.create(parts.slice(0, parts.indexOf(pathConstants.wildcard)));
        }

        var resolvedPath = paths.resolve(details.parentPath, path),
            reference = get(resolvedPath, modelBindings) || {},
            referenceDetails = modelBindingDetails.get(reference),
            callbackReferences = callbackReferenceDetails.get(details.callback);

        if(!referenceDetails){
            referenceDetails = [];
            modelBindingDetails.set(reference, referenceDetails);
        }

        if(!callbackReferences){
            callbackReferences = [];
            callbackReferenceDetails.set(details.callback, callbackReferences);
        }

        callbackReferences.push(resolvedPath);
        referenceDetails.push(details);

        set(resolvedPath, reference, modelBindings);
    }

    function bindExpression(binding, details){
        var expressionPaths = getPathsInExpression(binding),
            boundExpressions = {};

        for(var i = 0; i < expressionPaths.length; i++) {
            var path = expressionPaths[i];
            if(!boundExpressions[path]){
                boundExpressions[path] = true;
                setBinding(path, details);
            }
        }
    }

    function bind(path, callback, parentPath, binding){
        parentPath = parentPath || paths.create();

        var details = {
            binding: binding || path,
            callback: callback,
            parentPath: parentPath
        };

        // If the binding is a simple path, skip the more complex
        // expression path binding.
        if (paths.is(path)) {
            return setBinding(path, details);
        }

        bindExpression(path, details);
    }

    function matchWildcardPath(binding, target, parentPath){
        if(
            binding.indexOf(pathConstants.wildcard) >= 0 &&
            getPathsInExpression(binding)[0] === binding
        ){
            //fully resolve the callback path
            var wildcardParts = paths.toParts(paths.resolve('[/]', parentPath, binding)),
                targetParts = paths.toParts(target);

            for(var i = 0; i < wildcardParts.length; i++) {
                var pathPart = wildcardParts[i];
                if(pathPart === pathConstants.wildcard){
                    wildcardParts[i] = targetParts[i];
                }else if (pathPart !== targetParts[i]){
                    return false;
                }
            }

            return paths.create(wildcardParts);
        }
    }

    function createGetValue(expression, parentPath){
        return function(scope, returnAsTokens){
            return modelGet(expression, parentPath, scope, returnAsTokens);
        }
    }

    function emitEvents(path, target, captureType, emitter){
        var targetReference = get(path, modelBindings),
            referenceDetails = targetReference && modelBindingDetails.get(targetReference),
            eventDetails = [];

        if(referenceDetails){
            for(var i = 0; i < referenceDetails.length; i++) {
                var details = referenceDetails[i],
                    binding = details.binding,
                    wildcardPath = matchWildcardPath(binding, target, details.parentPath);

                // binding had wildcards but
                // did not match the current target
                if(wildcardPath === false){
                    continue;
                }

                emitter.emit({
                    callback: details.callback,
                    target: target,
                    binding: wildcardPath || details.binding,
                    captureType: captureType,
                    getValue: createGetValue(wildcardPath || details.binding, details.parentPath)
                });
            };
        }

        if(captureType === 'target' || captureType === 'sink'){
            for(var key in targetReference){
                emitEvents(paths.append(path, key), target, 'sink', emitter);
            }
        }
    }

    function bubbleEvent(path, target, emitter){
        var pathParts = path.toParts,
            currentBubblePath,
            type = 'bubble';

        for(var i = 0; i < pathParts.length - 1; i++){

            currentBubblePath = paths.append(currentBubblePath, pathParts[i]);

            if(i === pathParts.length -2 && !isNaN(pathParts[i+1])){
                type = 'arrayItem';
            }

            emitEvents(currentBubblePath, path, type, emitter);
            if(i !== pathParts.length -1){
                triggerReferences(currentBubblePath, path, emitter);
            }
        }
    }

    function trigger(path, type){
        // resolve path to root
        path = paths.resolve(paths.createRoot(), path);
        type = type || 'target';

        var targetReference = get(path, modelBindings),
            pathParts = paths.toParts(path),
            lastKey = pathParts[pathParts.length-1],
            currentBubblePath = paths.create(),
            eventDetails = [],
            emitter = new ModelEventEmitter();

        for(var i = 0; i < pathParts.length; i++){

            currentBubblePath = paths.append(currentBubblePath, pathParts[i]);

            if(i === pathParts.length -2 && !isNaN(pathParts[i+1])){
                type = 'arrayItem';
            }else if(i !== pathParts.length -1){
                type = 'bubble';
            }
            emitEvents(currentBubblePath, path, type, emitter);
            if(i !== pathParts.length -1){
                triggerReferences(currentBubblePath, path, emitter);
            }
        }

        console.log(Object.keys(emitter.alreadyEmitted));
    }

    function debindExpression(binding, callback){
        var expressionPaths = getPathsInExpression(binding);

        for(var i = 0; i < expressionPaths.length; i++) {
            var path = expressionPaths[i];
                debind(path, callback);
        }
    }

    function debind(path, callback){
        if(typeof path === 'function'){
            callback = path;
            path = null;
        }

        //If the binding has opperators in it, break them apart and set them individually.
        if (!paths.create(path)) {
            return debindExpression(path, callback);
        }

        if(path == null){
            var references = callback && callbackReferenceDetails.get(callback);
            if(references){
                while(references.length){
                    debindExpression(references.pop(), callback);
                }
            }else{
                resetEvents();
            }
            return;
        }

        // resolve path to root
        path = paths.resolve(paths.createRoot(), path);

        var targetReference = get(path, modelBindings),
            referenceDetails = modelBindingDetails.get(targetReference);

        if(referenceDetails){
            for(var i = 0; i < referenceDetails.length; i++) {
                var details = referenceDetails[i];
                if(!callback || callback === details.callback){
                    referenceDetails.splice(i, 1);
                    i--;
                }
            }
        }
    }


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
            if(prop && typeof prop === 'object'){
                var refPath = paths.append(path, key);
                if(modelReferences.has(prop)){
                    if(prop !== object){
                        modelReferences.get(prop)[refPath] = null;
                    }
                }else{
                    addModelReference(refPath, prop);
                }
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
            modelReferences['delete'](object);
        }

        for(var key in object){
            var prop = object[key];

            // Faster to check again here than to create pointless paths.
            if(prop && typeof prop === 'object' && prop !== object){
                removeModelReference(paths.append(path, paths.create(key)), prop);
            }
        }
    }

    function triggerReferences(path, targetPath, emitter){
        var parentPath = paths.resolve(paths.createRoot(), path),
            parentObject,
            objectReferences;

        parentObject = modelGet(parentPath);

        if(!parentObject || typeof parentObject !== 'object'){
            return;
        }

        objectReferences = modelReferences.get(parentObject);

        if(!objectReferences){
            return;
        }

        for(var path in objectReferences){
            if(path !== parentPath){
                emitEvents(path, targetPath, 'bubble', emitter);
            }
        }
    }

    return {
        bind: bind,
        trigger: trigger,
        debind: debind,
        addModelReference: addModelReference,
        removeModelReference: removeModelReference
    };
};