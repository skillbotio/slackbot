import * as bodyParser from "body-parser";
import * as express from "express";
import {TweetManager} from "./TweetManager";
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

        router.get("/twitter_reply/:tweet_id", (request: express.Request, response: express.Response) => {
            const post = TweetManager.Instance.get(request.params.tweet_id);
            if (post) {
                response.contentType("text/html");
                // We respond immediately or we start getting retries
                response.status(200);
                response.send(post.toHTML());
            } else {
                response.status(404);
                response.send();
            }

            console.log("Response sent");
            return;
        });

        return router;
    }

}
