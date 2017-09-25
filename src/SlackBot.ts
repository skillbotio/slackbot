import {SkillBotClient} from "skillbot-client";
import {DataManager} from "./DataManager";
import {MessageType, SlackBotMessage} from "./SlackBotMessage";

export class SlackBot {
    private dataManager: DataManager;
    private messageSet: Set<string>;
    private clientToken: string; // Unique token for this particular slack app

    public constructor() {
        this.dataManager = new DataManager();
        this.messageSet = new Set<string>();
        // We get this from the api.slack.com basic info page
        this.clientToken = process.env.SLACK_CLIENT_TOKEN as string;
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

        return this.processMessage(message, bot, userToken);
    }

    private async handleChannelMessage(slackMessage: SlackBotMessage): Promise<SlackBotReply> {
        // If we have the username field on a message, means that we sent it, so ignore
        if (slackMessage.type === MessageType.MESSAGE && slackMessage.rawPayload.event.username) {
            const e = SlackBotReply.Error("Ignore messages from the bot: " + slackMessage.rawPayload.event.username);
            return Promise.resolve(e);
        }

        const bot = await this.lookupBot(this.clientToken, slackMessage.teamID);
        console.log("ChannelMessage: " + slackMessage.textClean());

        // If the bot is called in the message, then reply
        const botEscapedName = "<@" + bot.bot_user_id + ">";
        if (slackMessage.type === MessageType.MESSAGE && slackMessage.text.indexOf(botEscapedName) === -1) {
            const error = SlackBotReply.Error("Ignore messages that do not call bot name: " + bot.bot_user_id);
            return Promise.resolve(error);
        }

        return this.processMessage(slackMessage, bot, slackMessage.userKey());
    }

    private async processMessage(message: SlackBotMessage, bot: IBot, userToken: string): Promise<SlackBotReply> {
        const skillBot = new SkillBotClient(process.env.SKILLBOT_URL);

        try {
            const result = await skillBot.message("SLACK", message.channelID, message.userID, message.textClean());
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

            // Add in skill identification/branding
            if (result.skill) {
                const skillIdentifier: any = {
                    author_name: result.skill.name,
                    color: "#ff8c56",
                    fallback: result.skill.name,
                };

                if (result.skill.imageURL) {
                    skillIdentifier.author_icon = result.skill.imageURL;
                }
                options.attachments.push(skillIdentifier);
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
