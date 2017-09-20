import {assert} from "chai";
import {SlackBotMessage} from "../src/SlackBotMessage";

describe("SlackBotMessage", function() {
    describe("#parseMessage()", () => {
        it("parsesMessage", () => {
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

            const message = SlackBotMessage.fromMessage(messageJSON) as SlackBotMessage;
            assert.equal(message.channelID, "D5VKJCF52");
            assert.equal(message.teamID, "T4HJBFNCS");
            assert.equal(message.userID, "U4GSZ33U0");
            assert.equal(message.text, "tell we study billionaires to play");
        });
    });

    describe("cleanText()", () => {
        it("Clean with one name", () => {
            const message = new SlackBotMessage();
            message.text = "hi <@U65SQ8DE3>";
            assert.equal(message.textClean(), "hi");
        });

        it("Clean with one name and before and after", () => {
            const message = new SlackBotMessage();
            message.text = "hi <@U65SQ8DE3> there";
            assert.equal(message.textClean(), "hi  there");
        });

        it("Clean with many names and before and after", () => {
            const message = new SlackBotMessage();
            message.text = "hi <@U65SQ8DE3> there <@U65SQ8DE3> now <@U65SQ8D23> yes";
            assert.equal(message.textClean(), "hi  there  now  yes");
        });

        it("Clean with name at the end", () => {
            const message = new SlackBotMessage();
            message.text = "tell we study billionaires to play next <@U605KD82J>";
            assert.equal(message.textClean(), "tell we study billionaires to play next");
        });

        it("Clean with no names", () => {
            const message = new SlackBotMessage();
            message.text = "hi there";
            assert.equal(message.textClean(), "hi there");
        });

        it("Clean with single bracket", () => {
            const message = new SlackBotMessage();
            message.text = "hi < there";
            assert.equal(message.textClean(), "hi < there");
        });

        it("Clean message with channel name", () => {
            const message = new SlackBotMessage();
            message.text = "<!here|@here> Please give <@U605KD82J> a try";
            assert.equal(message.textClean(), "Please give  a try");
        });
    });
});
