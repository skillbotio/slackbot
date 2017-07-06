import * as querystring from "querystring";

export enum MessageType {
    COMMAND,
    MESSAGE,
}

export class SlackBotMessage {
    public static fromCommand(command: string): SlackBotMessage {
        const message = new SlackBotMessage();
        message.type = MessageType.COMMAND;
        message.rawPayload = command;
        message.valid = message.parseCommand();
        return message;
    }

    public static fromMessage(json: any): SlackBotMessage {
        const message = new SlackBotMessage();
        message.type = MessageType.MESSAGE;
        message.rawPayload = json;
        message.valid = message.parseMessage();
        return message;
    }

    private static cleanText(text: string): string {
        let newText = text;
        if (text.indexOf("<@") !== -1) {
            newText = text.substring(0, text.indexOf("<@"));
            newText += text.substring(text.indexOf(">") + 1, text.length);
        } else {
            return newText.trim();
        }
        console.log("NewText: " + newText);
        return SlackBotMessage.cleanText(newText);
    }

    public channelID: string;
    public rawPayload: any;
    public teamID: string;
    public text: string;
    public type: MessageType;
    public userID: string;
    private valid: boolean;

    public isDirect(): boolean {
        return this.channelID.startsWith("D");
    }

    public isValid(): boolean {
        return this.valid;
    }

    public textClean(): string {
        return SlackBotMessage.cleanText(this.text);
    }

    private parseCommand(): boolean {
        const qs = querystring.parse(this.rawPayload);
        this.channelID = qs.channel_id;
        this.teamID = qs.team_id;
        this.text = qs.text;
        this.userID = qs.user_id;
        return true;
    }

    private parseMessage(): boolean {
        if (this.rawPayload.event.type !== "message") {
            return false;
        }

        this.channelID = this.rawPayload.event.channel;
        this.teamID = this.rawPayload.team_id;
        this.text = this.rawPayload.event.text;
        this.userID = this.rawPayload.event.user;
        return true;
    }
}
