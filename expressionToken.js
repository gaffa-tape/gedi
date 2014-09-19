var Lang = require('lang-js'),
    Token = Lang.Token,
    paths = require('gedi-paths'),
    createSpec = require('spec-js'),
    detectPath = require('gedi-paths/detectPath');

module.exports = function(evaluateToTokens){

    function ExpressionToken(expression){
		this.expression = expression;
		this.length = expression.length;
    }
    ExpressionToken = createSpec(ExpressionToken, Token);
    ExpressionToken.prototype.name = 'ExpressionToken';
    ExpressionToken.tokenPrecedence = 1;
    ExpressionToken.prototype.evaluate = function(scope){
        var resultTokens = evaluateToTokens(this.expression, scope);

        if(!resultTokens || !resultTokens.length){
            return;
        }

        this.result = resultTokens[resultTokens.length-1].result;
        this.sourcePathInfo = resultTokens[resultTokens.length-1].sourcePathInfo;
    };

    return ExpressionToken;
}