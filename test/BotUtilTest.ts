import {assert} from "chai";
import {BotUtil} from "../src/BotUtil";

describe("BotUtil", function() {
    describe("#urlToBase64", () => {
        it("Should handle a URL", function(done) {
            // Base64: /9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAABZAAD/
            BotUtil.urlToBase64("https://pbs.twimg.com/media/DEuhI66XoAAW7LO.jpg:large").then((data: string) => {
                // console.log("Data: " + data);
                assert.equal(data.substring(0, 40), "/9j/4AAQSkZJRgABAQAAAQABAAD/4gxYSUNDX1BS");
                done();
            });
        });
    });
});
