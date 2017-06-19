import {ISilentResult, SilentEcho} from "silent-echo-sdk";

export function handler(event: any, context: any) {
    console.log("Test" + JSON.stringify(event));
    if (event.challenge) {
        context.done(event.challenge);
        return;
    }

    const slackEvent = event.event;
    if (slackEvent && slackEvent.type === "message") {
        // If this is a direct message
        if (slackEvent.channel.startsWith("D") && slackEvent.user) {
            const message = slackEvent.text;
            const silentEcho = new SilentEcho("95920eac-36bf-495d-8fa7-10a83593901c");
            silentEcho.message(message).then((result: ISilentResult) => {
                console.log("SentMessageToSilentEcho");
                slackHandler.postMessage(slackEvent.channel, result.transcript, () => {
                    console.log("Done processing");
                });
            });
        }
    }

    // We return this immediately or else we get duplicate events
    context.done(true);
}

export class SlackHandler {
    public constructor(private apiToken: string) {}

    public postMessage(channel: string, message: string, callback: () => void): void {
        const WebClient = require("@slack/client").WebClient;

        const web = new WebClient(this.apiToken);
        web.chat.postMessage(channel, message, function(error: string, response: any) {
            if (error) {
                console.log("Error:", error);
            } else {
                console.log("Message sent: ", response);
            }
            callback();
        });
    }
}

const slackHandler = new SlackHandler("xoxp-153623532434-152917105952-198963177344-b46783b3e9492a57d707e422a7ed2b9a");

