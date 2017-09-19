import {assert} from "chai";
import * as dotenv from "dotenv";
import * as nock from "nock";
import {IBot, SlackBot} from "../src/SlackBot";

export class MockSlackBot extends SlackBot {
    protected lookupBot(teamID: string): Promise<IBot> {
        return Promise.resolve({
            bot_access_token: "BOT_ACCESS_TOKEN",
            bot_user_id: "U1234567",
        });
    }
}

describe("SlackBotTest", function() {
    before(() => {
        dotenv.config();
    });

    describe("Integration Test", function() {
        this.timeout(20000);

        it("Should process a message", async () => {
            const message = {
                api_app_id: "A5ZALHNN6",
                authed_users: ["U65SQ8DE3"],
                event: {
                    channel: "D655524SH",
                    event_ts: "1499453429.099535",
                    text: "tell we study billionaires to play next",
                    ts: "1499453429.099535",
                    type: "message",
                    user: "U64VD25GT",
                },
                event_id: "Ev66DGAJBZ",
                event_time: 1499453429,
                team_id: "T64C0AX7A",
                token: "jj5RVapcDv8EcehoZ1HavpTx",
                type: "event_callback",
            };

            nock("https://skillbot.bespoken.io")
                .get("/message")
                .query(true)
                .reply(200, {
                    card: {
                        content: "My TextField",
                        imageUrl: "https://i.giphy.com/media/3o7buirYcmV5nSwIRW/480w_s.jpg",
                        title: "My Title",
                    },
                    text: "Hi",
                });

            nock("https://slack.com")
                .post("/api/chat.postMessage")
                .query(true)
                .reply(200, {
                    channel: "C024BE91L",
                    message: {
                        // The message you wrote, as we interpreted it
                    },
                    ok: true,
                    ts: "1405895017.000506",
                });

            const slackBot = new SlackBot();
            const reply = await slackBot.onMessage(message);

            assert.isUndefined(reply.error);
            assert.isTrue(reply.slackResponse.ok);
            console.log("Reply: " + JSON.stringify(reply.slackResponse));
        });
    });

    // describe("#onMessage", () => {
    //     it("Should handle a direct message", function(done) {
    //         const slackBot = new MockSlackBot();
    //
    //         const messageJSON = {
    //             api_app_id: "A5URU3SM7",
    //             authed_users: [
    //                 "U5WCLUTGW",
    //             ],
    //             event: {
    //                 channel: "D5VKJCF52",
    //                 event_ts: "1498461089.507055",
    //                 text: "tell we study billionaires to play",
    //                 ts: "1498461089.507055",
    //                 type: "message",
    //                 user: "U4GSZ33U0",
    //             },
    //             event_id: "Ev5ZA0GZA6",
    //             event_time: 1498461089,
    //             team_id: "T4HJBFNCS",
    //             token: "xtuQiBe0yjEYiPHlz0t4F2lX",
    //             type: "event_callback",
    //         };
    //
    //         slackBot.onMessage(messageJSON);
    //     });
    //
    //     it("Should try to register a new user via direct message", function(done) {
    //         const slackBot = new MockSlackBot((message: string) => {
    //             console.log("Output: " + message);
    //             assert.isTrue(message.indexOf("You have not registered with Silent Echo yet") !== -1);
    //             done();
    //         });
    //
    //         const messageJSON = {
    //             api_app_id: "A5URU3SM7",
    //             authed_users: [
    //                 "U5WCLUTGW",
    //             ],
    //             event: {
    //                 channel: "D5VKJCF52",
    //                 event_ts: "1498461089.507055",
    //                 text: "tell we study billionaires to play",
    //                 ts: "1498461089.507055",
    //                 type: "message",
    //                 user: "UNREGISTERED",
    //             },
    //             event_id: "Ev5ZA0GZA6",
    //             event_time: 1498461089,
    //             team_id: "T4HJBFNCS",
    //             token: "xtuQiBe0yjEYiPHlz0t4F2lX",
    //             type: "event_callback",
    //         };
    //
    //         slackBot.onMessage(messageJSON);
    //     });
    //
    //     it("Should handle a new user registration token", function(done) {
    //         const slackBot = new MockSlackBot((message: string) => {
    //             console.log("Output: " + message);
    //             assert.equal(message, "Thank you for registering. Speak to Alexa!");
    //             done();
    //         });
    //
    //         const messageJSON = {
    //             api_app_id: "A5URU3SM7",
    //             authed_users: [
    //                 "U5WCLUTGW",
    //             ],
    //             event: {
    //                 channel: "D5VKJCF52",
    //                 event_ts: "1498461089.507055",
    //                 text: "c84b85ea-5338-4331-9cb2-e6685fd78369",
    //                 ts: "1498461089.507055",
    //                 type: "message",
    //                 user: "UNREGISTERED",
    //             },
    //             event_id: "Ev5ZA0GZA6",
    //             event_time: 1498461089,
    //             team_id: "T4HJBFNCS",
    //             token: "xtuQiBe0yjEYiPHlz0t4F2lX",
    //             type: "event_callback",
    //         };
    //
    //         slackBot.onMessage(messageJSON);
    //     });
    //
    //     it("Should handle a channel message with name", function(done) {
    //         const slackBot = new MockSlackBot((message: string, options: any) => {
    //             console.log("Output: " + message);
    //             assert.isTrue(options.attachments[0].text.indexOf("Hello there") !== -1);
    //             done();
    //         });
    //
    //         const messageJSON = {
    //             api_app_id: "A5URU3SM7",
    //             authed_users: [
    //                 "U5WCLUTGW",
    //             ],
    //             event: {
    //                 channel: "C5VKJCF52",
    //                 event_ts: "1498461089.507055",
    //                 text: "<@U1234567> tell we study billionaires to play",
    //                 ts: "1498461089.507055",
    //                 type: "message",
    //                 user: "U4GSZ33U0",
    //             },
    //             event_id: "Ev5ZA0GZA6",
    //             event_time: 1498461089,
    //             team_id: "T4HJBFNCS",
    //             token: "xtuQiBe0yjEYiPHlz0t4F2lX",
    //             type: "event_callback",
    //         };
    //
    //         slackBot.onMessage(messageJSON);
    //     });
    //
    //     it("Should ignore a channel message without name", function(done) {
    //         const slackBot = new MockSlackBot();
    //
    //         const messageJSON = {
    //             api_app_id: "A5URU3SM7",
    //             authed_users: [
    //                 "U5WCLUTGW",
    //             ],
    //             event: {
    //                 channel: "C5VKJCF52",
    //                 event_ts: "1498461089.507055",
    //                 text: "tell we study billionaires to play",
    //                 ts: "1498461089.507055",
    //                 type: "message",
    //                 user: "U4GSZ33U0",
    //             },
    //             event_id: "Ev5ZA0GZA6",
    //             event_time: 1498461089,
    //             team_id: "T4HJBFNCS",
    //             token: "xtuQiBe0yjEYiPHlz0t4F2lX",
    //             type: "event_callback",
    //         };
    //
    //         slackBot.onMessage(messageJSON).then((reply: SlackBotReply) => {
    //             assert.equal(reply.error, "Ignore messages that do not call bot name: U1234567");
    //             done();
    //         });
    //     });
    //
    //     it("Should ignore join channel messages", function(done) {
    //         const slackBot = new MockSlackBot();
    //
    //         const messageJSON = {
    //             api_app_id: "A5URU3SM7",
    //             authed_users: [
    //                 "U5WCLUTGW",
    //             ],
    //             event: {
    //                 channel: "C5VKJCF52",
    //                 event_ts: "1498461089.507055",
    //                 text: "<@U605KD82J|silentechodev> has joined the channel",
    //                 ts: "1498461089.507055",
    //                 type: "message",
    //                 user: "U4GSZ33U0",
    //             },
    //             event_id: "Ev5ZA0GZA6",
    //             event_time: 1498461089,
    //             team_id: "T4HJBFNCS",
    //             token: "xtuQiBe0yjEYiPHlz0t4F2lX",
    //             type: "event_callback",
    //         };
    //
    //         slackBot.onMessage(messageJSON).then((reply: SlackBotReply) => {
    //             assert.equal(reply.error, "Ignore messages that do not call bot name: U1234567");
    //             done();
    //         });
    //     });
    //
    //     it("Should ignore message from a bot", function(done) {
    //         const slackBot = new MockSlackBot();
    //
    //         const messageJSON = {
    //             api_app_id: "A5URU3SM7",
    //             authed_users: [
    //                 "U5WCLUTGW",
    //             ],
    //             event: {
    //                 channel: "C5VKJCF52",
    //                 event_ts: "1498461089.507055",
    //                 text: "tell we study billionaires to play",
    //                 ts: "1498461089.507055",
    //                 type: "message",
    //                 username: "SilentEchoBot",
    //             },
    //             event_id: "Ev5ZA0GZA6",
    //             event_time: 1498461089,
    //             team_id: "T4HJBFNCS",
    //             token: "xtuQiBe0yjEYiPHlz0t4F2lX",
    //             type: "event_callback",
    //         };
    //
    //         slackBot.onMessage(messageJSON).then((s: SlackBotReply) => {
    //             assert.equal(s.error, "Ignore messages from the bot: SilentEchoBot");
    //             done();
    //         });
    //     });
    //
    //     it("Should handle repeat messages", function(done) {
    //         let count = 0;
    //         let errors = 0;
    //         const slackBot = new MockSlackBot((message: string) => {
    //             count++;
    //         });
    //
    //         const messageJSON = {
    //             api_app_id: "A5URU3SM7",
    //             authed_users: [
    //                 "U5WCLUTGW",
    //             ],
    //             event: {
    //                 channel: "D5VKJCF52",
    //                 event_ts: "1498461089.507055",
    //                 text: "tell we study billionaires to play",
    //                 ts: "1498461089.507055",
    //                 type: "message",
    //                 user: "U4GSZ33U0",
    //             },
    //             event_id: "Ev5ZA0GZA6",
    //             event_time: 1498461089,
    //             team_id: "T4HJBFNCS",
    //             token: "xtuQiBe0yjEYiPHlz0t4F2lX",
    //             type: "event_callback",
    //         };
    //
    //         slackBot.onMessage(messageJSON);
    //
    //         slackBot.onMessage(messageJSON).then((reply: SlackBotReply) => {
    //             assert.equal(reply.error, "Already processed: Ev5ZA0GZA6");
    //             errors++;
    //         });
    //
    //         slackBot.onMessage(messageJSON).then((reply: SlackBotReply) => {
    //             assert.equal(reply.error, "Already processed: Ev5ZA0GZA6");
    //             errors++;
    //         });
    //
    //         setTimeout(() => {
    //             assert.equal(errors, 2);
    //             assert.equal(count, 1);
    //             done();
    //         }, 1000);
    //
    //     });
    // });
});
