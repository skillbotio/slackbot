import * as bodyParser from "body-parser";
import * as express from "express";
import * as https from "https";
import {SlackRouter} from "./SlackRouter";

export class Server {
    public start(): void {

        const serverPort = process.env.USE_SSL === "true" ? 443 : 3000;
        const app = express();

        // JSON Parser
        app.use(bodyParser.json());

        // Swagger is the only static for now
        app.use(express.static("static"));

        app.use(new SlackRouter().router());

        if (serverPort === 443) {
            const credentials = {
                cert: process.env.SSL_CERT.replace(/\\n/g, "\n"),
                key: process.env.SSL_KEY.replace(/\\n/g, "\n"),
            };

            const httpsServer = https.createServer(credentials, app);
            httpsServer.listen(serverPort, () => {
                console.log("SilentEchoBot running on port 443");
            });
        } else {
            app.listen(serverPort, () => {
                console.log("SilentEchoBot running on port: " + serverPort);
            });
        }
    }
}