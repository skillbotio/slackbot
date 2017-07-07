import {assert} from "chai";
import {ISilentResult, SilentEcho} from "silent-echo-sdk";
import {IBot, SlackBot} from "../src/SlackBot";

export class MockSlackBot extends SlackBot {
    public constructor(private onPostMessage?: (message: string) => void) {
        super();
    }

    public newSilentEcho(token: string): SilentEcho {
        return new MockSilentEcho();
    }

    protected lookupSlackToken(teamID: string): Promise<string> {
        return Promise.resolve("TEAM_TOKEN");
    }

    protected lookupUser(teamID: string, userID: string): Promise<string|any> {
        return Promise.resolve("USER_TOKEN");
    }

    protected lookupBot(teamID: string): Promise<IBot> {
        return Promise.resolve({
            bot_access_token: "BOT_ACCESS_TOKEN",
            bot_user_id: "U1234567",
        });
    }

    protected postMessage(authToken: string, channel: string, message: string, callback?: () => void): void {
        if (this.onPostMessage) {
            this.onPostMessage(message);
        }
    }
}

export class MockSilentEcho extends SilentEcho {
    public constructor() {
        super("TEST");
    }

    public message(message: string): Promise<ISilentResult> {
        return Promise.resolve({
            stream_url: null,
            transcript: "Hello there",
            transcript_audio_url: "https://aurl.com/test",
        });
    }
}
describe("SlackBotTest", function() {
    describe("#onCommand", () => {
        it("Should handle a direct command", function(done) {
            const slackBot = new MockSlackBot((message: string) => {
                console.log("Output: " + message);
                assert.isTrue(message.indexOf("Hello there") !== -1);
                done();
            });

            const command = "token=QEJufRDfZkbK2MvyfgB5Ofud" +
                "&team_id=T4HJBFNCS" +
                "&team_domain=bespoken-team" +
                "&channel_id=D60DMHG95" +
                "&channel_name=directmessage" +
                "&user_id=U4GSZ33U0" +
                "&user_name=jpk" +
                "&command=%2Falexa" +
                "&text=hi" +
                "&response_url=httpsblahblahblah";

            slackBot.onCommand(command);
        });
    });

    describe("#onMessage", () => {
        it("Should handle a direct message", function(done) {
            const slackBot = new MockSlackBot((message: string) => {
                console.log("Output: " + message);
                assert.isTrue(message.indexOf("Hello there") !== -1);
                done();
            });

            const messageJSON = {
                api_app_id: "A5URU3SM7",
                authed_users: [
                    "U5WCLUTGW",
                ],
                event: {
                    channel: "D5VKJCF52",
                    event_ts: "1498461089.507055",
                    text: "tell we study billionaires to play",
                    ts: "1498461089.507055",
                    type: "message",
                    user: "U4GSZ33U0",
                },
                event_id: "Ev5ZA0GZA6",
                event_time: 1498461089,
                team_id: "T4HJBFNCS",
                token: "xtuQiBe0yjEYiPHlz0t4F2lX",
                type: "event_callback",
            };

            slackBot.onMessage(messageJSON);
        });

        it("Should handle a channel message with name", function(done) {
            const slackBot = new MockSlackBot((message: string) => {
                console.log("Output: " + message);
                assert.isTrue(message.indexOf("Hello there") !== -1);
                done();
            });

            const messageJSON = {
                api_app_id: "A5URU3SM7",
                authed_users: [
                    "U5WCLUTGW",
                ],
                event: {
                    channel: "C5VKJCF52",
                    event_ts: "1498461089.507055",
                    text: "<@U1234567> tell we study billionaires to play",
                    ts: "1498461089.507055",
                    type: "message",
                    user: "U4GSZ33U0",
                },
                event_id: "Ev5ZA0GZA6",
                event_time: 1498461089,
                team_id: "T4HJBFNCS",
                token: "xtuQiBe0yjEYiPHlz0t4F2lX",
                type: "event_callback",
            };

            slackBot.onMessage(messageJSON);
        });

        it("Should ignore a channel message without name", function(done) {
            const slackBot = new MockSlackBot();

            const messageJSON = {
                api_app_id: "A5URU3SM7",
                authed_users: [
                    "U5WCLUTGW",
                ],
                event: {
                    channel: "C5VKJCF52",
                    event_ts: "1498461089.507055",
                    text: "tell we study billionaires to play",
                    ts: "1498461089.507055",
                    type: "message",
                    user: "U4GSZ33U0",
                },
                event_id: "Ev5ZA0GZA6",
                event_time: 1498461089,
                team_id: "T4HJBFNCS",
                token: "xtuQiBe0yjEYiPHlz0t4F2lX",
                type: "event_callback",
            };

            slackBot.onMessage(messageJSON).then((s: string) => {
                assert.equal(s, "Ignore messages that do not call bot name: U1234567");
                done();
            });
        });

        it("Should ignore message from a bot", function(done) {
            const slackBot = new MockSlackBot();

            const messageJSON = {
                api_app_id: "A5URU3SM7",
                authed_users: [
                    "U5WCLUTGW",
                ],
                event: {
                    channel: "C5VKJCF52",
                    event_ts: "1498461089.507055",
                    text: "tell we study billionaires to play",
                    ts: "1498461089.507055",
                    type: "message",
                    username: "SilentEchoBot",
                },
                event_id: "Ev5ZA0GZA6",
                event_time: 1498461089,
                team_id: "T4HJBFNCS",
                token: "xtuQiBe0yjEYiPHlz0t4F2lX",
                type: "event_callback",
            };

            slackBot.onMessage(messageJSON).then((s: string) => {
                assert.equal(s, "Ignore messages from the bot: SilentEchoBot");
                done();
            });
        });

        it("Should handle repeat messages", function(done) {
            let count = 0;
            let errors = 0;
            const slackBot = new MockSlackBot((message: string) => {
                count++;
            });

            const messageJSON = {
                api_app_id: "A5URU3SM7",
                authed_users: [
                    "U5WCLUTGW",
                ],
                event: {
                    channel: "D5VKJCF52",
                    event_ts: "1498461089.507055",
                    text: "tell we study billionaires to play",
                    ts: "1498461089.507055",
                    type: "message",
                    user: "U4GSZ33U0",
                },
                event_id: "Ev5ZA0GZA6",
                event_time: 1498461089,
                team_id: "T4HJBFNCS",
                token: "xtuQiBe0yjEYiPHlz0t4F2lX",
                type: "event_callback",
            };

            slackBot.onMessage(messageJSON);

            slackBot.onMessage(messageJSON).then((s: string) => {
                assert.equal(s, "Already processed: Ev5ZA0GZA6");
                errors++;
            });

            slackBot.onMessage(messageJSON).then((s: string) => {
                assert.equal(s, "Already processed: Ev5ZA0GZA6");
                errors++;
            });

            setTimeout(() => {
                assert.equal(errors, 2);
                assert.equal(count, 1);
                done();
            }, 1000);

        });
    });
});
