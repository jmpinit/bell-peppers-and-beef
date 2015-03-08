var gulp = require('gulp'),
    nodemon = require('gulp-nodemon'),
    rename = require('gulp-rename'),
    markdown = require('gulp-markdown')
    tap = require('gulp-tap');

var fs = require('fs');

var PostBuilder = require('./gulp/post-builder');
var Tandem = require('./gulp/tandem');

// TODO autogenerate watch tasks

gulp.task('posts', function() {
    var postTemplate = fs.readFileSync('templates/post.mustache', 'utf8');
    var posts = gulp.src('posts/*.md').pipe(markdown());
    var metas = gulp.src('posts/*.json');

    return Tandem({'body': posts, 'meta': metas}).pipe(PostBuilder(postTemplate)).pipe(gulp.dest('www/'));
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
		watch: ['server.js']
	});
});
