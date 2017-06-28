import {ISilentResult, SilentEcho} from "silent-echo-sdk";
import {DataManager} from "./DataManager";

export class SlackBot {
    private dataManager: DataManager;
    private messageSet: Set<string>;
    private processingSet: Set<string>;

    public constructor() {
        this.dataManager = new DataManager();
        this.messageSet = new Set<string>();
        this.processingSet = new Set<string>();
    }

    public async onMessage(slackMessage: any): Promise<void> {
        if (slackMessage.event_id in this.messageSet) {
            console.log("Already Processed");
            return;
        }

        this.messageSet.add(slackMessage.event_id);
        if (slackMessage.event && slackMessage.event.type === "message") {
            const slackEvent = slackMessage.event;
            // If this is a direct message
            if (slackEvent.channel.startsWith("D") && slackEvent.user) {
                this.handleDirectMessage(slackMessage);
            } else {
                const message = slackEvent.text;
                if (message.toLowerCase().indexOf("silentecho") !== -1) {
                    this.handleChannelMessage(slackMessage);
                }
            }
        }
    }

    private async handleDirectMessage(slackMessage: any): Promise<void> {
        const slackToken = await this.lookupSlackToken(slackMessage);
        const userToken = await this.lookupUser(slackMessage.team_id, slackMessage.event.user);
        if (userToken) {
            this.handleMessage(slackMessage, slackToken, userToken);
        } else {
            const message = slackMessage.event.text;
            if (message.length === 36 && message.split("-").length === 5) {
                await this.dataManager.saveSlackUser(slackMessage.team_id, slackMessage.event.user, message);
                this.reply(slackToken, slackMessage.event.channel, "Thank you for registering. Speak to Alexa!");
            } else {
                const reply = "You have not registered with Silent Echo yet. " +
                    "To register, just <https://silentecho.bespoken.io/link_account?token=true|click here>\n" +
                    "Follow the steps, then *copy and paste the token into this chat*.\n" +
                    "Questions? Here is our <https://silentecho.bespoken.io/faq|FAQ>";
                this.reply(slackToken, slackMessage.event.channel, reply);
            }
        }
    }

    private async handleChannelMessage(slackMessage: any): Promise<void> {
        const slackToken = await this.lookupSlackToken(slackMessage);
        const userToken = process.env.GENERIC_USER_TOKEN;
        this.handleMessage(slackMessage, slackToken, userToken as string);
    }

    private async handleMessage(slackMessage: any, slackToken: string, userToken: string): Promise<void> {
        const message = slackMessage.event.text;

        const silentEcho = new SilentEcho(userToken as string);
        try {
            const result: ISilentResult = await silentEcho.message(message);

            let reply = "";
            if (result.transcript) {
                reply = "<" + result.transcript_audio_url + "|:speaker:>" + result.transcript;
            } else if (result.stream_url) {
                reply = "<" + result.stream_url + "|:speaker:>" + result.stream_url;
            } else {
                reply = ":mute: _No reply_";
            }

            this.reply(slackToken, slackMessage.event.channel, reply);
        } catch (e) {
            console.log("Error calling SilentEchoSDK: " + e);
        }
    }

    private async lookupSlackToken(slackMessage: any): Promise<string> {
        const auth = await this.dataManager.fetchSlackAuth(slackMessage.team_id);
        console.log("Looked up token: " + slackMessage.team_id + " Token: " + auth.bot.bot_access_token);
        return auth.bot.bot_access_token;
    }

    private reply(slackToken: string, channel: string, message: string) {
        try {
            this.postMessage(slackToken as string, channel, message);
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

    private postMessage(authToken: string, channel: string, message: string, callback?: () => void): void {
        const WebClient = require("@slack/client").WebClient;

        const web = new WebClient(authToken);
        web.chat.postMessage(channel, message, function(error: string, response: any) {
            if (error) {
                console.log("Error:", error);
            } else {
                console.log("Message sent: ", response);
            }

            if (callback) {
                callback();
            }
        });
    }
}
