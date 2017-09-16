export class DataManager {
    private tokenCache: {[id: string]: any};
    private userCache: {[id: string]: any};
    private dynasty: any;

    public constructor() {
        this.tokenCache = {};
        this.userCache = {};
        this.dynasty = require("dynasty")(this.awsParameters());
    }

    public createSlackAuthTable(): Promise<void> {
        return this.dynasty.create("SkillBotSlackAuth", { key_schema: { hash: ["key", "string"] } }).catch((e: any) => {
            if (e.message.indexOf("Table already exists") !== -1) {
                return Promise.resolve();
            } else {
                return Promise.reject(e);
            }
        });
    }

    public saveSlackAuth(clientToken: string, slackAuth: any): Promise<void>  {
        slackAuth.key = clientToken + slackAuth.team_id;
        return this.dynasty.table("SkillBotSlackAuth").insert(slackAuth);
    }

    public fetchSlackAuth(clientToken: string, teamID: string): Promise<any> {
        const key = clientToken + teamID;
        return this.dynasty.table("SkillBotSlackAuth").find(key);
    }

    private awsParameters(): any {
        return {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            region: "us-east-1",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
    }
}
