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
        let slackToken;
        try {
            slackToken = await this.lookupToken(slackMessage.team_id);
        } catch (e) {
            Promise.reject(e);
            return;
        }

        const userToken = await this.lookupUser(slackMessage.team_id, slackEvent.user);
        const message = slackEvent.text;

        // If the user is defined, reply
        if (userToken) {
            const silentEcho = new SilentEcho(userToken as string);
            try {
                const result: ISilentResult = await silentEcho.message(message);
                console.log("SentMessageToSilentEcho");
                this.postMessage(slackToken as string, slackEvent.channel, result.transcript, () => {
                    console.log("Done processing");
                });
            } catch (e) {
                console.log("Error calling SilentEchoSDK: " + e);
            }
        } else {
            if (message.length === 36 && message.split("-").length === 5) {
                await this.dataManager.saveSlackUser(slackMessage.team_id, slackEvent.user, message);
                this.reply(slackToken, slackEvent.channel, "Thank you for registering. Speak to Alexa!");
            } else {
                const reply = "Not registered with Silent Echo yet. To do so, go to: https://silentecho.bespoken.io\n" +
                    "Register, then click on https://silentecho.bespoken.io/token to get your token\n" +
                    "Copy and paste the token here:";
                this.reply(slackToken, slackEvent.channel, reply);
            }
        }
    }

    private reply(slackToken: string, channel: string, message: string) {
        try {
            this.postMessage(slackToken as string, channel, message, () => {
                console.log("Done processing");
            });
        } catch (e) {
            console.log("Error calling SilentEchoSDK: " + e);
        }
    }

    private async lookupUser(teamID: string, userID: string): Promise<string|undefined> {
        const result = await this.dataManager.fetchSlackUser(teamID, userID);
        if (result) {
            return result.avs_token;
        } else {
            return undefined;
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