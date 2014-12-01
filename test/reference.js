var Gedi = require('../'),
    test = require('grape');

test('reference bind', function(t) {
    var obj = {},
        gedi = new Gedi({
            foo: obj,
            bar: obj
        });

    t.plan(2);

    gedi.bind('[foo/things]', function(){
        t.pass('detected [foo/things] change');
    });
    gedi.bind('[bar/things]', function(){
        t.pass('detected [bar/things] change');
    });

    gedi.set('[foo/things]', 'things');


});

test('removed reference bind', function(t) {
    var obj = {},
        gedi = new Gedi({
            foo: obj,
            bar: obj
        });

    t.plan(2);

    // Should fire once when [foo] is removed
    gedi.bind('[foo/things]', function(){
        t.pass('detected [foo/things] change');
    });

    // Should fire once when [bar/things] is set
    gedi.bind('[bar/things]', function(){
        t.pass('detected [bar/things] change');
    });

    gedi.remove('[foo]');

    gedi.set('[bar/things]', 'things');


});

test('late added reference bind', function(t) {
    var obj = {things:'stuff'},
        gedi = new Gedi();

    t.plan(4);

    gedi.bind('[foo/things]', function(){
        t.pass('detected [foo/things] change');
    });
    gedi.bind('[bar/things]', function(){
        t.pass('detected [bar/things] change');
    });

    gedi.set('[foo]', obj);
    gedi.set('[bar]', obj);

    gedi.set('[foo/things]', 'things');


});

test('recursive added reference bind', function(t) {
    var obj = {things:'stuff'},
        gedi = new Gedi();

    t.plan(3);

    gedi.set('[foo]', obj);
    gedi.set('[foo/foo]', obj);

    gedi.bind('[foo/things]', function(){
        t.pass('detected [foo/things] change');
    });
    gedi.bind('[foo/foo/things]', function(){
        t.pass('detected [foo/foo/things] change');
    });
    gedi.bind('[foo/foo/foo/foo/foo/foo/foo/foo/things]', function(){
        t.pass('detected [foo/foo/foo/foo/foo/foo/foo/foo/things] change');
    });

    gedi.set('[foo/things]', 'things');
});


test('non-existant value reference bind', function(t) {
    t.plan(3);

    var x = {};

    var model = new Gedi({
        x: x
    });

    model.bind('[x]', function(event){
        t.pass('detected [x] change');
    });

    model.bind('[y/z]', function(event){
        t.pass('detected [y/z] change');
    });

    model.set('[y]', x);

    model.set('[x/z]', 'stuff');
});


test('array reference bind', function(t) {
    t.plan(3);

    var items = [
            {
                thing:'1'
            },
            {
                thing:'2'
            },
            {
                thing:'3'
            },
            {
                thing:'4'
            }
        ];

    var model = new Gedi({items: items});

    model.bind('[items]', function(event){
        t.pass('detected [items] change');
    });

    model.bind('[item]', function(event){
        t.pass('detected [item] change');
    });

    model.set('[item]', model.get('[items/2]'));

    model.set('[item/thing]', 'stuff');
});


test('recursive added reference bind direct child', function(t) {
    var obj = {},
        gedi = new Gedi();

    obj.obj = obj;

    t.plan(1);

    // should not cause a stack overflow
    gedi.set('[obj]', obj);

    t.pass();


});


test('deep reference change', function(t) {
    var obj = {a:{b:'c'}},
        gedi = new Gedi();

    t.plan(2);

    gedi.set('[things/0]', obj);

    gedi.set('[obj]', obj);

    gedi.bind('[things]', function(event){
        t.pass('captured change on [things]');
    });

    gedi.bind('[obj]', function(){
        t.pass('captured change on [obj]');
    });

    gedi.set('[obj/thing/stuff]', 'd');
});


test.only('array item reference change', function(t) {
    var obj = [{b:'c'}],
        gedi = new Gedi();

    t.plan(2);

    gedi.set('[items]',obj);

    gedi.set('[obj]', obj[0]);

    gedi.bind('[items]', function(event){
        t.pass('captured change on [items]');
    });

    gedi.bind('[obj]', function(){
        t.pass('captured change on [obj]');
    });

    gedi.set('[obj/b]', 'd');
});