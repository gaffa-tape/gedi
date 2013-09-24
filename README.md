Gedi
====

Gaffa evented data interface

[![browser support](https://ci.testling.com/gaffa-tape/gedi.png)](https://ci.testling.com/gaffa-tape/gedi)

# What #

An *EXTREMELY* powerful model API wrapper.

# Why? #

Keeping track of model changes is hard.

Checking properties is tedious

Mantaining hard references to properties is annoying.

Gedi makes it easy, quick, and maintainable.

# Dependencies #

Gedi has no dependencies, however, it is much more powerful with Gel ( https://github.com/gaffa-tape/gel )

# Usage #

## Instantiation ##

To wrap a model

    var model = new Gedi({bla:[1,2,3]});

## Model accessing ##

### Paths ###

To access the model, use paths

Path syntax is like HTML paths:

    [/property/property/property]
     ^     ^       ^          ^
    root   |   sub property   |
     property on model     sub sub property

This syntax is used as a way to reference value within the model, and is used by the get() set() remove() and bind() functions.

Internally, all string paths are converted to an instance of a Path object. The constructor is accessable on the Gedi instance:

    var path = new model.Path('[thing]');

This object makes working with paths easier:

    var resolvedPath = new Path().append('[/hello]', '[things]', '[..stuff]', '[majigger]');

    // resolvedPath will be [hello/majigger]

You can go up levels to a specific key in a path:

    var resolvedPath = new Path('[/accounts/5/docs/4/title]').append('[..docs]');

    // resolvedPath will be [/accounts/5/docs]

You can go to the last removed key after going up a level:

    var resolvedPath = new Path('[/accounts/5/docs/4/title]').append('[..accounts/#/id]');

    // resolvedPath will be [/accounts/5/id]

### Expressions ###

Expressions can be used to manipulate the data as it is being retrieved from the model. Gedi Expressions use Gel to perform opperations.

Expressions are logically functional, and as such have no side-effects.

### Get ###

    model.get([path/expression])

get will return the value of the model, at the path specified. if get is called with a falsy path, eg undefined, it will return the entire model.

    model.get();

    // returns the model

Access the 'bla' property:

    return model.get('[bla]');

    // returns the array [1,2,3]

Access an index

    return model.get('[bla/2]');

    // returns 3

Use an expression to get the length of an array:

    model.get('(length [property/someArray])');

    // will throw a "parameter was not an object" error because the array doesn't exist..

Access via a relative path

    return model.get('[2]', '[bla]');
                       ^       ^
                      Path   Parent Path

    // returns 3

This is useful when you have a group of opperations to do at a common path depth

    var model = new Gedi({
            property:{
                majigger:{
                    thing: 'a',
                    stuff: 'b',
                    whatsits: 'c'
                }
            }
        }),
        currentPath = '[property/majigger]',
        thing = model.get('[thing]', currentPath),
        stuff = model.get('[stuff]', currentPath),
        whatsits = model.get('[whatsits]', currentPath);

        ...

gaffa (https://github.com/gaffa-tape/gaffa-js) uses this feature to resolve paths in nested viewItems

Relative paths are also useful when using expressions:

        ...

        return model.get('(filter [] {item (= item "b")})', currentPath);

        // will return {stuff: 'b'}

### Set ###

To modify the model:

    model.set('[property/majigger/thing]', 'hello');

set() can also be relative:

    model.set('[thing]', 'hello', '[property/majigger]');

If you set into a non-existant path, gedi will automatically create objects to put your value in:

    model.set('[this/does/not/exist/yet]', 'Now It Does');

If you use an integer in a path, gedi assumes the object is an array:

    model.set('[missingArray/0]', 'item');

    // will create a new array at model.missingArray

You can also set into expressions.

    model.set('(last [someArray])', 'item');

    // will set the last index of someArray to 'item'
    // Assuming someArray exists

You can also set into the sub-paths of an expression. (Oh yes..)

    model.set('(map (filter [someArray] {item (>item.age 100)}) {item item.dead})', true);

    // will set all dead properties on items in someArray over
    // the age of 100 to true

You can also remove via sub-paths of an expression. (lel..)

    model.remove('(filter [someArray] {item item.dead})');

    // will remove all dead items in someArray

## Binding to changes ##

Callbacks can be bound to the model via Paths or Expressions:

### Binding to a Path ###

    model.bind('[thing/stuff]', function(event){
        alert(model.get(event.target));
    });

    model.set('[thing/stuff]', 5);

    // will alert 5.

The event.target property contains a path to the changed property, NOT the path used to bind the callback.

The event.getValue method returns the value at the path used to bind the callback.

#### Binding to Paths with wildcards ####

You can bind to paths containing wildcards to watch for changes to properties on items in an array:

    model.bind('[thing/*/stuff/*/a]', function(event){
        alert(event.getValue());
    });

    gedi.set('[thing/1/stuff/1/a]', 1); // will alert 2
    gedi.set('[thing/2/stuff/2/b]', 2); // not trigger the callback, because the triggered path does not match the bound path


### Binding to an Expression ###

if an Expression is passed to bind(), it will automatically detect every binding in the expression and set the callback to trigger when any referenced parts of the model changes.


    model.bind('(|| [a] [b] [c])', function(event){
        alert(event.getValue());
    });

    model.set('[b]', 'b is now truthy'); // will alert b

    model.set('[a]', 'a is now truthy'); // will alert a

    model.set('[c]', 'c is now truthy'); // will alert a because a is already set, and it is truthy

Expressions with wildcards are not supported, as there is no logical way to handle an expression containing more than one wildcarded path.

### Removing a binding ###

To stop listening for changes to the model, use .debind()

To remove a callback at a specific path:

    model.debind('[a]', callback);

To remove a callback from gedi entirely:

    model.debind(callback);

To remove all callbacks at a specific path:

    model.debind('[a]');


