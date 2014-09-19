function getTokenPaths(token, expressionPaths){
    if(token.path != null){
        expressionPaths.push(token.path);
    }
    if(token.paths){
        expressionPaths.push.apply(expressionPaths, token.paths);
    }
}

function getExpressionPaths(expression, gel) {
    var expressionPaths = [];

    if (gel) {
        var tokens = gel.tokenise(expression);
        for(var index = 0; index < tokens.length; index++){
            var token = tokens[index];

            getTokenPaths(token, expressionPaths);
        }
    } else {
        return [paths.create(expression)];
    }
    return expressionPaths;
}

module.exports = getExpressionPaths;