var util = require('util');
var fs = require('fs');

var mustache = require('mustache');

var File = require('vinyl');
var Transform = require('stream').Transform;

function PostBuilder(template) {
    if (!(this instanceof PostBuilder))
        return new PostBuilder(template);

    Transform.call(this, {objectMode: true});

    this._template = template;
}; util.inherits(PostBuilder, Transform);

PostBuilder.prototype._transform = function(files, enc, cb) {
    var view = files['meta'];
    view.body = files['body'].contents;

    var rendered = mustache.render(this._template, view);

    var renderFile = files['body'].clone();
    renderFile.contents = new Buffer(rendered);

    this.push(renderFile);

    cb();
}

module.exports = PostBuilder;
