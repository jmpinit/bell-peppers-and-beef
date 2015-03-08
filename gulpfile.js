var gulp = require('gulp'),
    nodemon = require('gulp-nodemon'),
    rename = require('gulp-rename'),
    markdown = require('gulp-markdown')
    tap = require('gulp-tap');

var mustache = require("mustache");

var streamqueue = require('streamqueue');
var through2 = require('through2');
var fs = require('fs');

var Readable = require('stream').Readable;
var util = require('util');
var File = require('vinyl');

function Tandem(streams) {
    // allow use without new
    if (!(this instanceof Tandem)) {
        return new Tandem(streams);
    }

    Readable.call(this, { objectMode: true });

    this._sources = streams;
    this._buffers = {};

    function endHandler(tandem, name) {
        return function() {
            tandem._dry = true;
        };
    }

    function readableHandler(tandem, name, source) {
        return function() {
            var data = source.read();

            if(data != null) {
                tandem._buffers[name].push(data);
                tandem._maybePush();
            }
        }
    }

    for(name in this._sources) {
        this._buffers[name] = [];

        var src = this._sources[name];

        src.on('end', endHandler(this, name));
        src.on('readable', readableHandler(this, name, src));
    }
} util.inherits(Tandem, Readable);

Tandem.prototype._maybeChunk = function() {
    for(name in this._buffers) {
        if(this._buffers[name].length == 0) {
            return null;
        }
    }

    var chunk = {};
    for(name in this._buffers) {
        var buff = this._buffers[name];
        chunk[name] = buff.shift();
    }

    return chunk;
}

Tandem.prototype._maybePush = function() {
    var chunk = this._maybeChunk();

    if(chunk == null) {
        if(this._dry) {
            this.push(null);
        }
    } else {
        this.push(chunk);
    }
}

Tandem.prototype._read = function() {
    this._maybePush();
};

var Transform = require('stream').Transform;

function PostBuilder(template) {
    if (!(this instanceof PostBuilder))
        return new PostBuilder(template);

    Transform.call(this, {objectMode: true});

    this._template = template;
} util.inherits(PostBuilder, Transform);

PostBuilder.prototype._transform = function(files, enc, cb) {
    var view = JSON.parse(files['meta'].contents);
    view.body = files['body'].contents;

    var rendered = mustache.render(this._template, view);

    var renderFile = files['body'].clone();
    renderFile.contents = new Buffer(rendered);

    this.push(renderFile);

    cb();
};

// TODO autogenerate watch tasks

gulp.task('posts', function() {
    var postTemplate = fs.readFileSync('templates/post.mustache', 'utf8');
    var posts = gulp.src('posts/*.md').pipe(markdown());
    var metas = gulp.src('posts/*.json');

    return Tandem({"body": posts, "meta": metas}).pipe(PostBuilder(postTemplate)).pipe(gulp.dest('www/'));
});

gulp.task('watch-posts', ['posts'], function() {
    gulp.watch('posts/*', ['posts']);
});

gulp.task('watch-templates', function() {
    gulp.watch('templates/*', ['posts']);
});

gulp.task('serve', ['watch-posts', 'watch-templates'], function () {
	nodemon({
		script: 'server.js',
		ext: 'js',
		env: {
			'NODE_ENV': 'development',
		},
		verbose: false,
		watch: ["server.js"]
	});
});
