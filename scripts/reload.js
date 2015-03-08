var reload = (function() {
    var exports = {};

    exports.watch = function() {
        if(this.ws === undefined || this.ws.readyState === WebSocket.CLOSED) {
            this.ws = new WebSocket("ws://localhost:8080");
            this.ws.onmessage = function(msg) {
                console.log(msg);
                if(msg.data === "reload") {
                    location.reload();
                }
            }
        }
    }

    return exports;
}());
