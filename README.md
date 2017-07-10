# [Node-RED](https://nodered.org) - [Home Assistant](https://home-assistant.io/) integration through  WebSockets

This Node-RED plugin provides following nodes to communicate with an home assistant server through [Home Assistant's WebSocket API](https://home-assistant.io/developers/websocket_api/).

## Event node
Receives events from Home Assistant (Example: status changed, flic click)

## Simple Event node
A simplified event node to receive state change events from Home Assistant.

## State node
Gets the current state of an antity or multiple entities. (Example: Get status of light.kitchen, get statuses of switch.*)

## Service node
Executes a Home Assistant service. (Examples: Turn on a switch, Set Nest thermostat temperature)
