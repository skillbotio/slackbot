import {ISilentResult, SilentEcho} from "silent-echo-sdk";
import * as Twit from "twit";
import {BotUtil} from "./BotUtil";

export class TwitterBot {
    public static cleanMessage(message: string): string {
        const atIndex = message.indexOf("@");
        let newMessage = message;
        if (atIndex !== -1) {
            const endName = message.indexOf(" ", atIndex);
            newMessage = message.substring(0, atIndex);
            newMessage += message.substring(endName + 1);

            return TwitterBot.cleanMessage(newMessage);
        }
        return newMessage.trim();
    }

    public twit: Twit;

    public constructor() {
        this.twit = new Twit({
            access_token: process.env.ACCESS_TOKEN,
            access_token_secret: process.env.ACCESS_TOKEN_SECRET,
            consumer_key: process.env.CONSUMER_KEY,
            consumer_secret: process.env.CONSUMER_SECRET,
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
        const silentEcho = new SilentEcho(process.env.GENERIC_USER_TOKEN);
        silentEcho.baseURL = process.env.SILENT_ECHO_URL || "https://silentecho.bespoken.io";
        silentEcho.baseURL += "/process";
        console.log("URL: " + silentEcho.baseURL);

        const cleanedMessage = TwitterBot.cleanMessage(tweet.text);
        try {
            const result: ISilentResult = await silentEcho.message(cleanedMessage);
            console.log("Got a reply: " + result.transcript);

            const username = tweet.user.screen_name;
            let replyMessage = null;
            if (result.transcript) {
                const shortTranscript = result.transcript.substring(0, 50);
                replyMessage = "@" + username + " " + shortTranscript + " " + result.transcript_audio_url;
            }

            if (replyMessage && result.card && result.card.imageURL) {
                return this.postStatusWithImageURL(replyMessage, result.card.imageURL);
            } else if (replyMessage) {
                this.twit.post("statuses/update", {status: replyMessage}, function(err, data, response) {
                    console.log(data);
                });
            }

        } catch (e) {
            console.log("Error: " + e);
        }

            // console.log("Result: " + JSON.stringify(result));
            // const audioURL = result.stream_url || result.transcript_audio_url;
            // const options = {
            //     attachments: [] as any[],
            // };
            //
            // if (result.transcript) {
            //     const text = result.transcript + "\n<" + audioURL + "|Link To Audio>";
            //     options.attachments.push({
            //         author_name: ":pencil: Transcript",
            //         color: "#F7DC6F",
            //         text,
            //     });
            // }
            //
            // if (result.stream_url) {
            //     const text = "<" + audioURL + "|Link To Audio>";
            //     options.attachments.push({
            //         author_name: ":speaker: Audio Stream",
            //         color: "#D0D3D4",
            //         text,
            //     });
            // }
            //
            // if (result.card) {
            //     let title;
            //
            //     // We see cases where either mainTitle or subTitle is null, as well as both are
            //     if (result.card.mainTitle) {
            //         title = result.card.mainTitle;
            //     }
            //
            //     if (result.card.subTitle) {
            //         if (title) {
            //             title += "\n" + result.card.subTitle;
            //         } else {
            //             title = result.card.subTitle;
            //         }
            //     }
            //
            //     const card: any = {
            //         author_name: ":card_index: Card",
            //         color: "#ccf2ff",
            //         text: result.card.textField,
            //     };
            //
            //     if (title) {
            //         card.title = title;
            //     }
            //
            //     if (result.card.imageURL) {
            //         card.image_url = result.card.imageURL;
            //     }
            //
            //     options.attachments.push(card);
            // }
            //
            // let replyMessage: any;
            // if (!result.transcript && !result.stream_url) {
            //     replyMessage = "No reply from SilentEcho";
            // }

        // }
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
