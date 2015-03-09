require("long-stack-traces");

var gulp = require('gulp'),
    gutil = require('gulp-util'),
    nodemon = require('gulp-nodemon'),
    rename = require('gulp-rename'),
    markdown = require('gulp-markdown')
    tap = require('gulp-tap'),
    through2 = require('through2');

var WebSocketServer = require('ws').Server;
var reloadServer = new WebSocketServer({ port: 8080 });

var mustache = require('mustache');

var fs = require('fs');
var path = require('path');
var File = require('vinyl');

var validator = require('./gulp/meta-linter')
var PostBuilder = require('./gulp/post-builder');
var Tandem = require('./gulp/tandem');
var intoArray = require('./gulp/into-array');

var options = {
    reload: true
}

var genTasks = ['posts', 'index', 'scripts'];

function reload() {
    if(options.reload) {
        reloadServer.clients.forEach(function each(client) {
            client.send("reload");
        });
    }
}

gulp.task('index', function() {
    // collects info needed for post list entries
    var referencer = through2.obj(
        function(file, enc, cb) {
            this.push({
                meta: JSON.parse(file.contents),
                href: '/post/' + gutil.replaceExtension(path.basename(file.path), '.html')
            });
            cb();
        }
    );

    var template = fs.createReadStream('templates/index.mustache', {encoding: 'utf8'});

    var postrefs = gulp.src('posts/*.json')
        .pipe(referencer)
        .pipe(intoArray());

    var meta = JSON.parse(fs.readFileSync('site.json', 'utf8'));

    return (new Tandem({'template': template, 'postrefs': postrefs}))
        .pipe(through2.obj(function(parts, enc, cb) {
            var view = {
                site: meta,
                posts: parts.postrefs,
                reload: options.reload
            }

            var render = mustache.render(parts.template, view);

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
    var metas = gulp.src('posts/*.json').pipe(validator);

    return Tandem({'body': posts, 'meta': metas})
        .pipe(PostBuilder(template))
        .pipe(gulp.dest('www/post'));
});

gulp.task('scripts', function() {
    return gulp.src('scripts/*.js')
        .pipe(gulp.dest('www/scripts/'));
});

gulp.task('posts-reload', ['posts'], function() { reload(); });
gulp.task('index-reload', ['index'], function() { reload(); });

gulp.task('watch', genTasks, function() {
    gulp.watch('posts/*', ['posts', 'index', 'reload']);
    gulp.watch('templates/post.mustache', ['posts', 'posts-reload']);
    gulp.watch('templates/index.mustache', ['index', 'index-reload']);
    gulp.watch('scripts/*', ['scripts']);
    gulp.watch('site.json', ['posts', 'index', 'reload']);
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
