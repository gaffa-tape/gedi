var Lang = require('lang-js'),
    Token = Lang.Token,
    paths = require('./paths'),
    createSpec = require('spec-js'),
    detectPath = require('./detectPath');

module.exports = function(get, model){

    function PathToken(){}
    PathToken = createSpec(PathToken, Token);
    PathToken.prototype.precedence = 4;
    PathToken.tokenise = function(substring){
        var path = detectPath(substring);

        if(path){
            return new PathToken(path, path.length);
        }
    };
    PathToken.prototype.evaluate = function(scope){
        this.path = this.original;
        this.result = get(paths.resolve(scope.get('_gediModelContext_'), this.original), model);
        this.sourcePathInfo = {
            path: this.original
        };
    };

    return PathToken;
}