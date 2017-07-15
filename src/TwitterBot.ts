import {ISilentResult, SilentEcho} from "silent-echo-sdk";
import * as Twit from "twit";
import {BotUtil} from "./BotUtil";
import {TweetManager} from "./TweetManager";
import {TwitterPost} from "./TwitterPost";

export class TwitterBot {
    public static cleanMessage(message: string): string {
        const atIndex = message.indexOf("@");
        let newMessage = message;
        if (atIndex !== -1) {
            let endName = message.indexOf(" ", atIndex);
            if (endName === -1) {
                endName = message.length;
            }
            newMessage = message.substring(0, atIndex);
            newMessage += message.substring(endName + 1);

            return TwitterBot.cleanMessage(newMessage);
        }
        return newMessage.trim();
    }

    public twit: Twit;

    public constructor() {
        this.twit = new Twit({
            access_token: process.env.ACCESS_TOKEN as string,
            access_token_secret: process.env.ACCESS_TOKEN_SECRET as string,
            consumer_key: process.env.CONSUMER_KEY as string,
            consumer_secret: process.env.CONSUMER_SECRET as string,
            timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
        });
    }
    public start() {
        // Get data for user
        // const url = "https://userstream.twitter.com/1.1/user.json";
        const stream = this.newStream();
        const self = this;
        stream.on("tweet", (tweet: any) => {
            console.log("Tweet: " + JSON.stringify(tweet));
            if (tweet.text.indexOf("@silentechobot") !== -1) {
                self.handleTweet(tweet);
            }
        });
    }

    public async handleTweet(tweet: any): Promise<any> {
        const silentEcho = new SilentEcho(process.env.GENERIC_USER_TOKEN as string);
        silentEcho.baseURL = process.env.SILENT_ECHO_URL || "https://silentecho.bespoken.io";
        silentEcho.baseURL += "/process";
        console.log("URL: " + silentEcho.baseURL);

        const cleanedMessage = TwitterBot.cleanMessage(tweet.text);
        try {
            const result: ISilentResult = await silentEcho.message(cleanedMessage);
            console.log("Got a reply: " + result.transcript);

            const post = new TwitterPost(tweet, result);
            TweetManager.Instance.add(post);
            const username = tweet.user.screen_name;
            const replyMessage = "Reply from Alexa: " + post.toURL() + " @" + username + " ";

            const self = this;
            return new Promise((resolve, reject) => {
                const params = { status: replyMessage };
                self.twit.post("statuses/update", params, function(statusError: any, statusData: any) {
                    if (statusError) {
                        reject(statusError);
                    } else {
                        resolve(statusData);
                    }
                });
            });
        } catch (e) {
            console.log("Error: " + e);
            throw e;
        }
    }

    public async postStatusWithImageURL(message: string, mediaURL: string): Promise<any> {
        const base64 = await BotUtil.urlToBase64(mediaURL);
        return this.postStatusWithImageBase64(message, base64);
    }

    public postStatusWithImageBase64(message: string, mediaDataEncoded: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const self = this;
            this.twit.post("media/upload", {
                media_data: mediaDataEncoded,
            }, function(err, data: any, response) {
                // now we can assign alt text to the media, for use by screen readers and
                // other text-based presentations and interpreters
                const mediaIdStr = data.media_id_string;
                const altText = "Small flowers in a planter on a sunny balcony, blossoming.";
                const metaParams = {
                    alt_text: {
                        text: altText,
                    },
                    media_id: mediaIdStr,
                };

                self.twit.post("media/metadata/create", metaParams, function() {
                    console.log("posted metadata");
                    const params = { status: message, media_ids: [mediaIdStr] };

                    self.twit.post("statuses/update", params, function(statusError: any, statusData: any) {
                        resolve(statusData);
                    });
                });
            });
        });
    }

    protected newStream() {
        return this.twit.stream("user", { with: "user" } as any);
    }
}
