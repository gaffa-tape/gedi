var Lang = require('lang-js'),
    paths = require('./paths'),
    createNestingParser = Lang.createNestingParser,
    detectString = Lang.detectString,
    Token = Lang.Token,
    Scope = Lang.Scope,
    createSpec = require('spec-js');

function fastEach(items, callback) {
    for (var i = 0; i < items.length; i++) {
        if (callback(items[i], i, items)) break;
    }
    return items;
}

function stringFormat(string, values){
    return string.replace(/{(\d+)}/g, function(match, number) {
        return values[number] != null
          ? values[number]
          : ''
        ;
    });
}

function isIdentifier(substring){
    var valid = /^[$A-Z_][0-9A-Z_$]*/i,
        possibleIdentifier = substring.match(valid);

    if (possibleIdentifier && possibleIdentifier.index === 0) {
        return possibleIdentifier[0];
    }
}

function tokeniseIdentifier(substring){
    // searches for valid identifiers or operators
    //operators
    var operators = "!=<>/&|*%-^?+\\",
        index = 0;

    while (operators.indexOf(substring.charAt(index)||null) >= 0 && ++index) {}

    if (index > 0) {
        return substring.slice(0, index);
    }

    var identifier = isIdentifier(substring);

    if(identifier != null){
        return identifier;
    }
}

function createKeywordTokeniser(Constructor, keyword){
    return function(substring){
        substring = isIdentifier(substring);
        if (substring === keyword) {
            return new Constructor(substring, substring.length);
        }
    };
}

function StringToken(){}
StringToken = createSpec(StringToken, Token);
StringToken.prototype.precedence = 2;
StringToken.prototype.stringTerminal = '"';
StringToken.prototype.name = 'double quoted string';
StringToken.tokenise = function (substring) {
    if (substring.charAt(0) === this.prototype.stringTerminal) {
        var index = 0,
        escapes = 0;

        while (substring.charAt(++index) !== this.prototype.stringTerminal)
        {
           if(index >= substring.length){
                   throw "Unclosed " + this.name;
           }
           if (substring.charAt(index) === '\\' && substring.charAt(index+1) === this.prototype.stringTerminal) {
                   substring = substring.slice(0, index) + substring.slice(index + 1);
                   escapes++;
           }
        }

        return new this(
            substring.slice(0, index+1),
            index + escapes + 1
        );
    }
}
StringToken.prototype.evaluate = function () {
    this.result = this.original.slice(1,-1);
}

function String2Token(){}
String2Token = createSpec(String2Token, StringToken);
String2Token.prototype.stringTerminal = "'";
String2Token.prototype.name = 'single quoted string';
String2Token.tokenise = StringToken.tokenise;

function ParenthesesToken(){
}
ParenthesesToken = createSpec(ParenthesesToken, Token);
ParenthesesToken.prototype.name = 'parentheses';
ParenthesesToken.tokenise = function(substring) {
    if(substring.charAt(0) === '(' || substring.charAt(0) === ')'){
        return new ParenthesesToken(substring.charAt(0), 1);
    }
}
ParenthesesToken.prototype.parse = createNestingParser(/^\($/,/^\)$/);
ParenthesesToken.prototype.evaluate = function(scope){
    scope = new Scope(scope);

    var functionToken = this.childTokens[0];

    if(!functionToken){
        throw "Invalid function call. No function was provided to execute.";
    }

    functionToken.evaluate(scope);

    if(typeof functionToken.result !== 'function'){
        throw functionToken.original + " (" + functionToken.result + ")" + " is not a function";
    }

    this.result = scope.callWith(functionToken.result, this.childTokens.slice(1), this);
};

function NumberToken(){}
NumberToken = createSpec(NumberToken, Token);
NumberToken.prototype.name = 'number';
NumberToken.tokenise = function(substring) {
    var specials = {
        "NaN": Number.NaN,
        "-NaN": Number.NaN,
        "Infinity": Infinity,
        "-Infinity": -Infinity
    };
    for (var key in specials) {
        if (substring.slice(0, key.length) === key) {
            return new NumberToken(key, key.length);
        }
    }

    var valids = "0123456789-.Eex",
        index = 0;

    while (valids.indexOf(substring.charAt(index)||null) >= 0 && ++index) {}

    if (index > 0) {
        var result = substring.slice(0, index);
        if(isNaN(parseFloat(result))){
            return;
        }
        return new NumberToken(result, index);
    }

    return;
};
NumberToken.prototype.evaluate = function(scope){
    this.result = parseFloat(this.original);
};

function NullToken(){}
NullToken = createSpec(NullToken, Token);
NullToken.prototype.name = 'semicolon';
NullToken.prototype.precedence = 2;
NullToken.tokenise = createKeywordTokeniser(NullToken, "null");
NullToken.prototype.evaluate = function(scope){
    this.result = null;
};

function UndefinedToken(){}
UndefinedToken = createSpec(UndefinedToken, Token);
UndefinedToken.prototype.name = 'undefined';
UndefinedToken.prototype.precedence = 2;
UndefinedToken.tokenise = createKeywordTokeniser(UndefinedToken, 'undefined');
UndefinedToken.prototype.evaluate = function(scope){
    this.result = undefined;
};

function TrueToken(){}
TrueToken = createSpec(TrueToken, Token);
TrueToken.prototype.name = 'true';
TrueToken.prototype.precedence = 2;
TrueToken.tokenise = createKeywordTokeniser(TrueToken, 'true');
TrueToken.prototype.evaluate = function(scope){
    this.result = true;
};

function FalseToken(){}
FalseToken = createSpec(FalseToken, Token);
FalseToken.prototype.name = 'false';
FalseToken.prototype.precedence = 2;
FalseToken.tokenise = createKeywordTokeniser(FalseToken, 'false');
FalseToken.prototype.evaluate = function(scope){
    this.result = false;
};

function DelimiterToken(){}
DelimiterToken = createSpec(DelimiterToken, Token);
DelimiterToken.prototype.name = 'delimiter';
DelimiterToken.prototype.precedence = 2;
DelimiterToken.tokenise = function(substring) {
    var i = 0;
    while(i < substring.length && substring.charAt(i).trim() === "" || substring.charAt(i) === ',') {
        i++;
    }

    if(i){
        return new DelimiterToken(substring.slice(0, i), i);
    }
};
DelimiterToken.prototype.parse = function(tokens, position){
    tokens.splice(position, 1);
};

function IdentifierToken(){}
IdentifierToken = createSpec(IdentifierToken, Token);
IdentifierToken.prototype.name = 'identifier';
IdentifierToken.prototype.precedence = 3;
IdentifierToken.tokenise = function(substring){
    var result = tokeniseIdentifier(substring);

    if(result != null){
        return new IdentifierToken(result, result.length);
    }
};
IdentifierToken.prototype.evaluate = function(scope){
    this.result = scope.get(this.original);
    this.sourcePathInfo = scope.get('__sourcePathInfoFor__' + this.original);
};

function PeriodToken(){}
PeriodToken = createSpec(PeriodToken, Token);
PeriodToken.prototype.name = 'period';
PeriodToken.prototype.precedence = 1;
PeriodToken.tokenise = function(substring){
    var periodConst = ".";
    return (substring.charAt(0) === periodConst) ? new PeriodToken(periodConst, 1) : undefined;
};
PeriodToken.prototype.parse = function(tokens, position){
    this.targetToken = tokens.splice(position-1,1)[0];
    this.identifierToken = tokens.splice(position,1)[0];
};
PeriodToken.prototype.evaluate = function(scope){
    this.targetToken.evaluate(scope);
    if(
        this.targetToken.result &&
        (typeof this.targetToken.result === 'object' || typeof this.targetToken.result === 'function')
        && this.targetToken.result.hasOwnProperty(this.identifierToken.original)
    ){
        this.result = this.targetToken.result[this.identifierToken.original];
    }else{
        this.result = undefined;
    }

    var targetPath;

    if(this.targetToken.sourcePathInfo){
        targetPath = this.targetToken.sourcePathInfo.path
    }

    if(targetPath){
        this.sourcePathInfo = {
            path: paths.append(targetPath, paths.create(this.identifierToken.original))
        };
    }
};

function FunctionToken(){}
FunctionToken = createSpec(FunctionToken, Token);
FunctionToken.prototype.name = 'function';
FunctionToken.tokenise = function convertFunctionToken(substring) {
    if(substring.charAt(0) === '{' || substring.charAt(0) === '}'){
        return new FunctionToken(substring.charAt(0), 1);
    }
};
FunctionToken.prototype.parse = createNestingParser(/^\{$/,/^\}$/);
FunctionToken.prototype.evaluate = function(scope){
    var parameterNames = this.childTokens.slice(),
        fnBody = parameterNames.pop();

    this.result = function(scope, args){
        scope = new scope.constructor(scope);

        for(var i = 0; i < parameterNames.length; i++){
            var parameterToken = args.getRaw(i);
            scope.set(parameterNames[i].original, args.get(i));
            if(parameterToken instanceof Token && parameterToken.sourcePathInfo){
                scope.set('__sourcePathInfoFor__' + parameterNames[i].original, parameterToken.sourcePathInfo);
            }
        }

        fnBody.evaluate(scope);

        if(args.callee){
            args.callee.sourcePathInfo = fnBody.sourcePathInfo;
        }

        return fnBody.result;
    };
};

function createResultPathsObject(token, source, trackSubPaths){
    var innerPathInfo = token.sourcePathInfo,
        originPath = '[]',
        sourcePathInfo = {};

    if(trackSubPaths){
        sourcePathInfo.subPaths = source && typeof source === 'object' && new source.constructor();
    }

    if(token instanceof Token && token.name === 'PathToken'){
        originPath = token.original;
        sourcePathInfo.original = token.result;
    }
    sourcePathInfo.original = innerPathInfo && innerPathInfo.original || token.result;
    sourcePathInfo.path = innerPathInfo && innerPathInfo.path || originPath;

    return sourcePathInfo;
}

function addResultItem(resultList, item, key, sourcePathInfo, innerPathInfo){
    resultList.push(item);
    if(sourcePathInfo.subPaths){
        sourcePathInfo.subPaths.push(innerPathInfo && innerPathInfo.subPaths && innerPathInfo.subPaths[key] || paths.append(sourcePathInfo.path, paths.create(key)));
    }
}

function ksort(array, sourceSubPaths, scope, sortFunction){

    if(array.length < 2){
        return {
            values: array,
            paths: sourceSubPaths
        };
    }

    var source = array.slice(),
        left = [],
        pivot = source.splice(source.length/2,1).pop(),
        pivotPath = sourceSubPaths.splice(sourceSubPaths.length/2,1).pop(),
        right = [],
        result,
        resultPaths;

    var leftPaths = [];
    var rightPaths = [];

    for(var i = 0; i < source.length; i++){
        var item = source[i];
        if(scope.callWith(sortFunction, [item, pivot]) > 0){
            right.push(item);
            rightPaths.push(sourceSubPaths[i]);
        }else{
            left.push(item);
            leftPaths.push(sourceSubPaths[i]);
        }
    }

    var leftResult = ksort(left, leftPaths, scope, sortFunction);

    left = leftResult.values;
    leftPaths = leftResult.paths;

    left.push(pivot);
    leftPaths.push(pivotPath);

    var rightResult = ksort(right, rightPaths, scope, sortFunction);

    right = rightResult.values;
    rightPaths = rightResult.paths;

    resultPaths = leftPaths.concat(rightPaths);

    result = left.concat(right);

    return {
        values: result,
        paths: resultPaths
    };
}

var tokenConverters = [
        StringToken,
        String2Token,
        ParenthesesToken,
        NumberToken,
        NullToken,
        UndefinedToken,
        TrueToken,
        FalseToken,
        DelimiterToken,
        IdentifierToken,
        PeriodToken,
        FunctionToken
    ],
    scope = {
        "toString":function(scope, args){
            return "" + args.next();
        },
        "+":function(scope, args){
            return args.next() + args.next();
        },
        "-":function(scope, args){
            return args.next() - args.next();
        },
        "/":function(scope, args){
            return args.next() / args.next();
        },
        "*":function(scope, args){
            return args.next() * args.next();
        },
        "isNaN":function(scope, args){
            return isNaN(args.get(0));
        },
        "max":function(scope, args){
            var result = args.next();
            while(args.hasNext()){
                result = Math.max(result, args.next());
            }
            return result;
        },
        "min":function(scope, args){
            var result = args.next();
            while(args.hasNext()){
                result = Math.min(result, args.next());
            }
            return result;
        },
        ">":function(scope, args){
            return args.next() > args.next();
        },
        "<":function(scope, args){
            return args.next() < args.next();
        },
        ">=":function(scope, args){
            return args.next() >= args.next();
        },
        "<=":function(scope, args){
            return args.next() <= args.next();
        },
        "?":function(scope, args){
            var result,
                resultToken;
            if(args.next()){
                result = args.get(1);
                resultToken = args.getRaw(1);
            }else{
                result = args.get(2);
                resultToken = args.getRaw(2);
            }

            args.callee.sourcePathInfo = resultToken && resultToken.sourcePathInfo;

            return result;
        },
        "!":function(scope, args){
            return !args.next();
        },
        "=":function(scope, args){
            return args.next() == args.next();
        },
        "==":function(scope, args){
            return args.next() === args.next();
        },
        "!=":function(scope, args){
            return args.next() != args.next();
        },
        "!==":function(scope, args){
            return args.next() !== args.next();
        },
        "||":function(scope, args){
            var nextArg;
            while(args.hasNext()){
                nextArg = args.next();
                if(nextArg){
                    return nextArg;
                }
            }
            return nextArg;
        },
        "|":function(scope, args){
            var nextArg;
            while(args.hasNext()){
                nextArg = args.next();
                if(nextArg === true ){
                    return nextArg;
                }
            }
            return nextArg;
        },
        "&&":function(scope, args){
            var nextArg;
            while(args.hasNext()){
                nextArg = args.next();
                if(!nextArg){
                    return false;
                }
            }
            return nextArg;
        },
        "object":function(scope, args){
            var result = {};
            while(args.hasNext()){
                result[args.next()] = args.next();
            }
            return result;
        },
        "keys":function(scope, args){
            var object = args.next();
            return typeof object === 'object' ? Object.keys(object) : undefined;
        },
        "values":function(scope, args){
            var target = args.next(),
                result = [];
            for(var key in target){
                result.push(target[key]);
            }
            return result;
        },
        "invert":function(scope, args){
            var target = args.next(),
                result = {};
            for(var key in target){
                result[target[key]] = key;
            }
            return result;
        },
        "extend":function(scope, args){
            var result = {};
            while(args.hasNext()){
                var nextObject = args.next();
                for(var key in nextObject){
                    result[key] = nextObject[key];
                }
            }
            return result;
        },
        "array":function(scope, args){
            var result = [];
            while(args.hasNext()){
                result.push(args.next());
            }
            return result;
        },
        "map":function(scope, args){
            var source = args.next(),
                isArray = Array.isArray(source),
                result = isArray ? [] : {},
                functionToken = args.next();

            if(isArray){
                fastEach(source, function(item, index){
                    result[index] = scope.callWith(functionToken, [item]);
                });
            }else{
                for(var key in source){
                    result[key] = scope.callWith(functionToken, [source[key]]);
                };
            }

            return result;
        },
        "pairs": function(scope, args){
            var target = args.next(),
                result = [];

            for(var key in target){
                if(target.hasOwnProperty(key)){
                    result.push([key, target[key]]);
                }
            }

            return result;
        },
        "flatten":function(scope, args){
            var target = args.next(),
                shallow = args.hasNext() && args.next();

            function flatten(target){
                var result = [],
                    source;

                for(var i = 0; i < target.length; i++){
                    source = target[i];

                    for(var j = 0; j < source.length; j++){
                        if(!shallow && Array.isArray(source[j])){
                            result.push(flatten(source));
                        }else{
                            result.push(target[i][j]);
                        }
                    }
                }
                return result;
            }
            return flatten(target);
        },
        "sort": function(scope, args) {
            var sourceToken = args.getRaw(0),
                source = args.next(),
                sortFunction = args.next(),
                result,
                sourceArrayKeys,
                sortValues = [];
                sourcePathInfo = createResultPathsObject(sourceToken, source, true),
                innerPathInfo = sourceToken.sourcePathInfo;

            if(!Array.isArray(source)){
                return;
            }

            for(var i = 0; i < source.length; i++){
                sourcePathInfo.subPaths[i] = (innerPathInfo && innerPathInfo.subPaths && innerPathInfo.subPaths[i]) || paths.append(sourcePathInfo.path, paths.create(i));
            }

            result = ksort(source, sourcePathInfo.subPaths, scope, sortFunction);
            sourcePathInfo.subPaths = result.paths;

            args.callee.sourcePathInfo = sourcePathInfo;

            return result.values;
        },
        "filter": function(scope, args) {
            var firstArgToken = args.getRaw(0),
                source = args.get(0),
                sourcePathInfo = createResultPathsObject(firstArgToken, source, true),
                innerPathInfo = firstArgToken.sourcePathInfo,
                filteredList = source && typeof source === 'object' && new source.constructor();

            var functionToCompare = args.get(1);

            if(!filteredList){
                return undefined;
            }

            var isArray = Array.isArray(source),
                item;

            for(var key in source){
                if(isArray && isNaN(key)){
                    continue;
                }
                item = source[key];
                if(typeof functionToCompare === "function"){
                    if(scope.callWith(functionToCompare, [item])){
                        addResultItem(filteredList, item, key, sourcePathInfo, innerPathInfo);
                    }
                }else{
                    if(item === functionToCompare){
                        addResultItem(filteredList, item, key, sourcePathInfo, innerPathInfo);
                    }
                }
            }

            args.callee.sourcePathInfo = sourcePathInfo;

            return filteredList;
        },
        "findOne": function(scope, args) {
            var args = args.all(),
                result;

            if (args.length < 2) {
                return args;
            }



            var array = args[0],
                functionToCompare = args[1];

            if (Array.isArray(array)) {

                fastEach(array, function(item, index){
                    if(scope.callWith(functionToCompare, [item])){
                        result = item;
                        return true;
                    }
                });
                return result;
            }
        },
        "concat":function(scope, args){
            var result = args.next();
            while(args.hasNext()){
                if(result == null || !result.concat){
                    return undefined;
                }
                var next = args.next();
                Array.isArray(next) && (result = result.concat(next));
            }
            return result;
        },
        "join":function(scope, args){
            args = args.all();

            return args.slice(1).join(args[0]);
        },
        "slice":function(scope, args){
            var sourceTokenIndex = 0,
                sourceToken,
                source = args.next(),
                start,
                end,
                sourcePathInfo,
                innerPathInfo;

            if(args.hasNext()){
                start = source;
                source = args.next();
                sourceTokenIndex++;
            }
            if(args.hasNext()){
                end = source;
                source = args.next();
                sourceTokenIndex++;
            }

            if(!source || !source.slice){
                return;
            }

            // clone source
            source = source.slice();

            sourceToken = args.getRaw(sourceTokenIndex);
            sourcePathInfo = createResultPathsObject(sourceToken, source, true),
            innerPathInfo = sourceToken.sourcePathInfo;

            var result = source.slice(start, end);

            if(sourcePathInfo.subPaths){
                sourcePathInfo.subPaths = innerPathInfo && innerPathInfo.subPaths && innerPathInfo.subPaths.slice(start, end);
            }

            args.callee.sourcePathInfo = sourcePathInfo;

            return result;
        },
        "split":function(scope, args){
            return args.next().split(args.hasNext() && args.next());
        },
        "last":function(scope, args){
            var sourceToken = args.getRaw(0),
                source = args.get(0),
                sourcePathInfo = createResultPathsObject(sourceToken, source),
                innerPathInfo = sourceToken.sourcePathInfo;

            if(sourcePathInfo && innerPathInfo && innerPathInfo){
                sourcePathInfo.path = innerPathInfo.subPaths && innerPathInfo.subPaths[innerPathInfo.subPaths.length - 1] || paths.append(sourcePathInfo.path, paths.create(source.length - 1));
                args.callee.sourcePathInfo = sourcePathInfo;
            }

            return source[source.length - 1];
        },
        "first":function(scope, args){
            var array = args.next();

            if(!Array.isArray(array)){
                return;
            }
            return array[0];
        },
        "length":function(scope, args){
            return args.next().length;
        },
        "getValue":function(scope, args){
            var target = args.next(),
                key = args.next();

            if(!target || typeof target !== 'object'){
                return;
            }

            return target[key];
        },
        "compare":function(scope, args){
            var args = args.all(),
                comparitor = args.pop(),
                reference = args.pop(),
                result = true,
                objectToCompare;

            while(args.length){
                objectToCompare = args.pop();
                for(var key in objectToCompare){
                    if(!scope.callWith(comparitor, [objectToCompare[key], reference[key]])){
                        result = false;
                    }
                }
            }

            return result;
        },
        "contains": function(scope, args){
            var args = args.all(),
                target = args.shift(),
                success = false,
                strict = false,
                arg;

            if(target == null){
                return;
            }

            if(typeof target === 'boolean'){
                strict = target;
                target = args.shift();
            }

            arg = args.pop();

            if(target == null || !target.indexOf){
                return;
            }

            if(typeof arg === "string" && !strict){
                arg = arg.toLowerCase();

                if(Array.isArray(target)){
                    fastEach(target, function(targetItem){
                        if(typeof targetItem === 'string' && targetItem.toLowerCase() === arg.toLowerCase()){
                            return success = true;
                        }
                    });
                }else{
                    if(typeof target === 'string' && target.toLowerCase().indexOf(arg)>=0){
                        return success = true;
                    }
                }
                return success;
            }else{
                return target.indexOf(arg)>=0;
            }
        },
        "charAt":function(scope, args){
            var target = args.next(),
                position;

            if(args.hasNext()){
                position = args.next();
            }

            if(typeof target !== 'string'){
                return;
            }

            return target.charAt(position);
        },
        "toLowerCase":function(scope, args){
            var target = args.next();

            if(typeof target !== 'string'){
                return undefined;
            }

            return target.toLowerCase();
        },
        "toUpperCase":function(scope, args){
            var target = args.next();

            if(typeof target !== 'string'){
                return undefined;
            }

            return target.toUpperCase();
        },
        "format": function format(scope, args) {
            var args = args.all();

            return stringFormat(args.shift(), args);
        },
        "refine": function(scope, args){
            var args = args.all(),
                exclude = typeof args[0] === "boolean" && args.shift(),
                original = args.shift(),
                refined = {};

            for(var i = 0; i < args.length; i++){
                args[i] = args[i].toString();
            }

            for(var key in original){
                if(args.indexOf(key)>=0){
                    !exclude && (refined[key] = original[key]);
                }else if(exclude){
                    refined[key] = original[key];
                }
            }

            return refined;
        },
        "date": (function(){
            var date = function(scope, args) {
                return args.length ? new Date(args.length > 1 ? args.all() : args.next()) : new Date();
            };

            date.addDays = function(scope, args){
                var baseDate = args.next();

                return new Date(baseDate.setDate(baseDate.getDate() + args.next()));
            }

            return date;
        })(),
        "toJSON":function(scope, args){
            return JSON.stringify(args.next());
        },
        "fromJSON":function(scope, args){
            return JSON.parse(args.next());
        },
        "fold": function(scope, args){
            var args = args.all(),
                fn = args.pop(),
                seed = args.pop(),
                array = args[0],
                result = seed;

            if(args.length > 1){
                array = args;
            }

            if(!array || !array.length){
                return result;
            }

            for(var i = 0; i < array.length; i++){
                result = scope.callWith(fn, [result, array[i]]);
            }

            return result;
        },
        "partial": function(scope, args){
            var outerArgs = args.all(),
                fn = outerArgs.shift();

            return function(scope, args){
                var innerArgs = args.all();
                return scope.callWith(fn, outerArgs.concat(innerArgs));
            };
        },
        "flip": function(scope, args){
            var outerArgs = args.all().reverse(),
                fn = outerArgs.pop();

            return function(scope, args){
                return scope.callWith(fn, outerArgs)
            };
        },
        "compose": function(scope, args){
            var outerArgs = args.all().reverse();

            return function(scope, args){
                var result = scope.callWith(outerArgs[0], args.all());

                for(var i = 1; i < outerArgs.length; i++){
                    result = scope.callWith(outerArgs[i], [result]);
                }

                return result;
            };
        },
        "apply": function(scope, args){
            var fn = args.next()
                outerArgs = args.next();

            return scope.callWith(fn, outerArgs);
        }
    };


Gel = function(){
    var gel = {},
        lang = new Lang();

    gel.lang = lang;
    gel.tokenise = function(expression){
        return gel.lang.tokenise(expression, this.tokenConverters);
    }
    gel.evaluate = function(expression, injectedScope, returnAsTokens){
        var scope = new Scope();

        scope.add(this.scope).add(injectedScope);

        return lang.evaluate(expression, scope, this.tokenConverters, returnAsTokens);
    };
    gel.tokenConverters = tokenConverters.slice();
    gel.scope = Object.create(scope);

    return gel;
};

Gel.Token = Token;
Gel.Scope = Scope;
module.exports = Gel;