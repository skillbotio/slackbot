import {SkillBotClient} from "skill-bot-client";
import {DataManager} from "./DataManager";
import {MessageType, SlackBotMessage} from "./SlackBotMessage";

export class SlackBot {
    private dataManager: DataManager;
    private messageSet: Set<string>;
    private clientToken: string; // Unique token for this particular slack app

    public constructor() {
        this.dataManager = new DataManager();
        this.messageSet = new Set<string>();
        this.clientToken = process.env.SLACK_CLIENT_TOKEN; // We get this from the api.slack.com basic info page
    }

    public async onMessage(slackMessage: any): Promise<SlackBotReply> {
        if (this.messageSet.has(slackMessage.event_id)) {
            return Promise.resolve(SlackBotReply.Error("Already processed: " + slackMessage.event_id));
        }

        this.messageSet.add(slackMessage.event_id);
        return this.handleMessage(SlackBotMessage.fromMessage(slackMessage));
    }

    protected async lookupBot(token: string, teamID: string): Promise<IBot> {
        const auth = await this.dataManager.fetchSlackAuth(token, teamID);
        console.log("Looked up token: " + teamID
            + " Token: " + auth.bot.bot_access_token
            + " UserID: " + auth.bot.bot_user_id);
        return auth.bot;
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

        const bot = await this.lookupBot(this.clientToken, message.teamID);
        console.log("TeamID: " + message.teamID + " UserID: " + message.userID);
        const userToken = message.userKey();

        // If we already have registered this user, we process the message
        if (userToken) {
            return this.processMessage(message, bot, userToken);
        } else {
            // If the message is 36 characters long, with 5 "-"s, then we assume it is a UUID for the user
            if (message.text.length === 36 && message.text.split("-").length === 5) {
                return this.postMessage(bot.bot_access_token,
                    message.channelID,
                    "Thank you for registering. Speak to Alexa!");
            } else {
                // Otherwise, we ask them to register
                const registerURL = "https://silentecho.bespoken.io/link_account?token=true"
                    + "&slack=" + (message.teamID + message.userID);
                const reply = "You have not registered with Silent Echo yet. " +
                    "To register, <" + registerURL + "|just click here!>\n" +
                    "Follow the steps, then come back.\n" +
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

        const bot = await this.lookupBot(slackMessage.appID, slackMessage.teamID);
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
        const skillBot = new SkillBotClient(process.env.SKILLBOT_URL);

        try {
            const result = await skillBot.message("SLACK", message.userID, message.textClean());
            console.log("Result: " + JSON.stringify(result, null, 2));
            const options: any = {
                attachments: [] as any[],
            };

            if (result.text) {
                options.text = result.text;
            }

            if (result.streamURL) {
                const text = "<" + result.streamURL + "|Link To Audio>";
                options.attachments.push({
                    author_name: ":speaker: Audio Stream",
                    color: "#D0D3D4",
                    text,
                });
            }

            if (result.card) {
                let title;

                // We see cases where either mainTitle or subTitle is null, as well as both are
                if (result.card.title) {
                    title = result.card.title;
                }

                if (result.card.subTitle) {
                    if (title) {
                        title += "\n" + result.card.subTitle;
                    } else {
                        title = result.card.subTitle;
                    }
                }

                const card: any = {
                    color: "#ccf2ff",
                    text: result.card.content,
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
            if (!result.text && !result.streamURL) {
                replyMessage = "No reply from SkillBot";
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
