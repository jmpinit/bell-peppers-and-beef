"use strict";

var Reload = (function() {
    function Reload() {}

    Reload.prototype.watch = function() {
        if(this.ws === undefined || this.ws.readyState === WebSocket.CLOSED) {
            console.log("Reload: Watching.");

            this.ws = new WebSocket("ws://localhost:8080");

            this.ws.onmessage = function(msg) {
                if(msg.data === "reload") {
                    location.reload();
                }
            }

            var reloader = this;
            this.ws.onclose = function() {
                console.log("Reload: Connection closed, retrying.")
                setTimeout(function() {
                    reloader.watch();
                }, 500);
            };
        } else {
            console.log("Reload: already watching");
        }
    };

    return Reload;
}());
