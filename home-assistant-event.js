module.exports = function(RED) {
    var ws = require("ws");

    function HAssEvent(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hass = RED.nodes.getNode(config.hass);
        node.host = this.hass.host;
        node.port = this.hass.port;
        node.ssl = this.hass.ssl;
        node.event = config.event;
        node.filterKey = config.filterKey;
        node.filterValue = config.filterValue;

        var subId = 1;

        var updateStatus = function () {
            if (node.hass.currentStatus == 'error') {
                node.status({fill: "red", shape: "ring", text: "error"});
            } else if (node.hass.currentStatus == 'open') {
                node.status({fill: "green", shape: "dot", text: "connected"});
            } else if (node.hass.currentStatus == 'auth_ok') {
                subId = node.hass.msgId;
                node.hass.sendToSocket({"id": node.hass.msgId++, "type": "subscribe_events", "event_type": node.event});
                node.status({fill: "green", shape: "dot", text: "connected"});
            } else if (node.hass.currentStatus == 'auth_invalid') {
                node.status({fill: "yellow", shape: "ring", text: node.hass.stateMessage});
            } else if (node.hass.currentStatus == 'close') {
                node.status({fill: "red", shape: "ring", text: "disconnected"});
            }
        };

        var onMessage = function (obj) {
            if (obj.type=="event" && obj.id==subId && obj.event.data) {
                if (node.filterKey && node.filterValue) {
                    if (obj.event.data[node.filterKey] && (new RegExp("^" + node.filterValue.split("*").join(".*") + "$")).test(obj.event.data[node.filterKey])) {
                        node.send({"payload": obj.event.data});
                    }
                } else {
                    node.send({"payload": obj.event.data});
                }
            }
        };

        node.hass.events.on('stateChanged', updateStatus);
        node.hass.events.on('message', onMessage);

        node.on("close", function() {
            node.hass.sendToSocket({"id": node.hass.msgId++, "type": "unsubscribe_events", "subscription": subId});
            node.hass.events.removeListener('stateChanged', updateStatus);
            node.hass.events.removeListener('message', onMessage);
        });

        updateStatus();
    }

    RED.nodes.registerType("event", HAssEvent);
};
