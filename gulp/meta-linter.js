var gutil = require('gulp-util');
var through2 = require('through2');
var path = require('path');

var requiredProps = ['title', 'date'];
var optionalProps = ['description'];
var allProps = requiredProps.concat(optionalProps);

function suggest(fn, msg) {
    gutil.log(gutil.colors.blue('suggestion (' + fn + '): ' + msg));
}

function warn(fn, msg) {
    gutil.log(gutil.colors.yellow('WARNING (' + fn + '): ' + msg));
}

function fatal(fn, msg) {
    gutil.log(gutil.colors.red('ERROR (' + fn + '): ' + msg));
    throw "Fatal validation error";
}

var assert = {
    propertiesKnown: function(fn, meta) {
        // assert all properties are known properties
        for(prop in meta) {
            if(allProps.indexOf(prop) == -1) {
                warn(fn, 'unknown property: "' + prop + '"');
            }
        }
    },

    requiredExist: function(fn, meta) {
        // assert that required properties exist
        requiredProps.forEach(function(prop) {
            if(!(prop in meta))
                fatal(fn, 'required property "' + prop + '" missing');
        });
    },

    dateFormat: function(fn, meta) {
        // date format
        if(meta.date.match(/^\d\d-\d\d-\d\d\d\d$/) === null) {
            fatal(fn, 'date formatted wrong ' + meta.date);
        }
    },

    titleStyle: function(fn, meta) {
        if(meta.title.match(/[\-_]/) !== null) {
            suggest(fn, 'spaces are preferred in titles like "' + meta.title + '"');
        }
    }
}

module.exports = function() {
    return through2.obj(
        function(file, enc, cb) {
            var fn = path.basename(file.path);

            try {
                var meta = JSON.parse(file.contents);
            } catch(e) {
                fatal(fn, 'parsing failed: ' + e);
            }

            for(name in assert) {
                assert[name](fn, meta);
            }

            this.push(file);

            cb();
        }
    );
}
