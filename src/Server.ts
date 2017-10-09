import * as bodyParser from "body-parser";
import * as express from "express";
import {SlackRouter} from "./SlackRouter";

require("dotenv").config();

export class Server {
    public async start(): Promise<void> {
        const serverPort = parseInt(process.env.SERVER_PORT ? process.env.SERVER_PORT as string : "3002", 10);
        const app = express();

        // We are using ejs for templating
        app.set("view engine", "ejs");

        // JSON Parser
        app.use(bodyParser.json());

        // Swagger is the only static for now
        app.use(express.static("static"));

        app.use(await new SlackRouter().router());

        app.listen(serverPort, () => {
            console.log("SilentEchoBot running on port: " + serverPort);
        });

        return Promise.resolve();
    }
}
