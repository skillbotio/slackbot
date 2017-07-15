const request = require("request-promise-native");

export class BotUtil {

    public static urlToBase64(url: string): Promise<string> {
        const options = {
            encoding: "base64",
            resolveWithFullResponse: true,
            uri: url,
        };

        return new Promise((resolve, reject) => {
            request(options).then((response: any) => {
                console.log("Header: " + response.headers["content-type"]);
                resolve(response.body);
            });
        });
    }
}
