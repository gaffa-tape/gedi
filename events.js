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
        if (paths.create(path)) {
            return setBinding(path, details);
        }

        bindExpression(path, details);
    }

    function triggerPath(path, target, type){
        var targetReference = get(path, modelBindings),
            referenceDetails = modelBindingDetails.get(targetReference);

        if(referenceDetails){
            for(var i = 0; i < referenceDetails.length; i++) {
                var details = referenceDetails[i],
                    binding = details.binding;

                if(type === 'bubble' && !details.captureBubbling){
                    continue;
                }

                // ToDo: wildcards

                details.callback({
                    target: target,
                    getValue: function(scope, returnAsTokens){
                        return modelGet(details.binding, details.parentPath, scope, returnAsTokens);
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
        var targetReference = get(path, modelBindings),
            pathParts = paths.toParts(path),
            lastKey = pathParts[pathParts.length-1],
            currentBubblePath = paths.create();

        if(!type){
            for(var i = 0; i < pathParts.length; i++){
                if(i === pathParts.length -1 && !isNaN(pathParts[i])){
                    triggerPath(currentBubblePath, path, 'arrayKey');
                }else{
                    triggerPath(currentBubblePath, path, 'bubble');
                }
                currentBubblePath = paths.append(currentBubblePath, pathParts[i]);
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