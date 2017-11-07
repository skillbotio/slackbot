import {SkillBotClient} from "skillbot-client";
import {DataManager} from "./DataManager";
import {MessageType, SlackBotMessage} from "./SlackBotMessage";

export class SlackBot {
    private static ATTACHMENT_COLOR: string = "#FF6437";
    private static hasOutputSpeech(reply: any): boolean {
        return reply.raw.response.response.outputSpeech !== undefined;
    }

    private static extractOutputSpeech(reply: any): string {
        let text = "";
        if (reply.raw.response.response.outputSpeech.ssml) {
            text = SlackBot.extractSSML(reply.raw.response.response.outputSpeech.ssml);

        } else {
            text = reply.raw.response.response.outputSpeech.text;
        }
        return text;
    }

    private static extractSSML(ssml: string): string {
        // Grab SSML blocks
        const ssmlPartEnd = ssml.indexOf("<");
        if (ssmlPartEnd === -1) {
            return ssml.substring(0).trim();
        } else if (ssmlPartEnd === 0) {
            const tagEnd = ssml.indexOf(">");
            // If there is no end to a tag, just return the whole SSML chunk and do not parse anymore
            if (tagEnd === -1) {
                return ssml;
            }
            const tag = ssml.substring(0, tagEnd + 1).trim();
            if (tag.includes("audio")) {
                const match = tag.match("src.*=\"(.*)\"");
                if (match !== null) {
                    return "<" + match[1] + "|SSML Audio>" + " " + SlackBot.extractSSML(ssml.substring(tagEnd + 1));
                } else {
                    return SlackBot.extractSSML(ssml.substring(ssmlPartEnd)).trim();
                }
            } else {
                return SlackBot.extractSSML(ssml.substring(tagEnd + 1)).trim();
            }

        } else {
            const firstPart = ssml.substring(0, ssmlPartEnd).trim();
            let reply = "";
            if (firstPart.length > 0) {
                reply = firstPart + " " ;
            }
            return reply + SlackBot.extractSSML(ssml.substring(ssmlPartEnd)).trim();
        }
    }

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
            // Ignore message that come from our app
            if (message.userID === message.authedUser) {
                console.log("Ignoring message from App User");
                return Promise.resolve(SlackBotReply.Error("Ignoring message from App User"));
            }

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
        return this.processMessage(message, bot);
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

        return this.processMessage(slackMessage, bot);
    }

    private async processMessage(message: SlackBotMessage, bot: IBot): Promise<SlackBotReply> {
        const skillBot = new SkillBotClient(process.env.SKILLBOT_URL);

        try {
            const result = await skillBot.message("SLACK", message.channelID, message.userID, message.textClean());
            console.log("Result: " + JSON.stringify(result, null, 2));
            const options: any = {
                attachments: [] as any[],
            };

            const hasOutputSpeech = SlackBot.hasOutputSpeech(result);
            if (hasOutputSpeech) {
                const text = SlackBot.extractOutputSpeech(result);
                this.addAttachment(options.attachments, result, {
                    color: SlackBot.ATTACHMENT_COLOR,
                    footer: "Speech",
                    text,
                });
            }

            if (result.streamURL) {
                const text = "<" + result.streamURL + "|Link To Audio>";
                this.addAttachment(options.attachments, result,  {
                    author_name: ":speaker: Audio Stream",
                    color: SlackBot.ATTACHMENT_COLOR,
                    footer: "Audio",
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
                    color: SlackBot.ATTACHMENT_COLOR,
                    footer: "Card",
                    text: result.card.content,
                };

                if (title) {
                    card.title = title;
                }

                if (result.card.imageURL) {
                    card.image_url = result.card.imageURL;
                }

                this.addAttachment(options.attachments, result, card);
            }

            let replyMessage: any;
            if (!hasOutputSpeech && !result.streamURL) {
                replyMessage = "No reply from SkillBot";
            }

            const reply = await this.postMessage(bot.bot_access_token, message.channelID, replyMessage, options);
            await this.postDebugInfo(message, bot.bot_access_token, result);
            return Promise.resolve(reply);
        } catch (e) {
            console.log("Error calling Skillbot API: " + e);
            return Promise.resolve(SlackBotReply.Error(e.toString()));
        }
    }

    private async postDebugInfo(message: SlackBotMessage, authToken: string, result: any): Promise<void> {
        const associatedSkills = result.user.attributes.skills;
        // If this skill is not owned by the user, or debugging is not enabled
        const cleanSkillID = result.skill.id.toLowerCase().split(".").join("").split("-").join("");
        if (!associatedSkills ||
            !associatedSkills.includes(cleanSkillID) ||
            !result.user.attributes.debugEnabled) {
            return;
        }

        const WebClient = require("@slack/client").WebClient;
        const webClient = new WebClient(authToken);

        // Posts the request and response to the slack channel
        await this.postFile(webClient,
            "request.json",
            "Request Payload - \"" + message.textClean() + "\"",
            message.channelID,
            result.raw.request);

        await this.postFile(webClient,
            "response.json",
            "Response Payload - \"" + message.textClean() + "\"",
            message.channelID,
            result.raw.response);

        return Promise.resolve();
    }

    private postFile(client: any, name: string, title: string, channel: string, payload: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const uploadOptions = {
                channels: channel,
                content: JSON.stringify(payload, null, 2),
                // filename: "Request.json",
                filetype: "javascript",
                title,
            };

            client.files.upload(name, uploadOptions, function(error: any) {
                if (error) {
                    reject(error);
                } else {
                    console.log("Posted Message!");
                    resolve();
                }
            });
        });
    }

    private addAttachment(attachments: any[], result: any, attachment: any) {
        // If this is the first attachment, add skill identification to it
        if (attachments.length === 0 && result.skill) {
            attachment.author_name = result.skill.name;
            if (result.skill.imageURL) {
                attachment.thumb_url = result.skill.imageURL;
            }
        }
        attachments.push(attachment);
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
