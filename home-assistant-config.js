module.exports = function(RED) {

    var ws = require("ws");
    var events = require('events');

    function HAssConfig(config) {
        RED.nodes.createNode(this,config);
        this.host = config.host;
        this.port = config.port;
        this.ssl = config.ssl;
        this.entity = config.entity;
        this.events = new events.EventEmitter();
        this.currentStatus = '';
        this.stateMessage = '';
        this.msgId = 1;

        var node = this;
        node.closing = false;

        function connect() {
            var socket = new ws( node.ssl?"wss":"ws" + "://" + node.host + ":" + node.port + "/api/websocket");
            node.server = socket;
            socket.setMaxListeners(100);

            socket.on('error', function (e) {
                RED.log.trace(RED._("Error connecting to Home Assistant"));
                node.currentStatus = 'error';
                node.events.emit('stateChanged');
                if (!node.closing) {
                    clearTimeout(node.tout);
                    node.tout = setTimeout(function() {
                        connect();
                    }, 5000);
                }
            });

            socket.on('open', function () {
                RED.log.trace(RED._("Connected to Home Assistant"));
                node.currentStatus = 'open';
                node.events.emit('stateChanged');
            });

            socket.on('close', function () {
                RED.log.trace(RED._("Disconnected from Home Assistant"));
                node.currentStatus = 'close';
                node.events.emit('stateChanged');
                if (!node.closing) {
                    clearTimeout(node.tout);
                    node.tout = setTimeout(function() {
                        connect();
                    }, 5000);
                }
            });

            node.sendToSocket = function (obj) {
                if (socket) {
                    socket.send(JSON.stringify(obj) + '\n');
                }
            };

            socket.on('message', function incoming(data) {
                var obj = JSON.parse(data);
                if (obj.type=='auth_ok') {
                    RED.log.trace(RED._("Authenticated to Home Assistant. Subscribing to events."));
                    node.currentStatus = 'auth_ok';
                    node.events.emit('stateChanged');
                } else if (obj.type=='auth_required') {
                    node.sendToSocket({"type": "auth", "api_password": node.credentials.password});
                } else if (obj.type=='auth_invalid') {
                    node.error(RED._("Unable to authenticate to Home Assistant: " + obj.message));
                    node.currentStatus = 'auth_invalid';
                    node.stateMessage = obj.message;
                    node.events.emit('stateChanged');
                } else {
                    node.events.emit('message', obj);
                }
            });
        }

        node.on("close", function() {
            node.closing = true;
            if (node.server) {
                node.currentStatus = 'close';
                node.events.emit('stateChanged');
                node.server.close();
            }
            if (node.tout) {
                clearTimeout(node.tout);
            }
        });

        connect();
    }

    RED.nodes.registerType("home-assistant-config", HAssConfig, {
        credentials: {
            password: {type:"password"}
        }
    });
};
