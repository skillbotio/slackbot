import {ISilentResult, SilentEcho} from "silent-echo-sdk";
import {DataManager} from "./DataManager";
import {MessageType, SlackBotMessage} from "./SlackBotMessage";

export class SlackBot {
    private dataManager: DataManager;
    private messageSet: Set<string>;

    public constructor() {
        this.dataManager = new DataManager();
        this.messageSet = new Set<string>();
    }

    public async onCommand(slackMessage: any): Promise<void> {
        const command = SlackBotMessage.fromCommand(slackMessage);
        return this.handleMessage(command);
    }

    public async onMessage(slackMessage: any): Promise<void> {
        if (this.messageSet.has(slackMessage.event_id)) {
            console.log("Already Processed");
            return;
        }

        this.messageSet.add(slackMessage.event_id);
        return this.handleMessage(SlackBotMessage.fromMessage(slackMessage));
    }

    protected async lookupBot(teamID: string): Promise<IBot> {
        const auth = await this.dataManager.fetchSlackAuth(teamID);
        console.log("Looked up token: " + teamID
            + " Token: " + auth.bot.bot_access_token
            + " UserID: " + auth.bot.bot_user_id);
        return auth.bot;
    }

    protected async lookupUser(teamID: string, userID: string): Promise<string|undefined> {
        const result = await this.dataManager.fetchSlackUser(teamID, userID);
        if (result) {
            return result.avs_token;
        } else {
            return undefined;
        }
    }

    protected newSilentEcho(token: string): SilentEcho {
        return new SilentEcho(token);
    }

    protected postMessage(authToken: string, channel: string, message: string, callback?: () => void): void {
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

    private async handleMessage(message: SlackBotMessage): Promise<void> {
        console.log("Message: " + message.text);
        if (message.isValid()) {
            if (message.isDirect()) {
                return this.handleDirectMessage(message);
            } else {
                return this.handleChannelMessage(message);
            }
        } else {
            console.error("Invalid message received: " + message.rawPayload);
            return Promise.resolve();
        }

    }

    private async handleDirectMessage(message: SlackBotMessage): Promise<void> {
        // We ignore messages that we send ourselves (which have a bot_id
        if (message.type === MessageType.MESSAGE && message.rawPayload.event.bot_id) {
            console.log("Skipping messages not sent to silentechobot");
            return Promise.resolve();
        }

        const bot = await this.lookupBot(message.teamID);
        console.log("TeamID: " + message.teamID + " UserID: " + message.userID);
        const userToken = await this.lookupUser(message.teamID, message.userID);

        // If we already have registered this user, we process the message
        if (userToken) {
            return this.processMessage(message, bot, userToken);
        } else {
            // If the message is 36 characters long, with 5 "-"s, then we assume it is a UUID for the user
            if (message.text.length === 36 && message.text.split("-").length === 5) {
                await this.dataManager.saveSlackUser(message.teamID, message.userID, message.text);
                return this.reply(bot, message.channelID, "Thank you for registering. Speak to Alexa!");
            } else {
                // Otherwise, we ask them to register
                const reply = "You have not registered with Silent Echo yet. " +
                    "To register, just <https://silentecho.bespoken.io/link_account?token=true|click here>\n" +
                    "Follow the steps, then *copy and paste the token into this chat*.\n" +
                    "Questions? Here is our <https://silentecho.bespoken.io/faq|FAQ>";
                return this.reply(bot, message.channelID, reply);
            }
        }
    }

    private async handleChannelMessage(slackMessage: SlackBotMessage): Promise<void> {
        // If we have the username field on a message, means that we sent it, so ignore
        if (slackMessage.type === MessageType.MESSAGE && slackMessage.rawPayload.event.username) {
            console.log("Ignore messages that SilentEcho sent");
            return Promise.resolve();
        }

        const bot = await this.lookupBot(slackMessage.teamID);
        console.log("ChannelMessage: " + slackMessage.text);

        // If the bot is called in the message, then reply
        if (slackMessage.text.indexOf(bot.bot_user_id) === -1) {
            console.log("Ignore messages that do not call my name");
            return Promise.resolve();
        }

        const userToken = process.env.GENERIC_USER_TOKEN;
        this.processMessage(slackMessage, bot, userToken as string);
    }

    private async processMessage(message: SlackBotMessage, bot: IBot, userToken: string): Promise<void> {
        const silentEcho = this.newSilentEcho(userToken as string);
        try {
            const result: ISilentResult = await silentEcho.message(message.textClean());

            let reply = "";
            if (result.transcript) {
                reply = "<" + result.transcript_audio_url + "|:speaker:>" + result.transcript;
            } else if (result.stream_url) {
                reply = "<" + result.stream_url + "|:speaker:>" + result.stream_url;
            } else {
                reply = ":mute: _No reply_";
            }

            this.reply(bot, message.channelID, reply);
        } catch (e) {
            console.log("Error calling SilentEchoSDK: " + e);
        }
    }

    private reply(bot: IBot, channel: string, message: string): void {
        try {
            this.postMessage(bot.bot_access_token as string, channel, message);
        } catch (e) {
            console.log("Error calling SilentEchoSDK: " + e);
        }
    }
}

interface IBot {
    bot_access_token: string;
    bot_user_id: string;
}
