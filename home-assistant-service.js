module.exports = function(RED) {
    var ws = require("ws");

    function HAssService(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hass = RED.nodes.getNode(config.hass);
        node.host = this.hass.host;
        node.port = this.hass.port;
        node.ssl = this.hass.ssl;
        node.service = config.service;

        var updateStatus = function () {
            if (node.hass.currentStatus == 'error') {
                node.status({fill: "red", shape: "ring", text: "error"});
            } else if (node.hass.currentStatus == 'open') {
                node.status({fill: "green", shape: "dot", text: "connected"});
            } else if (node.hass.currentStatus == 'auth_ok') {
                node.status({fill: "green", shape: "dot", text: "connected"});
                node.on('input', function(msg) {
                    var service = node.service;
                    if (msg.service) {
                        service = msg.service;
                    }
                    if (service) {
                        var domainAndService = service.split('.');
                        if(domainAndService.length==2) {
                            node.hass.sendToSocket({"id": node.hass.msgId++, "type": "call_service", "domain": domainAndService[0], "service": domainAndService[1], "service_data": msg.payload});
                        } else {
                            node.error(RED._("Service '" + service + "' is invalid'. Service must be in <domain>.<service-name> format. e.g. light.turn_on ."));
                        }
                    } else {
                        node.error(RED._("Service not defined. Please set the Service on the Configuration screen or set msg.service attribute."));
                    }
                });
            } else if (node.hass.currentStatus == 'auth_invalid') {
                node.status({fill: "yellow", shape: "ring", text: node.hass.stateMessage});
            } else if (node.hass.currentStatus == 'close') {
                node.status({fill: "red", shape: "ring", text: "disconnected"});
            }
        };

        node.hass.events.on('stateChanged', updateStatus);

        node.on("close", function() {
            node.hass.events.removeListener('stateChanged', updateStatus);
        });

        updateStatus();
    }

    RED.nodes.registerType("service", HAssService);
};
/**

 payload: object
 id: 4
 type: "result"
 success: true
 result: array[132]
 en: "light.study"
 _msgid: "310910ec.19435"

 */
