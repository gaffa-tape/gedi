var Gedi = require('./gedi');

window.Gedi = Gedi;

window.onload = function(){

    var tests = [
        {
            name: "basic get",
            test: function(){
                var gedi = new Gedi({thing:'stuff'});
                
                this.result = gedi.get('[thing]');
            },
            expected: 'stuff'
        },
        {
            name: "basic too-deep get",
            test: function(){
                var gedi = new Gedi({thing:'stuff'});
                
                this.result = gedi.get('[thing/stuff]');
            },
            expected: undefined
        },
        {
            name: "nested get",
            test: function(){
                var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}}});
                
                this.result = gedi.get('[thing/stuff/majigger]');
            },
            expected: 'stuff'
        },
        {
            name: "basic set",
            test: function(){
                var gedi = new Gedi();
                
                gedi.set('[thing]', 'stuff');
                this.result = gedi.get('[thing]');
            },
            expected: 'stuff'
        },
        {
            name: "basic set via Path",
            test: function(){
                var gedi = new Gedi();
                
                gedi.set(new gedi.Path('[thing]'), false);
                this.result = gedi.get('[thing]');
            },
            expected: false
        },
        {
            name: "nested set",
            test: function(){
                var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}}});
                
                gedi.set('[thing/stuff/majigger]', 'things');
                this.result = gedi.get('[thing/stuff/majigger]');
            },
            expected: 'things'
        },
        {
            name: "basic remove",
            test: function(){
                var gedi = new Gedi({thing:'stuff'});
                
                gedi.remove('[thing]');
                this.result = gedi.get('[thing]');
            },
            expected: undefined
        },
        {
            name: "nested remove",
            test: function(){
                var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}}});
                
                gedi.remove('[thing/stuff/majigger]');
                this.result = gedi.get('[thing/stuff/majigger]');
            },
            expected: undefined
        },
        {
            name: "tree creation",
            test: function(){
                var gedi = new Gedi();
                
                gedi.set('[thing/stuff/majigger]', 'things');
                this.result = gedi.get('[thing/stuff/majigger]');
            },
            expected: 'things'
        },
        {
            name: "basic bind",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set('[thing]', 'things');
                gedi.bind('[thing]', function(){
                    test.result = true;
                });
                gedi.set('[thing]', 'stuff');
            },
            expected: true
        },
        {
            name: "array bind",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set('[things]', []);
                gedi.bind('[things]', function(){
                    test.result = true;
                });
                gedi.set('[things/0]', 'stuff');
            },
            expected: true
        },
        {
            name: "nested bind",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set('[thing/stuff/majigger]', 'things');
                gedi.bind('[thing/stuff/majigger]', function(){
                    test.result = true;
                });
                gedi.set('[thing/stuff/majigger]', 'stuff');
            },
            expected: true
        },
        {
            name: "pre allocated bind",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.bind('[thing/stuff/majigger]', function(){
                    test.result = true;
                });
                gedi.set('[thing/stuff/majigger]', 'stuff');
            },
            expected: true
        },
        {
            name: "remove bind",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set('[thing]', 'things');
                gedi.bind('[thing]', function(){
                    test.result = true;
                });
                gedi.remove('[thing]');
            },
            expected: true
        },
        {
            name: "scoped bind",
            test: function(){
                var gedi = new Gedi({thing:[1,2,3]}),
                    test = this;
                    
                this.result = 0;
                
                // Root binding should NOT fire
                gedi.bind('[]', function(){
                    test.result++;
                });
                
                // Array binding SHOULD fire
                gedi.bind('[thing]', function(){
                    test.result++;
                });                        
                
                // child binding SHOULD fire
                gedi.bind('[thing/4]', function(){
                    test.result++;
                });
                
                gedi.set('[thing/3]',4);
            },
            expected: 2
        },
        {
            name: "remove scoped bind",
            test: function(){
                var gedi = new Gedi({a:1,b:2,c:3}),
                    test = this;
                    
                this.result = 0;
                
                // Object binding SHOULD fire
                gedi.bind('[]', function(){
                    test.result++;
                });
                
                // target binding SHOULD fire
                gedi.bind('[a]', function(){
                    test.result++;
                });
                
                // Sibling binding should NOT fire
                gedi.bind('[b]', function(){
                    test.result++;
                });
                
                gedi.remove('[a]');
            },
            expected: 2
        },
        {
            name: "bind bubbled event.getValue()",
            test: function(){
                var gedi = new Gedi({thing:{stuff:{majigger:10}}}),
                    test = this;
                
                test.result = {};
                
                gedi.bind('[thing]', function(event){
                    test.result.thing = event.getValue();
                });
                gedi.bind('[thing/stuff/majigger]', function(event){
                    test.result.majigger = event.getValue();
                });
                
                gedi.set('[thing/stuff/majigger]', 20);

                test.result = JSON.stringify(test.result);
            },
            expected: '{"thing":{"stuff":{"majigger":20}},"majigger":20}'
        },
        {
            name: "bind bubbled event.getValue() remove",
            test: function(){
                var gedi = new Gedi({thing:{stuff:{majigger:10}}}),
                    test = this;
                
                test.result = {};
                
                gedi.bind('[thing]', function(event){
                    test.result.thing = event.getValue();
                });
                gedi.bind('[thing/stuff/majigger]', function(event){
                    test.result.majigger = event.getValue();
                });
                
                gedi.remove('[thing/stuff/majigger]');

                test.result = JSON.stringify(test.result);
            },
            expected: '{"thing":{"stuff":{}}}'
        },
        {
            name: "bind expression event.value",
            test: function(){
                var gedi = new Gedi({thing:{stuff:{majigger:10}}}),
                    test = this;
                
                gedi.bind('(/ [thing/stuff/majigger] 2)', function(event){
                    test.result = event.getValue();
                });
                
                gedi.set('[thing/stuff/majigger]', 20);
            },
            expected: 10
        },
        {
            name: "bind expression event.getValue() complex",
            test: function(){
                var gedi = new Gedi({thing:{stuff:{majigger:[true,false,true]}}}),
                    test = this;
                
                test.result = {};
                
                gedi.bind('(length (filter [majigger] {item (!= item null)}))', function(event){
                    test.result.length = event.getValue();
                },'[thing/stuff]');
                
                gedi.bind('[thing/stuff]', function(event){
                    test.result.stuff = event.getValue();
                });
                
                gedi.set('[thing/stuff/majigger/3]', 'hello');

                test.result = JSON.stringify(test.result);
            },
            expected: '{"stuff":{"majigger":[true,false,true,"hello"]},"length":4}'
        },
        {
            name: "relative get",
            test: function(){
                var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}}});
                
                this.result = gedi.get('[majigger]', '[thing/stuff]');
            },
            expected: 'stuff'
        },
        {
            name: "relative get root",
            test: function(){
                var model = {thing:{stuff:{majigger:'stuff'}}},
                    gedi = new Gedi(model),
                    test = this;
                    
                test.expected = model;
                
                this.result = gedi.get('[/]', '[thing/stuff]');
            }
            //expected: Object reference set in test.
        },
        {
            name: "relative set",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set('[majigger]', 'whatsit', '[thing/stuff]');
                this.result = gedi.get('[thing/stuff/majigger]');
            },
            expected: 'whatsit'
        },
        {
            name: "relative set root",
            test: function(){
                var model = {thing:{stuff:{majigger:'stuff'}}},
                    gedi = new Gedi(),
                    test = this;
                    
                test.expected = model.thing;
                
                gedi.set('[/]', model, '[thing/stuff]');
                
                this.result = gedi.get('[]').thing;
            }
            //expected: Object reference set in test.
        },
        {
            name: "up a level get",
            test: function(){
                var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}, whatsits:'things'}}),
                    test = this;
                
                this.result = gedi.get('[../whatsits]', '[thing/stuff]');
            },
            expected: 'things'
        },
        {
            name: "up a level set",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set('[../whatsit]', 'whatsit', '[thing/stuff]');
                this.result = gedi.get('[/thing/whatsit]');
            },
            expected: 'whatsit'
        },
        {
            name: "root get",
            test: function(){
                var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}, whatsits:'hello'}}),
                    test = this;
                
                this.result = gedi.get('[/thing/whatsits]', '[thing/stuff]');
            },
            expected: 'hello'
        },
        {
            name: "root set",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set('[thing/stuff/majigger]', 'stuff');
                gedi.set('[/thing/whatsits]', 'hello', '[thing/stuff/majigger]');
                
                this.result = gedi.get('[/thing/whatsits]');
            },
            expected: 'hello'
        },
        {
            name: "same path get",
            test: function(){
                var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}}}),
                    test = this;
                
                this.result = gedi.get('[]', '[thing/stuff/majigger]');
            },
            expected: 'stuff'
        },
        {
            name: "same path set",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set('[]', 'stuff', '[thing/stuff/majigger]');
                
                this.result = gedi.get('[thing/stuff/majigger]');
            },
            expected: 'stuff'
        },
        {
            name: "set clean",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set('[thing/stuff/majigger]', 'stuff', null, false);
                this.result = gedi.isDirty('[thing/stuff/majigger]');
            },
            expected: false
        },
        {
            name: "set implicit dirty",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set('[thing/stuff/majigger]', 'stuff');
                this.result = gedi.isDirty('[thing/stuff/majigger]');
            },
            expected: true
        },
        {
            name: "set explicit dirty",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set('[thing/stuff/majigger]', 'stuff', null, true);
                this.result = gedi.isDirty('[thing/stuff/majigger]');
            },
            expected: true
        },
        {
            name: "set root (overwrite model)",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set({things:'stuff'});
                this.result = gedi.get('[things]');
            },
            expected: 'stuff'
        },
        {
            name: "get root (return model)",
            test: function(){
                var gedi = new Gedi('stuff'),
                    test = this;
                
                this.result = gedi.get();
            },
            expected: 'stuff'
        },
        {
            name: "get dirty state of overwrite",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set({things:'stuff'});
                this.result = gedi.isDirty();
            },
            expected: true
        },
        {
            name: "set dirty state of overwrite",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set({things:'stuff'}, false);
                this.result = gedi.isDirty();
            },
            expected: false
        },
        {
            name: "is dirty expression",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set({things:'stuff'}, false);
                this.result = gedi.get('(isDirty)');
            },
            expected: false
        },
        {
            name: "is dirty expression 2",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set({things:'stuff'});
                this.result = gedi.get('(isDirty)');
            },
            expected: true
        },
        {
            name: "is dirty expression 3",
            test: function(){
                var gedi = new Gedi({things:{a:'a',b:'b',c:'c'},stuff:'b',majigger:'c'}),
                    test = this;
                
                gedi.set('[things/a]', 'nope', false);
                gedi.set('[things/b]', 'yerp');
                this.result = gedi.get('(isDirty [things/a])');
            },
            expected: false
        },
        {
            name: "is dirty expression 4",
            test: function(){
                var gedi = new Gedi({things:{a:'a',b:'b',c:'c'},stuff:'b',majigger:'c'}),
                    test = this;
                
                gedi.set('[things/a]', 'nope', false);
                gedi.set('[things/b]', 'yerp');
                this.result = gedi.get('(isDirty [things/b])');
            },
            expected: true
        },
        {
            name: "get all dirty expression",
            test: function(){
                var gedi = new Gedi(),
                    test = this;
                
                gedi.set({things:'stuff'}, false);
                this.result = gedi.get('(getAllDirty).things');
            },
            expected: undefined
        },
        {
            name: "get all dirty expression 2",
            test: function(){
                var gedi = new Gedi({things:{a:'a',b:'b',c:'c'},stuff:'b',majigger:'c'}),
                    test = this,
                    allDirty;
                
                gedi.set('[things/a]', 'nope', false);
                gedi.set('[things/b]', 'yerp');
                allDirty = gedi.get('(getAllDirty [things])');
                this.result = [allDirty.a, allDirty.b, allDirty.c].join(' ');
            },
            expected: ' yerp '
        },
        {
        name: "expression path resolving",
            test: function(){
                var gedi = new Gedi({stuff:{things:[1,2,3]}}),
                    test = this;
                
                
                this.result = gedi.get('(last [things])', '[stuff]');
            },
            expected: 3
        },
        {
        name: "expression root path resolving",
            test: function(){
                var gedi = new Gedi({stuff:{things:[1,2,3]}}),
                    test = this;
                
                
                this.result = gedi.get('(length [/stuff].things)', '[stuff]');
            },
            expected: 3
        },
        {
        name: "escaped braces",
            test: function(){
                var model = {},
                    gedi = new Gedi(model),
                    test = this;
                
                model['[]'] = 'things';
                
                this.result = gedi.get('[\\[\\]]');
            },
            expected: 'things'
        },
        {
        name: "escaped braces resolution",
            test: function(){
                var model = {},
                    gedi = new Gedi(model),
                    test = this;
                
                model['[]'] = {};
                model['[]'][']['] = 'things';
                
                this.result = gedi.get('[\\]\\[]', '[\\[\\]]');
            },
            expected: 'things'
        },
        {
        name: "escaped escapes", //http://knowyourmeme.com/memes/xzibit-yo-dawg
            test: function(){
                var model = {},
                    gedi = new Gedi(model),
                    test = this;
                
                model['\\'] = 'things';
                
                this.result = gedi.get('[\\\\]');
            },
            expected: 'things'
        },
        {
        name: "escaped braces resolution",
            test: function(){
                var model = {},
                    gedi = new Gedi(model),
                    test = this;
                
                model['\\'] = {};
                model['\\']['\\'] = 'things';
                
                this.result = gedi.get('[\\\\]', '[\\\\]');
            },
            expected: 'things'
        },
        {
        name: "escaped braces and escaped escapes",
            test: function(){
                var model = {},
                    gedi = new Gedi(model),
                    test = this;
                
                model['\\[]\\'] = 'things';
                
                this.result = gedi.get('[\\\\[\\]\\\\]');
            },
            expected: 'things'
        },
        {
        name: "debind all",
            test: function(){
                var model = {},
                    gedi = new Gedi(model),
                    test = this,
                    callback = function(){
                        test.result++;
                    },
                    callback2 = function(){
                        test.result++;
                    };
                    
                this.result = 0;
                
                gedi.bind('[things]', callback);
                
                gedi.set('[things]', 'stuff');
                
                gedi.debind();
                
                gedi.set('[things]', 'majigger');
            },
            expected: 1
        },
        {
        name: "debind callback",
            test: function(){
                var model = {},
                    gedi = new Gedi(model),
                    test = this,
                    callback = function(){
                        test.result++;
                    };
                    
                this.result = 0;
                
                gedi.bind('[things]', callback);
                gedi.bind('[]', callback);
                
                gedi.set('[things]', 'stuff');
                
                gedi.debind(callback);
                
                gedi.set('[things]', 'majigger');
            },
            expected: 2
        },
        {
        name: "debind path",
            test: function(){
                var model = {},
                    gedi = new Gedi(model),
                    test = this,
                    callback = function(){
                        test.result++;
                    },
                    callback2 = function(){
                        test.result++;
                    };
                    
                this.result = 0;
                
                gedi.bind('[things]', callback);
                gedi.bind('[things]', callback2);
                
                gedi.set('[things]', 'stuff');
                
                gedi.debind('[things]');
                
                gedi.set('[things]', 'majigger');
            },
            expected: 2
        },
        {
        name: "debind callback at path",
            test: function(){
                var model = {},
                    gedi = new Gedi(model),
                    test = this,
                    callback = function(){
                        test.result++;
                    };
                    
                this.result = 0;
                
                gedi.bind('[things]', callback);
                gedi.bind('[]', callback);
                
                gedi.set('[things]', 'stuff');
                
                gedi.debind('[things]', callback);
                
                gedi.set('[things]', 'majigger');
            },
            expected: 3
        },
        {
        name: "debind expression",
            test: function(){
                var model = {},
                    gedi = new Gedi(model),
                    test = this,
                    callback = function(){
                        test.result++;
                    };
                    
                this.result = 0;
                
                gedi.bind('(concat [things][things])', callback);
                
                gedi.set('[things]', 'stuff');
                
                gedi.debind('(concat [things][things])', callback);
                
                gedi.set('[things]', 'majigger');
            },
            expected: 2
        },
        {
        name: "empty path",
            test: function(){
                var gedi = new Gedi(),
                    path = new gedi.Path();

                this.result = path.length;
            },
            expected: 0
        },
        {
        name: "root path",
            test: function(){
                var gedi = new Gedi(),
                    path = new gedi.Path('[/]');

                this.result = path.length === 1 && path.isRoot();
            },
            expected: true
        },
        {
        name: "absolute path",
            test: function(){
                var gedi = new Gedi(),
                    path = new gedi.Path('[/majigger]');

                this.result = path.length === 2 && path.isAbsolute();
            },
            expected: true
        },
        {
        name: "relative path",
            test: function(){
                var gedi = new Gedi(),
                    path = new gedi.Path('[majigger]');

                this.result = path.length === 1 && path.isAbsolute();
            },
            expected: false
        },
        {
        name: "append path",
            test: function(){
                var gedi = new Gedi(),
                    path = new gedi.Path('[majigger]');

                path = path.append('[../stuff]')

                this.result = path.toString();
            },
            expected: '[majigger/../stuff]'
        }
    ];
    
    var resultsElement = document.getElementsByClassName('results')[0];

    function runTests(){
        var errors = [],
            passed = 0,
            startTime = new Date();
            
        for(var i = 0; i < tests.length; i++){
            var test = tests[i],
                resultElement,
                title,
                runBtn,
                result,
                description,
                hasError = false;
            
            try{
                test.test.call(test);
            }catch(error){
                errors.push(error.toString() + error.stack);
                hasError = true;
            }
            test.passed = test.result === test.expected && !hasError;
            
            test.passed && passed++;
            
            resultElement = crel('div', {'class':(test.passed && 'passed' || 'failed') + ' test'},
                (title = crel('h1', test.name + ' ' + (test.passed && 'passed' || 'failed'))),
                (result = crel('span', {'class':'result'}), 'output: ' + test.result + ', expected: ' + test.expected),
                (runBtn = crel('button', {type:'button'}, 'Run again')),
                (description = crel('pre', {'class':'description'}, test.test.toString()))
            );
            
            (function(test){
                runBtn.addEventListener('click', function(){
                    test.test.call(test);
                });
            })(test);
            
            resultsElement.appendChild(resultElement);
        }
        
        console.log('Runtime: ' + (new Date() - startTime));
        
        for(var i = 0; i < errors.length; i++){
            console.error(errors[i]);
        }
        
        return passed;
    }
    
    
    
    var summaryElement = document.getElementsByClassName('summary')[0],
        passed = runTests(),
        failed = tests.length - passed;
    
    summaryElement.appendChild(crel('h1', passed + ' Tests passed, ' + failed + ' Tests failed'));
    summaryElement.setAttribute('class',(!failed?'passed':'failed') + ' summary');
};