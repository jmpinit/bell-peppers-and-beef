var gutil = require('gulp-util');
var through2 = require('through2');
var path = require('path');

var requiredProps = ['title', 'date'];
var optionalProps = ['description'];
var allProps = requiredProps.concat(optionalProps);

module.exports = through2.obj(
    function(file, enc, cb) {
        var fn = path.basename(file.path);

        var suggest = function(msg) {
            gutil.log(gutil.colors.blue('suggestion (' + fn + '): ' + msg));
        }

        var warn = function(msg) {
            gutil.log(gutil.colors.yellow('WARNING (' + fn + '): ' + msg));
        };

        var fatal = function(msg) {
            gutil.log(gutil.colors.red('ERROR (' + fn + '): ' + msg));
            throw "Fatal validation error";
        };

        try {
            var meta = JSON.parse(file.contents);
        } catch(e) {
            fatal('parsing failed: ' + e);
        }

        // assert all properties are known properties
        for(prop in meta) {
            if(allProps.indexOf(prop) == -1) {
                warn('unknown property: "' + prop + '"');
            }
        }

        // assert that required properties exist
        requiredProps.forEach(function(prop) {
            if(!(prop in meta))
                fatal('required property "' + prop + '" missing');
        });

        // date format
        if(meta.date.match(/^\d\d-\d\d-\d\d\d\d$/) === null) {
            fatal('date formatted wrong ' + meta.date);
        }

        // convenience

        if(meta.title.match(/[\-_]/) !== null) {
            suggest('spaces are preferred in titles like "' + meta.title + '"');
        }

        cb();
    }
);
