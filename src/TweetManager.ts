import {TwitterPost} from "./TwitterPost";
export class TweetManager {
    public static Instance = new TweetManager();

    public tweets: {[id: string]: TwitterPost} = {};

    public add(post: TwitterPost) {
        this.tweets[post.tweet.id] = post;
    }

    public get(id: string): TwitterPost | undefined {
        const test = this.sanityPost(id);
        if (test) {
            return test;
        }

        if (id in this.tweets) {
            return this.tweets[id];
        } else {
            return undefined;
        }
    }

    public sanityPost(testName: string): TwitterPost | undefined {
        if (testName === "testCardNoImage") {
            return new TwitterPost({
                    text: testName,
                },
                {
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
                },
            );
        } else if (testName === "testCardImage") {
            return new TwitterPost({
                    text: testName,
                },
                {
                    card: {
                        imageURL: "https://pbs.twimg.com/media/DEuqiuBXUAAZOpO.jpg",
                        mainTitle: "This is a short message in reply",
                        subTitle: null,
                        textField: "This is a text field with a really, really long line, I just keep " +
                            "typing and typing like this and more typing and more typing" +
                            "\nWith multiple lines\nAnd more lines\n",
                        type: "CardType",
                    },
                    raw_json: {},
                    stream_url: null,
                    transcript: "Hello there",
                    transcript_audio_url: "https://myaudio.com",
                },
            );
        }
        return undefined;
    }
}
