var through2 = require('through2');

module.exports = function() {
    return through2.obj(
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
};
