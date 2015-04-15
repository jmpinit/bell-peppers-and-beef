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

var exec = require('child_process').exec;
var os = require('os');
var fs = require('fs');
var path = require('path');
var File = require('vinyl');

var validator = require('./gulp/meta-linter');
var PostBuilder = require('./gulp/post-builder');
var Tandem = require('./gulp/tandem');
var intoArray = require('./gulp/into-array');

var opts = {
    loc: {
        templates: '_templates',
        stylesheets: '_stylesheets',
        posts: '_posts'
    },
    reload: true
}

var config = JSON.parse(fs.readFileSync('blog-config.json', 'utf8'));

var buildTasks = ['posts', 'index', 'scripts'];

function reload() {
    if(opts.reload) {
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

    var info = JSON.parse(fs.readFileSync(config.info, 'utf8'));
    var template = fs.createReadStream(config.templates + '/index.mustache', {encoding: 'utf8'});
    var postrefs = gulp.src(config.posts + '/*.json')
        .pipe(referencer)
        .pipe(intoArray());

    return Tandem({'template': template, 'postrefs': postrefs})
        .pipe(through2.obj(function(parts, enc, cb) {
            var byDate = function(a, b) {
                if(new Date(a.meta.date) < new Date(b.meta.date)) return -1;
                if(new Date(a.meta.date) > new Date(b.meta.date)) return 1;
                return 0;
            };

            var view = {
                site: info,
                posts: parts.postrefs
                    .sort(byDate)
                    .reverse(),
                opts: opts
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
    var addOptions = through2.obj(function(meta, enc, cb) {
        meta.opts = opts;
        this.push(meta);
        cb();
    });

    var template = fs.readFileSync(config.templates + '/post.mustache', 'utf8');
    var posts = gulp.src(config.posts + '/*.md').pipe(markdown());
    var metas = gulp.src(config.posts + '/*.json')
        .pipe(validator())
        .pipe(addOptions);

    return Tandem({'body': posts, 'meta': metas})
        .pipe(PostBuilder(template))
        .pipe(gulp.dest('www/post/'));
});

gulp.task('scripts', function() {
    return gulp.src('scripts/*.js')
        .pipe(gulp.dest('www/scripts/'));
});

gulp.task('posts-reload', ['posts'], function() { reload(); });
gulp.task('index-reload', ['index'], function() { reload(); });

gulp.task('watch', buildTasks, function() {
    gulp.watch(config.posts + '/*', ['posts', 'index', 'posts-reload']);
    gulp.watch(config.templates + '/post.mustache', ['posts', 'posts-reload']);
    gulp.watch(config.templates + '/index.mustache', ['index', 'index-reload']);
    gulp.watch('scripts/*', ['scripts']);
    gulp.watch(config.info, ['posts', 'index', 'posts-reload', 'index-reload']);
});

gulp.task('build', buildTasks, function() {});

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

gulp.task('archive', genTasks, function() {
    var sources = [
        'site.json',
        opts.loc.posts, opts.loc.templates, opts.loc.stylesheets,
    ];

    if(os.type() === 'Windows_NT') {
        exec('7z a site-archive.zip ' + sources.join(' '),
            function(error, stdout, stderr) {
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);

                if (error !== null) {
                    console.log('exec error: ' + error);
                }
            }
        );
    } else {
        console.log("archive task not implemented for " + os.type());
    }
})

gulp.task('default', ['build'], function() { process.exit(0); });
