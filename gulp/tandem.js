var util = require('util');

var Readable = require('stream').Readable;

function Tandem(streams) {
    // allow use without new
    if (!(this instanceof Tandem))
        return new Tandem(streams);

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
}; util.inherits(Tandem, Readable);

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
};

Tandem.prototype._maybePush = function() {
    var chunk = this._maybeChunk();

    if(chunk == null) {
        if(this._dry) {
            this.push(null);
        }
    } else {
        this.push(chunk);
    }
};

Tandem.prototype._read = function() {
    this._maybePush();
};module.exports = Tandem;