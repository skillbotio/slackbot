import * as bodyParser from "body-parser";
import * as express from "express";
import * as https from "https";
import {SlackRouter} from "./SlackRouter";

export class Server {
    public start(): void {
        // console.log("CERT:" + process.env.SSL_CERT + " CLIENT: " + process.env.SLACK_CLIENT_ID);
        const serverPort = process.env.SSL_CERT ? 443 : 3000;
        const app = express();

        // JSON Parser
        app.use(bodyParser.json());

        // Swagger is the only static for now
        app.use(express.static("static"));

        app.use(new SlackRouter().router());

        if (process.env.SSL_CERT) {
            const cert = process.env.SSL_CERT as string;
            const key = process.env.SSL_KEY as string;

            const credentials = {
                cert: cert.replace(/\\n/g, "\n"),
                key: key.replace(/\\n/g, "\n"),
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