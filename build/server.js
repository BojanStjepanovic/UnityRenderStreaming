"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var fs = require("fs");
var morgan = require("morgan");
var signaling_1 = require("./signaling");
var log_1 = require("./log");
exports.createServer = function (config) {
    var app = express();
    app.set('isPrivate', config.mode == "private");
    // logging http access
    if (config.logging != "none") {
        app.use(morgan(config.logging));
    }
    // const signal = require('./signaling');
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.get('/config', function (req, res) { return res.json({ useWebSocket: config.websocket, startupMode: config.mode, logging: config.logging }); });
    app.use('/signaling', signaling_1.default);
    app.use(express.static(path.join(__dirname, '../public')));
    app.get('/', function (req, res) {
        var indexPagePath = path.join(__dirname, '../public/index.html');
        fs.access(indexPagePath, function (err) {
            if (err) {
                log_1.log(log_1.LogLevel.warn, "Can't find file ' " + indexPagePath);
                res.status(404).send("Can't find file " + indexPagePath);
            }
            else {
                res.sendFile(indexPagePath);
            }
        });
    });
    return app;
};
