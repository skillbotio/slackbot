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

    public async onCommand(slackMessage: any): Promise<SlackBotReply> {
        const command = SlackBotMessage.fromCommand(slackMessage);
        return this.handleMessage(command);
    }

    public async onMessage(slackMessage: any): Promise<SlackBotReply> {
        if (this.messageSet.has(slackMessage.event_id)) {
            return Promise.resolve(SlackBotReply.Error("Already processed: " + slackMessage.event_id));
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

    protected async lookupUser(teamID: string, userID: string): Promise<string | void> {
        const result = await this.dataManager.fetchSlackUser(teamID, userID);
        if (result) {
            return result.avs_token;
        } else {
            return undefined;
        }
    }

    protected async saveUser(teamID: string, userID: string, token: string): Promise<void> {
        return await this.dataManager.saveSlackUser(teamID, userID, token);
    }

    protected newSilentEcho(token: string): SilentEcho {
        return new SilentEcho(token);
    }

    protected postMessage(authToken: string,
                          channel: string,
                          message?: string,
                          options?: any): Promise<SlackBotReply> {
        return new Promise((resolve) => {
            const WebClient = require("@slack/client").WebClient;
            const web = new WebClient(authToken);
            web.chat.postMessage(channel, message, options, function(error: string, response: any) {
                if (error) {
                    resolve(SlackBotReply.Error(error));
                } else {
                    resolve(SlackBotReply.Message(message, options, response));
                }
            });
        });
    }

    private async handleMessage(message: SlackBotMessage): Promise<SlackBotReply> {
        console.log("Message: " + message.text);
        if (message.isValid()) {
            if (message.isDirect()) {
                return this.handleDirectMessage(message);
            } else {
                return this.handleChannelMessage(message);
            }
        } else {
            return Promise.resolve(SlackBotReply.Error("Invalid message received: " + message.rawPayload));
        }

    }

    private async handleDirectMessage(message: SlackBotMessage): Promise<SlackBotReply> {
        // We ignore messages that we send ourselves (which have a bot_id in direct messages)
        if (message.type === MessageType.MESSAGE && message.rawPayload.event.bot_id) {
            const error = SlackBotReply.Error("Ignoring messages from the bot: " + message.rawPayload.event.bot_id);
            return Promise.resolve(error);
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
                await this.saveUser(message.teamID, message.userID, message.text);
                return this.postMessage(bot.bot_access_token,
                    message.channelID,
                    "Thank you for registering. Speak to Alexa!");
            } else {
                // Otherwise, we ask them to register
                const registerURL = "https://silentecho.bespoken.io/link_account?token=true"
                    + "&slack=" + (message.teamID + message.userID);
                const reply = "You have not registered with Silent Echo yet. " +
                    "To register, just <" + registerURL + "|click here>\n" +
                    "Follow the steps, then come back here!\n" +
                    "Questions? Here is our <https://silentecho.bespoken.io/faq|FAQ>";
                return this.postMessage(bot.bot_access_token, message.channelID, reply);
            }
        }
    }

    private async handleChannelMessage(slackMessage: SlackBotMessage): Promise<SlackBotReply> {
        // If we have the username field on a message, means that we sent it, so ignore
        if (slackMessage.type === MessageType.MESSAGE && slackMessage.rawPayload.event.username) {
            const e = SlackBotReply.Error("Ignore messages from the bot: " + slackMessage.rawPayload.event.username);
            return Promise.resolve(e);
        }

        const bot = await this.lookupBot(slackMessage.teamID);
        console.log("ChannelMessage: " + slackMessage.textClean());

        // If the bot is called in the message, then reply
        const botEscapedName = "<@" + bot.bot_user_id + ">";
        if (slackMessage.type === MessageType.MESSAGE && slackMessage.text.indexOf(botEscapedName) === -1) {
            const error = SlackBotReply.Error("Ignore messages that do not call bot name: " + bot.bot_user_id);
            return Promise.resolve(error);
        }

        const userToken = process.env.GENERIC_USER_TOKEN;
        return this.processMessage(slackMessage, bot, userToken as string);
    }

    private async processMessage(message: SlackBotMessage, bot: IBot, userToken: string): Promise<SlackBotReply> {
        const silentEcho = this.newSilentEcho(userToken as string);
        silentEcho.baseURL = process.env.SILENT_ECHO_URL || "https://silentecho.bespoken.io";
        silentEcho.baseURL += "/process";
        console.log("URL: " + silentEcho.baseURL);

        try {
            const result: ISilentResult = await silentEcho.message(message.textClean());
            console.log("Result: " + JSON.stringify(result));
            const audioURL = result.stream_url || result.transcript_audio_url;
            const options = {
                attachments: [] as any[],
            };

            if (result.transcript) {
                const text = result.transcript + "\n<" + audioURL + "|Link To Audio>";
                options.attachments.push({
                    author_name: ":pencil: Transcript",
                    color: "#F7DC6F",
                    text,
                });
            }

            if (result.stream_url) {
                const text = "<" + audioURL + "|Link To Audio>";
                options.attachments.push({
                    author_name: ":speaker: Audio Stream",
                    color: "#D0D3D4",
                    text,
                });
            }

            if (result.card) {
                let title;

                // We see cases where either mainTitle or subTitle is null, as well as both are
                if (result.card.mainTitle) {
                    title = result.card.mainTitle;
                }

                if (result.card.subTitle) {
                    if (title) {
                        title += "\n" + result.card.subTitle;
                    } else {
                        title = result.card.subTitle;
                    }
                }

                const card: any = {
                    author_name: ":card_index: Card",
                    color: "#ccf2ff",
                    text: result.card.textField,
                };

                if (title) {
                    card.title = title;
                }

                if (result.card.imageURL) {
                    card.image_url = result.card.imageURL;
                }

                options.attachments.push(card);
            }

            let replyMessage: any;
            if (!result.transcript && !result.stream_url) {
                replyMessage = "No reply from SilentEcho";
            }

            return this.postMessage(bot.bot_access_token, message.channelID, replyMessage, options);
        } catch (e) {
            console.log("Error calling SilentEchoSDK: " + e);
            return Promise.resolve(SlackBotReply.Error(e.toString()));
        }
    }
}

export interface IBot {
    bot_access_token: string;
    bot_user_id: string;
}

export class SlackBotReply {
    public static Error(error: string): SlackBotReply {
        const reply = new SlackBotReply();
        reply.error = error;
        return reply;
    }

    public static Message(message?: string, options?: string, response?: any): SlackBotReply {
        const reply = new SlackBotReply();
        reply.slackMessage = message;
        reply.slackOptions = options;
        reply.slackResponse = response;
        return reply;
    }

    public error?: string;
    public slackMessage?: string;
    public slackOptions?: any;
    public slackResponse?: any;
}
