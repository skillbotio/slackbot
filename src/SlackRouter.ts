import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import * as https from "https";
import {DataManager} from "./DataManager";
import {SlackBot} from "./SlackBot";

export class SlackRouter {
    public async router(): Promise<express.Router> {
        const dataManager = new DataManager();
        await dataManager.createSlackAuthTable();

        const slackBot = new SlackBot();

        const router = express.Router();

        router.use(bodyParser.json());
        router.use(bodyParser.urlencoded());

        const redirectURL = process.env.BASE_URL + "/slack_auth_response";

        router.post("/slack_message", (request: express.Request, response: express.Response) => {
            const slackEvent = request.body;

            console.log("SlackMessage: " + JSON.stringify(slackEvent));
            // When registering a URL, need to do challenge handling
            if (slackEvent.challenge) {
                response.send(slackEvent.challenge);
                return;
            }

            slackBot.onMessage(slackEvent);

            // We respond immediately or we start getting retries
            response.status(200);
            response.send({});
            console.log("Response sent");
            return;
        });

        router.get("/slack_auth", (request: express.Request, response: express.Response) => {
            console.log("SlackAuth: " + redirectURL);
            let url = "https://slack.com/oauth/authorize";
            url += "?client_id=" + process.env.SLACK_CLIENT_ID;
            url += "&scope=bot chat:write:bot";
            url += "&redirect_url=" + redirectURL;

            response.redirect(url);
        });

        router.get("/slack_auth_response", (request: express.Request, response: express.Response) => {
            console.log("Callback from slack");
            const code = request.query.code;

            let accessURL = "https://slack.com/api/oauth.access";
            accessURL += "?code=" + code;
            accessURL += "&client_id=" + process.env.SLACK_CLIENT_ID;
            accessURL += "&client_secret=" + process.env.SLACK_CLIENT_SECRET;
            accessURL += "&redirect_url=" + redirectURL;

            https.get(accessURL, (accessResponse: http.IncomingMessage) => {
                let data: string = "";
                accessResponse.on("data", (buffer: string) => {
                    data += buffer;
                });

                accessResponse.on("end", () => {
                    console.log("Data: {data}", data);
                    const json = JSON.parse(data);
                    dataManager.saveSlackAuth(process.env.SLACK_CLIENT_TOKEN as string, json).then(() => {
                        console.log("Saved Auth Data. Success");
                        response.redirect("/success.html");
                    }).catch((error: Error) => {
                        response.redirect("/error.html");
                    });
                });
            });
        });

        return router;
    }

}
