
export enum MessageType {
    COMMAND,
    MESSAGE,
}

export class SlackBotMessage {
    public static fromMessage(json: any): SlackBotMessage {
        const message = new SlackBotMessage();
        message.type = MessageType.MESSAGE;
        message.rawPayload = json;
        message.valid = message.parseMessage();
        return message;
    }

    private static cleanText(text: string): string {
        let newText = text;
        const openBracketIndex = text.indexOf("<");
        if (openBracketIndex !== -1) {
            const closeBracketIndex = text.indexOf(">", openBracketIndex);

            if (closeBracketIndex !== -1) {
                newText = text.substring(0, openBracketIndex);
                newText += text.substring(closeBracketIndex + 1, text.length);
            } else {
                return newText;
            }

        } else {
            return newText.trim();
        }

        return SlackBotMessage.cleanText(newText);
    }

    public appID: string;
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

    public userKey(): string {
        return this.appID + this.teamID + this.userID;
    }

    public textClean(): string {
        return SlackBotMessage.cleanText(this.text);
    }

    private parseMessage(): boolean {
        if (this.rawPayload.event.type !== "message") {
            return false;
        }

        this.appID = this.rawPayload.api_app_id;
        this.channelID = this.rawPayload.event.channel;
        this.teamID = this.rawPayload.team_id;
        this.text = this.rawPayload.event.text;
        this.userID = this.rawPayload.event.user;
        return true;
    }
}
