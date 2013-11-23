var HybridMap = require('hybrid-map').HybridMap,
    paths = require('gedi-paths'),
    pathConstants = paths.constants
    modelOpperations = require('./modelOpperations'),
    get = modelOpperations.get,
    set = modelOpperations.set;

module.exports = function(modelGet, gel, PathToken){
    var modelBindings,
        modelBindingDetails,
        callbackReferenceDetails;

    function resetEvents(){
        modelBindings = {};
        modelBindingDetails = new HybridMap();
        callbackReferenceDetails = new HybridMap();
    }

    resetEvents();

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
        details.captureBubbling = paths.isBubbleCapture(path);

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
                targetParts = paths.toParts(target),
                wildcardMatchFail;

            for(var i = 0; i < wildcardParts.length; i++) {
                var pathPart = wildcardParts[i];
                if(pathPart === pathConstants.wildcard){
                    wildcardParts[i] = targetParts[i];
                }else if (pathPart !== targetParts[i]){
                    return;
                }
            }

            if(!wildcardMatchFail){
                return paths.create(wildcardParts);
            }
        }
    }

    function triggerPath(path, target, type){
        var targetReference = get(path, modelBindings),
            referenceDetails = modelBindingDetails.get(targetReference);

        if(referenceDetails){
            for(var i = 0; i < referenceDetails.length; i++) {
                var details = referenceDetails[i],
                    binding = details.binding,
                    wildcardPath = matchWildcardPath(binding, target, details.parentPath);

                if(!wildcardPath && type === 'bubble' && !details.captureBubbling){
                    continue;
                }

                details.callback({
                    target: target,
                    binding: wildcardPath || details.binding,
                    type: type,
                    getValue: function(scope, returnAsTokens){
                        return modelGet(wildcardPath || details.binding, details.parentPath, scope, returnAsTokens);
                    }
                });
            };
        }

        if(!type || type === 'sink'){
            for(var key in targetReference){
                triggerPath(paths.append(path, key), path, 'sink');
            }
        }
    }

    function trigger(path, type){
        // resolve path to root
        path = paths.resolve(paths.createRoot(), path);

        var targetReference = get(path, modelBindings),
            pathParts = paths.toParts(path),
            lastKey = pathParts[pathParts.length-1],
            currentBubblePath = paths.create();

        if(!type){
            for(var i = 0; i < pathParts.length; i++){
                var bubbleType;

                currentBubblePath = paths.append(currentBubblePath, pathParts[i]);

                if(i === pathParts.length -2 && !isNaN(pathParts[i+1])){
                    bubbleType = 'arrayItem';
                }else{
                    bubbleType = 'bubble';
                }
                triggerPath(currentBubblePath, path, bubbleType);
            }
        }

        triggerPath(path, path, type);
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
            var references = callbackReferenceDetails.get(callback);
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

    return {
        bind: bind,
        trigger: trigger,
        debind: debind
    };
};