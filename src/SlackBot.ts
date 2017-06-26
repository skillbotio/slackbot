import {ISilentResult, SilentEcho} from "silent-echo-sdk";
import {DataManager} from "./DataManager";

export class SlackBot {
    private dataManager: DataManager;
    private messageSet: WeakSet<any>;

    public constructor() {
        this.dataManager = new DataManager();
        this.messageSet = new WeakSet<any>();
    }

    public async onMessage(slackMessage: any): Promise<void> {
        if (slackMessage.event && slackMessage.event.type === "message") {
            const slackEvent = slackMessage.event;
            // If this is a direct message
            if (slackEvent.channel.startsWith("D") && slackEvent.user) {
                this.handleMessage(slackMessage);
            }
        }
    }

    private async handleMessage(slackMessage: any): Promise<void> {
        const slackEvent = slackMessage.event;
        if (slackMessage.event_id in this.messageSet) {
            console.log("Already Processed");
            return;
        }

        console.log("Looking up token: " + slackMessage.team_id);
        let token;
        try {
            token = await this.lookupToken(slackMessage.team_id);
        } catch (e) {
            Promise.reject(e);
            return;
        }

        console.log("Looked up token");
        const message = slackEvent.text;
        const silentEcho = new SilentEcho("8c08820c-47bb-4736-8451-4581f3bf3fd1");
        try {
            const result: ISilentResult = await silentEcho.message(message);
            console.log("SentMessageToSilentEcho");
            this.postMessage(token as string, slackEvent.channel, result.transcript, () => {
                console.log("Done processing");
            });
        } catch (e) {
            console.log("Error calling SilentEchoSDK: " + e);
        }
    }

    private async lookupToken(teamID: string): Promise<string> {
        const auth = await this.dataManager.fetchSlackAuth(teamID);
        return auth.access_token;
    }

    private postMessage(authToken: string, channel: string, message: string, callback: () => void): void {
        const WebClient = require("@slack/client").WebClient;

        const web = new WebClient(authToken);
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
