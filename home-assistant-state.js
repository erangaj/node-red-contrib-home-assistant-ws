module.exports = function(RED) {
    var ws = require("ws");

    function HAssState(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hass = RED.nodes.getNode(config.hass);
        node.host = this.hass.host;
        node.port = this.hass.port;
        node.ssl = this.hass.ssl;
        node.entity = config.entity;
        
        node.closing = false;
        var subId = [];
        var entities = [];
        var msgs = [];

        var updateStatus = function () {
            if (node.hass.currentStatus == 'error') {
                node.status({fill: "red", shape: "ring", text: "error"});
            } else if (node.hass.currentStatus == 'open') {
                node.status({fill: "green", shape: "dot", text: "connected"});
            } else if (node.hass.currentStatus == 'auth_ok') {
                node.status({fill: "green", shape: "dot", text: "connected"});
            } else if (node.hass.currentStatus == 'auth_invalid') {
                node.status({fill: "yellow", shape: "ring", text: node.hass.stateMessage});
            } else if (node.hass.currentStatus == 'close') {
                node.status({fill: "red", shape: "ring", text: "disconnected"});
            }
        };

        var onMessage = function (obj) {
            if (obj.type=="result" && subId.indexOf(obj.id) > -1) {
                var idx = subId.indexOf(obj.id);
                var entity_id = entities[idx];
                var msg = msgs[idx];
                if (obj.success) {
                    var result = obj.result;
                    if (entity_id) {
                        var len = result.length;
                        if (entity_id.indexOf('*') > -1) {
                            var payload = [];
                            for (var j = 0; j < len; j++) {
                                if((new RegExp("^" + entity_id.split("*").join(".*") + "$")).test(result[j].entity_id)) {
                                    payload.push(result[j]);
                                }
                            }
                            msg["payload"] = payload;
                            node.send(msg);
                        } else {
                            for (var i = 0; i < len; i++) {
                                if (result[i].entity_id == entity_id) {
                                    msg["payload"] = result[i];
                                    node.send(msg);
                                    break;
                                }
                            }
                        }
                    } else {
                        msg["payload"] = result;
                        node.send(msg);
                    }
                } else {
                    node.error(RED._("Error retrieving statuses from Home Assistant."));
                }

                subId.splice(idx, 1);
                entities.splice(idx, 1);
                msgs.splice(idx, 1);
            }
        };

        node.hass.events.on('stateChanged', updateStatus);
        node.hass.events.on('message', onMessage);

        node.on('input', function(msg) {
            if (node.hass.currentStatus != 'auth_ok') {
                RED.log.error("Not connected to Home Assistant yet. Please try again.");
                return;
            }
            var entity_id = node.entity;
            if (msg.entity_id) {
                entity_id = msg.entity_id;
            }
            subId.push(node.hass.msgId);
            entities.push(entity_id);
            msgs.push(msg);
            node.hass.sendToSocket({"id": node.hass.msgId++, "type": "get_states"});
        });

        node.on("close", function() {
            node.hass.events.removeListener('stateChanged', updateStatus);
            node.hass.events.removeListener('message', onMessage);
        });

        updateStatus();
    }

    RED.nodes.registerType("state", HAssState);
};
