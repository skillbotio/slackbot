import {ISilentResult} from "silent-echo-sdk";

export class TwitterPost {
    private static escapeString(text: string) {
        text = text.replace(/'/g, "''");
        text = text.replace(/\n/g, "<br>");
        return text;
    }

    public message: string;
    public title: string;
    public description: string;
    public imageURL: string;

    public constructor(public tweet: any, public result: ISilentResult) {
        this.build();
    }

    public build() {
        this.imageURL = "https://silentecho.bespoken.io/static/shh-3.png";
        if (this.result.transcript) {
            this.title = this.result.transcript;
            this.description = "Click to see the rest of the reply from Alexa";
        }

        if (this.result.card) {
            if (this.result.card.mainTitle) {
                this.title = this.result.card.mainTitle;
            } else if (this.result.card.subTitle) {
                this.title = this.result.card.subTitle;
            } else if (this.result.card.textField) {
                this.title = this.result.card.textField;
            }

            if ((this.result.card.mainTitle || this.result.card.subTitle) && this.result.card.textField) {
                this.description = this.result.card.textField;
            }

            if (this.result.card.imageURL) {
                this.imageURL = this.result.card.imageURL;
            }
        }
    }

    public toURL(): string {
        return process.env.BASE_URL + "/twitter_reply/" + this.tweet.id;
    }

    public toHTML(): string {
        let html = "<html><head>\n";
        html += "<link rel='stylesheet' href='https://fonts.googleapis.com/css?family=Lato'>\n";
        html += "<link rel='stylesheet' href='/post.css'>\n";
        html += "<link rel='icon' type='image/png' sizes='96x96' href='/favicon.ico'>\n";
        html += "<meta name='twitter:card' content='summary' />\n";
        html += "<meta name='twitter:site' content='@silentechobot' />\n";
        html += "<meta name='twitter:title' content='" + this.title + "' />\n";
        html += "<meta name='twitter:description' content='" + this.description + "' />\n";
        html += "<meta name='twitter:image' content='" + this.imageURL + "' />\n";
        html += "</head>\n";
        html += "<body>\n";
        html += "<table align='center'>\n";
        html += this.toHTMLRow("<a href='https://silentecho.bespoken.io'>" +
            "<img src='https://silentecho.bespoken.io/static/shh-3.png' width='100'>" +
            "</a>");
        html += this.toHTMLRow("Silent Echo Tweet", undefined, "title");

        html += this.toHTMLRow("Message", this.tweet.text);
        if (this.result.transcript) {
            html += this.toHTMLRow("Transcript", this.result.transcript);
            html += this.toHTMLRow("Transcript Audio", "<a target='_blank' " +
                "href='" + this.result.transcript_audio_url + "'>Listen</a>");
        }

        if (this.result.card) {
            html += this.toHTMLRow("Card", undefined, "card");
            if (this.result.card.mainTitle) {
                html += this.toHTMLRow("Card Title", this.result.card.mainTitle);
            }

            if (this.result.card.subTitle) {
                html += this.toHTMLRow("Card Subtitle", this.result.card.subTitle);
            }

            if (this.result.card.textField) {
                html += this.toHTMLRow("Card Text", TwitterPost.escapeString(this.result.card.textField));
            }

            if (this.result.card.imageURL) {
                html += this.toHTMLRow("<img src='" + this.result.card.imageURL + "' width='500' />");
            }
        }
        html += this.toHTMLRow("<a href='https://silentecho.bespoken.io'>Silent Echo</a>", undefined, "about");
        html += this.toHTMLRow("<a href='https://bespoken.tools'>By Bespoken</a>");

        html += "</table>\n";
        html += "</body>\n";
        html += "</html>\n";
        return html;
    }

    private toHTMLRow(field: string | null, value?: string, cssClass?: string): string {
        let html = "<tr valign='top'>";
        if (cssClass) {
            html = "<tr valign='top' class='" + cssClass + "'>";
        }
        if (field && value) {
            html += "<td nowrap class='field'>" + field + "</td>";
            html += "<td class='value'>" + value + "</td>";
        } else if (value) {
            html += "<td class='value' colspan='2' align='center'>" + value + "</td>";
        } else {
            html += "<td class='field' colspan='2' align='center'>" + field + "</td>";
        }
        html += "</tr>\n";
        return html;
    }
}
