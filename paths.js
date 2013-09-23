var detectPath = require('./detectPath');

var pathSeparator = "/",
    upALevel = "..",
    currentKey = "#",
    rootPath = "",
    pathStart = "[",
    pathEnd = "]",
    pathWildcard = "*";

function pathToRaw(path) {
    return path && path.slice(1, -1);
}

//***********************************************
//
//      Raw To Path
//
//***********************************************

function rawToPath(rawPath) {
    return pathStart + (rawPath == null ? '' : rawPath) + pathEnd;
}

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
            } else if (pathPart === currentKey) {
                // Has a last removed? Add it back on.
                if(lastRemoved != null){
                    absoluteParts.push(lastRemoved);
                    lastRemoved = null;
                }
            } else if (pathPart === rootPath) {
                // Root path? Reset parts to be absolute.
                absoluteParts = [''];

            } else if (pathPart === upALevel) {
                // Up a level? Remove the last item in absoluteParts
                lastRemoved = absoluteParts.pop();
            } else if (pathPart.slice(0,2) === upALevel) {
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
        if(path.charAt(0) === pathStart) {
            var pathString = path.toString(),
                detectedPath = detectPath(pathString);

            if (detectedPath && detectedPath.length === pathString.length) {
                return memoisedPathTokens[pathString] = detectedPath;
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
        return rawToPath(parts.join(pathSeparator));
    }
}

function createRootPath(){
    return createPath([rootPath, rootPath]);
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
        return path.split(pathSeparator);
    }

    parts = [];

    for(var i = 0; i < path.length; i++){
        currentChar = path.charAt(i);
        if(currentChar === pathSeparator){
            parts.push(path.slice(lastPartIndex,i));
            lastPartIndex = i+1;
        }else if(currentChar === '\\'){
            nextChar = path.charAt(i+1);
            if(nextChar === '\\'){
                path = path.slice(0, i) + path.slice(i + 1);
            }else if(nextChar === ']' || nextChar === '['){
                path = path.slice(0, i) + path.slice(i + 1);
            }else if(nextChar === pathSeparator){
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
    return pathToParts(path)[0] === rootPath;
}

function isPathRoot(path){
    var parts = pathToParts(path);
    return (isPathAbsolute(parts) && parts[0] === parts[1]) || parts.length === 0;
}

module.exports = {
    resolve: resolvePath,
    create: createPath,
    isAbsolute: isPathAbsolute,
    isRoot: isPathRoot,
    append: appendPath,
    toParts: pathToParts,
    createRoot: createRootPath,
    constants:{
        separator: pathSeparator,
        upALevel: upALevel,
        currentKey: currentKey,
        root: rootPath,
        start: pathStart,
        end: pathEnd,
        wildcard: pathWildcard
    }
};