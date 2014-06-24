var memoisedTokenPaths = {};
function tokenPaths(gel, expression) {
    if(!memoisedTokenPaths[path]){

        var tokens = gel.tokenise(path),
            paths = [];

        for(var i = 0; i < tokens.length; i++){
            if(tokens[0].path){
                paths.push(tokens[i]);
            }
        }
        memoisedTokenPaths[path] = paths;
    }

    return memoisedTokenPaths[path].slice();
}

function forEachSourcePath(expression, parentPath, scope, subPathOpperation){
    var path;

    scope = scope || {};
    scope._gmc_ = parentPath;

    var sourcePaths = tokenPaths(this, expression),
        uniquePaths = {};

    for(var i = 0; i < sourcePaths.length; i++){
        uniquePaths[sourcePaths[i]] = null;
    }

    var resultToken = this.evaluate(expression, scope, true)[0],
        sourcePathInfo = resultToken.sourcePathInfo;

    if(sourcePathInfo){
        if(sourcePathInfo.subPaths){
            for(var i = 0; i < sourcePathInfo.subPaths.length; i++){
                uniquePaths[sourcePathInfo.subPaths[i]] = null;
            }
            return;
        }
        path = sourcePathInfo.path;
    }else{
        path = resultToken.path;
    }
    if(path){
        subPathOpperation(path);
    }

    for(var key in uniquePaths){
        subPathOpperation(key);
    }

}

module.exports = function(gel){
    return forEachSourcePath.bind(gel);
}