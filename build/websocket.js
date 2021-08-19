"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var websocket = require("ws");
var offer_1 = require("./class/offer");
var answer_1 = require("./class/answer");
var candidate_1 = require("./class/candidate");
// [{sessonId:[connectionId,...]}]
var clients = new Map();
// [{connectionId:[sessionId1, sessionId2]}]
var connectionPair = new Map();
function getOrCreateConnectionIds(settion) {
    var connectionIds = null;
    if (!clients.has(settion)) {
        connectionIds = new Set();
        clients.set(settion, connectionIds);
    }
    connectionIds = clients.get(settion);
    return connectionIds;
}
var WSSignaling = /** @class */ (function () {
    function WSSignaling(server, mode) {
        var _this = this;
        this.server = server;
        this.wss = new websocket.Server({ server: server });
        this.isPrivate = mode == "private";
        this.wss.on('connection', function (ws) {
            clients.set(ws, new Set());
            ws.onclose = function (_event) {
                var connectionIds = clients.get(ws);
                connectionIds.forEach(function (connectionId) {
                    var pair = connectionPair.get(connectionId);
                    if (pair) {
                        var otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
                        if (otherSessionWs) {
                            otherSessionWs.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
                        }
                    }
                    connectionPair.delete(connectionId);
                });
                clients.delete(ws);
            };
            ws.onmessage = function (event) {
                // type: connect, disconnect JSON Schema
                // connectionId: connect or disconnect connectionId
                // type: offer, answer, candidate JSON Schema
                // from: from connection id
                // to: to connection id
                // data: any message data structure
                var msg = JSON.parse(event.data);
                if (!msg || !_this) {
                    return;
                }
                console.log(msg);
                switch (msg.type) {
                    case "connect":
                        _this.onConnect(ws, msg.connectionId);
                        break;
                    case "disconnect":
                        _this.onDisconnect(ws, msg.connectionId);
                        break;
                    case "offer":
                        _this.onOffer(ws, msg.data);
                        break;
                    case "answer":
                        _this.onAnswer(ws, msg.data);
                        break;
                    case "candidate":
                        _this.onCandidate(ws, msg.data);
                        break;
                    default:
                        break;
                }
            };
        });
    }
    WSSignaling.prototype.onConnect = function (ws, connectionId) {
        var polite = true;
        if (this.isPrivate) {
            if (connectionPair.has(connectionId)) {
                var pair = connectionPair.get(connectionId);
                if (pair[0] != null && pair[1] != null) {
                    ws.send(JSON.stringify({ type: "error", message: connectionId + ": This connection id is already used." }));
                    return;
                }
                else if (pair[0] != null) {
                    connectionPair.set(connectionId, [pair[0], ws]);
                }
            }
            else {
                connectionPair.set(connectionId, [ws, null]);
                polite = false;
            }
        }
        var connectionIds = getOrCreateConnectionIds(ws);
        connectionIds.add(connectionId);
        ws.send(JSON.stringify({ type: "connect", connectionId: connectionId, polite: polite }));
    };
    WSSignaling.prototype.onDisconnect = function (ws, connectionId) {
        var connectionIds = clients.get(ws);
        connectionIds.delete(connectionId);
        if (connectionPair.has(connectionId)) {
            var pair = connectionPair.get(connectionId);
            var otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
            if (otherSessionWs) {
                otherSessionWs.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
            }
        }
        connectionPair.delete(connectionId);
        ws.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
    };
    WSSignaling.prototype.onOffer = function (ws, message) {
        var connectionId = message.connectionId;
        var newOffer = new offer_1.default(message.sdp, Date.now(), false);
        if (this.isPrivate) {
            if (connectionPair.has(connectionId)) {
                var pair = connectionPair.get(connectionId);
                var otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
                if (otherSessionWs) {
                    newOffer.polite = true;
                    otherSessionWs.send(JSON.stringify({ from: connectionId, to: "", type: "offer", data: newOffer }));
                }
            }
            return;
        }
        connectionPair.set(connectionId, [ws, null]);
        clients.forEach(function (_v, k) {
            if (k == ws) {
                return;
            }
            k.send(JSON.stringify({ from: connectionId, to: "", type: "offer", data: newOffer }));
        });
    };
    WSSignaling.prototype.onAnswer = function (ws, message) {
        var connectionId = message.connectionId;
        var connectionIds = getOrCreateConnectionIds(ws);
        connectionIds.add(connectionId);
        var newAnswer = new answer_1.default(message.sdp, Date.now());
        if (!connectionPair.has(connectionId)) {
            return;
        }
        var pair = connectionPair.get(connectionId);
        var otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
        if (!this.isPrivate) {
            connectionPair.set(connectionId, [otherSessionWs, ws]);
        }
        otherSessionWs.send(JSON.stringify({ from: connectionId, to: "", type: "answer", data: newAnswer }));
    };
    WSSignaling.prototype.onCandidate = function (ws, message) {
        var connectionId = message.connectionId;
        var candidate = new candidate_1.default(message.candidate, message.sdpMLineIndex, message.sdpMid, Date.now());
        if (this.isPrivate) {
            if (connectionPair.has(connectionId)) {
                var pair = connectionPair.get(connectionId);
                var otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
                if (otherSessionWs) {
                    otherSessionWs.send(JSON.stringify({ from: connectionId, to: "", type: "candidate", data: candidate }));
                }
            }
            return;
        }
        clients.forEach(function (_v, k) {
            if (k === ws) {
                return;
            }
            k.send(JSON.stringify({ from: connectionId, to: "", type: "candidate", data: candidate }));
        });
    };
    return WSSignaling;
}());
exports.default = WSSignaling;
