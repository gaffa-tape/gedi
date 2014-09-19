var Gedi = require('../'),
    test = require('grape'),
    createExpressionToken = require('../expressionToken');

test('basic bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[thing]', 'things');
    gedi.bind('[thing]', function(){
        t.pass('detected [thing] change');
    });

    gedi.set('[thing]', 'stuff');

});

test('array bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[things]', []);
    gedi.bind('[things]', function(event){
        t.pass('detected [things] change');
    });

    gedi.set('[things/0]', 'stuff');

});

test('array length bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[things]', []);
    gedi.bind('[things].length', function(event){
        if(event.captureType === 'keys'){
            t.pass('detected [things/length] change');
        }
    });

    gedi.set('[things/0]', 'stuff');

});

test('nested bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[thing/stuff/majigger]', 'things');
    gedi.bind('[thing/stuff/majigger]', function(){
        t.pass('captured [thing/stuff/majigger] change');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');

});

test('pre-allocated bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.bind('[thing/stuff/majigger]', function(){
        t.pass('captured [thing/stuff/majigger] change');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');

});

test('remove bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[thing]', 'things');
    gedi.bind('[thing]', function(){
        t.pass('captured [thing] remove');
    });

    gedi.remove('[thing]');

});

test('scoped bind', function(t) {
    var gedi = new Gedi({thing:[1,2,3]});

    t.plan(2);

    // Root bubble binding SHOULD fire
    gedi.bind('[]', function(){
        t.pass('captured [] change');
    });

    // Array binding SHOULD fire
    gedi.bind('[thing]', function(){
        t.pass('captured [thing] change');
    });

    // child binding should NOT fire
    gedi.bind('[thing/4]', function(){
        t.fail('captured [thing/4] change');
    });

    gedi.set('[thing/3]',4);

});

test('remove scoped bind', function(t) {
    var gedi = new Gedi({a:1,b:2,c:3});

    t.plan(2);

    // Object binding SHOULD fire
    gedi.bind('[]', function(){
        t.pass('captured [] change');
    });

    // target binding SHOULD fire
    gedi.bind('[a]', function(){
        t.pass('captured [a] change');
    });

    // Sibling binding should NOT fire
    gedi.bind('[b]', function(){
        t.fail('captured [b] change (should not have fired)');
    });

    gedi.remove('[a]');

});

test('bubbled bind', function(t) {
    var gedi = new Gedi();

    t.plan(2);

    gedi.bind('[thing]', function(event){
        t.pass('captured event on [thing]');
        t.equal(event.captureType, 'bubble', 'Event capture type was "bubble"');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');

});

test('target bind', function(t) {
    var gedi = new Gedi();

    t.plan(2);

    gedi.bind('[thing/stuff/majigger]', function(event){
        t.pass('captured event on [thing/stuff/majigger]');
        t.equal(event.captureType, 'target', 'Event capture type was "target"');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');

});

test('sink bind', function(t) {
    var gedi = new Gedi();

    t.plan(2);

    gedi.bind('[thing/stuff/majigger]', function(event){
        t.pass('captured event on [thing/stuff/majigger]');
        t.equal(event.captureType, 'sink', 'Event capture type was "sink"');
    });

    gedi.set('[thing]', {stuff:{majigger:1}});

});

test('ignored sink bind', function(t) {
    var gedi = new Gedi();

    t.plan(2);

    gedi.bind('[thing/stuff/majigger]', function(event){
        t.pass('captured event on [thing/stuff/majigger]');
        t.equal(event.captureType, 'sink', 'Event capture type was "sink"');
    });

    gedi.set('[thing]', 1);

});

test.only('scope included expressions', function(t) {
    var gedi = new Gedi({
        majiggers:[1,2]
    });

    var ExpressionToken = createExpressionToken(function(expression, scope){
            return gedi.get(expression, null, scope, true);
        }),
        thingToken = new ExpressionToken('(last [majiggers])'),
        scope = {
            thing: thingToken
        };

    thingToken.evaluate(scope);

    t.plan(2);

    gedi.bind('thing', function(event){
        t.pass('captured event on identifier thing');
        t.equal(event.getValue(scope), 3);
    }, null, scope);

    gedi.set('[majiggers/2]', 3);

});