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

    function bindExpression(binding, callback, parentPath){
        var expressionPaths = getPathsInExpression(binding),
            boundExpressions = {};

        for(var i = 0; i < expressionPaths.length; i++) {
            var path = expressionPaths[i];
            if(!boundExpressions[path]){
                boundExpressions[path] = true;
                bind(path, callback, parentPath);
            }
        }
    }

    function bind(path, callback, parentPath){
        parentPath = parentPath || paths.create();

        var bindingDetails = {
            binding: path,
            callback: callback,
            parentPath: parentPath
        };

        //If the binding has opperators in it, break them apart and set them individually.
        if (!paths.create(path)) {
            return bindExpression(path, callback, parentPath);
        }

        // by this stage path will be a simple path

        var callbackReferences = callbackReferenceDetails.get(callback) || [];

        callbackReferences.push(path);

        callbackReferenceDetails.set(callback, callbackReferences);


        bindingDetails.captureBubbling = paths.isBubbleCapture(path);

        var resolvedPath = paths.resolve(parentPath, path),
            reference = get(resolvedPath, modelBindings) || {},
            referenceDetails = modelBindingDetails.get(reference) || [];

        modelBindingDetails.set(reference, referenceDetails);

        referenceDetails.push(bindingDetails);

        set(resolvedPath, reference, modelBindings);
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
                for(var i = 0; i < references.length; i++) {
                    debindExpression(references[i], callback);
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