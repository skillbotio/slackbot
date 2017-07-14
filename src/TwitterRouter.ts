import * as bodyParser from "body-parser";
import * as express from "express";
import {TwitterBot} from "./TwitterBot";

export class TwitterRouter {
    public router(): express.Router {
        const router = express.Router();

        router.use(bodyParser.json());
        router.use(bodyParser.urlencoded());

        const bot = new TwitterBot();
        bot.start();
        // const redirectURL = process.env.BASE_URL + "/slack_auth_response";

        router.post("/twitter_auth", (request: express.Request, response: express.Response) => {
            const slackEvent = request.body;

            console.log("SlackMessage: " + JSON.stringify(slackEvent));

            // We respond immediately or we start getting retries
            response.status(200);
            response.send({});
            console.log("Response sent");
            return;
        });

        return router;
    }

}
