import * as bodyParser from "body-parser";
import * as express from "express";
import * as fs from "fs";
import * as morgan from "morgan";
import * as path from "path";
import Options from "./class/options";
import { log, LogLevel } from "./log";
import signaling from "./signaling";

export const createServer = (config: Options): express.Application => {
  const app: express.Application = express();
  app.set("isPrivate", config.mode == "private");
  // logging http access
  if (config.logging != "none") {
    app.use(morgan(config.logging));
  }
  // const signal = require('./signaling');
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.get("/config", (req, res) =>
    res.json({
      useWebSocket: config.websocket,
      startupMode: config.mode,
      logging: config.logging,
    })
  );
  app.use("/signaling", signaling);
  app.use(express.static(path.join(__dirname, "../public")));
  app.get("/", (req, res) => {
    const indexPagePath: string = path.join(__dirname, "../public/index.html");
    fs.access(indexPagePath, (err) => {
      if (err) {
        log(LogLevel.warn, `Can't find file ' ${indexPagePath}`);
        res.status(404).send(`Can't find file ${indexPagePath}`);
      } else {
        res.sendFile(indexPagePath);
      }
    });
  });
  return app;
};
