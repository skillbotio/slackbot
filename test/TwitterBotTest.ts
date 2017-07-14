import {assert} from "chai";
import * as dotenv from "dotenv";
import {EventEmitter} from "events";
import * as fs from "fs";
import {TwitterBot} from "../src/TwitterBot";

class MockTwitterBot extends TwitterBot {
    protected newStream() {
        return new MockStream() as any;
    }
}

class MockStream extends EventEmitter {
    public constructor() {
        super();
        this.start();
    }

    public on(event: any, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    private start(): void {
        const self = this;
        setTimeout(function() {
            self.emit("tweet", SampleTweet as any);
        }, 100);
    }
}

describe("TwitterBot", function() {
    before(() => {
        dotenv.config();
    });
    this.timeout(20000);

    describe("mockMessage()", () => {
        it("Handle a message to silentecho", function(done) {
            const bot = new MockTwitterBot();
            bot.start();
        });

        it("Post media to twitter", function(done) {
            const bot = new MockTwitterBot();
            const data = fs.readFileSync("test/resources/tide-logo-1200x800.jpg");

            const base64data = new Buffer(data).toString("base64");
            console.log("Base64: " + base64data);
            bot.postMedia(base64data);
        });

        it("Post media URL to twitter", function(done) {
            const bot = new MockTwitterBot();
            bot.postMediaFromURL("https://pbs.twimg.com/media/DEuhI66XoAAW7LO.jpg:large");
        });
    });

    describe("cleanMessage()", () => {
        it("Clean message with one username", () => {
            const cleaned = TwitterBot.cleanMessage("@silentechobot hi");
            assert.equal(cleaned, "hi");
        });

        it("Clean message with one username at end", () => {
            const cleaned = TwitterBot.cleanMessage("hi @silentechobot ");
            assert.equal(cleaned, "hi");
        });

        it("Clean message with one username at middle", () => {
            const cleaned = TwitterBot.cleanMessage("hi @silentechobot there my friend");
            assert.equal(cleaned, "hi there my friend");
        });

        it("Clean message with more than one username at middle", () => {
            const cleaned = TwitterBot.cleanMessage("hi @silentechobot there my @jpkbst friend");
            assert.equal(cleaned, "hi there my friend");
        });
    });
});

const SampleTweet = {
    created_at: "Fri Jul 14 20:42:26 +0000 2017",
    id: 885962714618761200,
    id_str: "885962714618761217",
    source: "<a href=\"http://twitter.com\" rel=\"nofollow\">Twitter Web Client</a>",
    text: "@silentechobot ask tide how to remove blood stains",
    user: {
        screen_name: "TheUndscvrdPeru",
    },
};
