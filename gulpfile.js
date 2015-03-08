var gulp = require('gulp'),
    nodemon = require('gulp-nodemon'),
    rename = require('gulp-rename'),
    markdown = require('gulp-markdown')
    tap = require('gulp-tap'),
    through2 = require('through2');

var mustache = require('mustache');

var fs = require('fs');
var path = require('path');
var File = require('vinyl');

var PostBuilder = require('./gulp/post-builder');
var Tandem = require('./gulp/tandem');

var genTasks = ['posts', 'index'];

gulp.task('index', ['posts'], function() {
    var referencer = through2.obj(
        function(file, enc, cb) {
            var href = path.basename(file.path);
            this.push(href);
            cb();
        }
    );

    var intoArray = through2.obj(
        function(chunk, enc, cb) {
            if(this._arr === undefined) this._arr = [];
            this._arr.push(chunk);
            cb();
        },
        function(cb) {
            this.push(this._arr);
            cb();
        }
    );

    var toString = through2.obj(
        function(chunk, enc, cb) { this.push(JSON.stringify(chunk)); cb(); }
    )

    var template = fs.createReadStream('templates/index.mustache', {encoding: 'utf8'});

    var hrefs = gulp.src('www/post/*.html')
        .pipe(referencer)
        .pipe(intoArray);

    var meta = JSON.parse(fs.readFileSync('site.json', 'utf8'));

    return Tandem({'template': template, 'pagerefs': hrefs})
        .pipe(through2.obj(function(parts, enc, cb) {
            meta.pagerefs = parts.pagerefs;

            var render = mustache.render(parts.template, meta);
            this.push(new File({
                cwd: '.', base: '.', path: '.',
                contents: new Buffer(render)
            }));
            cb();
        }))
        .pipe(gulp.dest('www/index.html'));
});

gulp.task('posts', function() {
    var template = fs.readFileSync('templates/post.mustache', 'utf8');
    var posts = gulp.src('posts/*.md').pipe(markdown());
    var metas = gulp.src('posts/*.json');

    return Tandem({'body': posts, 'meta': metas})
        .pipe(PostBuilder(template))
        .pipe(gulp.dest('www/post'));
});

gulp.task('watch', genTasks, function() {
    gulp.watch('posts/*', ['posts', 'index']);
    gulp.watch('templates/post.mustache', ['posts']);
    gulp.watch('templates/index.mustache', ['index']);
    gulp.watch('site.json', ['posts', 'index']);
});

gulp.task('serve', ['watch'], function () {
	nodemon({
		script: 'server.js',
		ext: 'js',
		env: {
			'NODE_ENV': 'development',
		},
		verbose: false,
		watch: ['server.js']
	});
});
