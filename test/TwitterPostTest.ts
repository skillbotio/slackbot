// import {assert} from "chai";
import * as dotenv from "dotenv";
import {TwitterPost} from "../src/TwitterPost";

describe("TwitterPost", function() {
    before(() => {
        dotenv.config();
    });
    this.timeout(20000);

    describe("toHTML()", () => {
        it("Handle a message to silentecho", function(done) {
            const post = new TwitterPost(SampleTweet, {
                card: {
                    imageURL: null,
                    mainTitle: "This is a short message in reply",
                    subTitle: null,
                    textField: "This is short text field",
                    type: "CardType",
                },
                raw_json: {},
                stream_url: null,
                transcript: "Hello there",
                transcript_audio_url: "https://myaudio.com",
            });

            const html = post.toHTML();
            console.log("HTML: " + html);
            done();
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
