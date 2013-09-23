module.exports = function detectPath(substring){
    if (substring.charAt(0) === '[') {
        var index = 1;

        do {
            if (
                (substring.charAt(index) === '\\' && substring.charAt(index + 1) === '\\') || // escaped escapes
                (substring.charAt(index) === '\\' && (substring.charAt(index + 1) === '[' || substring.charAt(index + 1) === ']')) //escaped braces
            ) {
                index++;
            }
            else if(substring.charAt(index) === ']'){
                return substring.slice(0, index+1);
            }
            index++;
        } while (index < substring.length);
    }
};