import * as aws from "aws-sdk";

export class DataManager {
    private tokenCache: {[id: string]: any};
    private dynamoDB: AWS.DynamoDB;
    private documentClient: AWS.DynamoDB.DocumentClient;

    public constructor() {
        this.tokenCache = {};
    }

    public createSlackAuthTable() {
        const params = {
            AttributeDefinitions: [
                { AttributeName: "team_id", AttributeType: "S" },
            ],
            KeySchema: [
                { AttributeName: "team_id", KeyType: "HASH"},
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1,
            },
            TableName : "SlackAuth",
        };

        this.client().createTable(params, function(error: aws.AWSError, data: aws.DynamoDB.Types.CreateTableOutput) {
            if (error) {
                if (error.message.startsWith("Table already exists")) {
                    console.log("Table already created");
                } else {
                    console.error("Unable to create table. Error JSON:", JSON.stringify(error, null, 2));
                }
            } else {
                console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
            }
        });
    }

    public createSlackUserTable() {
        const params = {
            AttributeDefinitions: [
                { AttributeName: "user_id", AttributeType: "S" },
            ],
            KeySchema: [
                { AttributeName: "user_id", KeyType: "HASH"},
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1,
            },
            TableName : "SlackUser",
        };

        this.client().createTable(params, function(error: aws.AWSError, data: aws.DynamoDB.Types.CreateTableOutput) {
            if (error) {
                if (error.message.startsWith("Table already exists: SlackUser")) {
                    console.log("Table already created");
                } else {
                    console.error("Unable to create table. Error JSON:", JSON.stringify(error, null, 2));
                }
            } else {
                console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
            }
        });
    }

    public saveSlackAuth(slackAuth: any): Promise<void>  {
        return new Promise<void>(async (resolve, reject) => {
            const client = new aws.DynamoDB.DocumentClient({
                region: "us-east-1",
            });

            const params = {
                Item: slackAuth,
                TableName: "SlackAuth",
            };

            console.time("putObject");
            client.put(params, (error: Error) => {
                console.timeEnd("putObject");
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    public saveSlackUser(userID: string, teamID: string, avsToken: string): Promise<void>  {
        return new Promise<void>(async (resolve, reject) => {
            const client = new aws.DynamoDB.DocumentClient({
                region: "us-east-1",
            });

            const params = {
                Item: {
                    avs_token: avsToken,
                    user_id: (userID + teamID),
                },
                TableName: "SlackUser",
            };

            console.time("putObject");
            client.put(params, (error: Error) => {
                console.timeEnd("putObject");
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    public fetchSlackAuth(teamID: string): Promise<any>  {
        return new Promise<void>(async (resolve, reject) => {
            if (teamID in this.tokenCache) {
                console.log("AuthToken FoundInCache");
                resolve(this.tokenCache.teamID);
                return;
            }

            const params = {
                Key: {
                    team_id: teamID,
                },
                TableName: "SlackAuth",
            };

            console.time("putObject");
            this.docClient().get(params, (error: Error, result: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.Item);
                }
            });
        });
    }

    public fetchSlackUser(userID: string, teamID: string): Promise<any>  {
        return new Promise<void>(async (resolve, reject) => {
            const params = {
                Key: {
                    team_id: (userID + teamID),
                },
                TableName: "SlackUser",
            };

            this.docClient().get(params, (error: Error, result: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.Item);
                }
            });
        });
    }

    private client(): AWS.DynamoDB {
        if (!this.dynamoDB) {
            this.dynamoDB = new aws.DynamoDB(this.awsParameters());
        }
        return this.dynamoDB;
    }

    private docClient(): AWS.DynamoDB.DocumentClient {
        if (!this.documentClient) {
            this.documentClient = new aws.DynamoDB.DocumentClient(this.awsParameters());
        }
        return this.documentClient;
    }

    private awsParameters(): any {
        return {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            region: "us-east-1",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
    }
}
