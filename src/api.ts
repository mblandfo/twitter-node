import rp = require("request-promise");
import _ = require("lodash");
import passwords = require("./passwords");

class Api {
    accessToken: string;
    logRequests = true;

    twitterLabel = passwords.label;
    twitterProduct = passwords.product;

    get searchUrl() {
        let product = this.twitterProduct;
        let label = this.twitterLabel;
        return `https://api.twitter.com/1.1/tweets/search/${product}/${label}.json`;
    }

    get countsUrl() {
        let product = this.twitterProduct;
        let label = this.twitterLabel;
        return `https://api.twitter.com/1.1/tweets/search/${product}/${label}/counts.json`;
    }

    async login() {
        if (this.accessToken) {
            return Promise.resolve();
        }

        let basic = `${passwords.consumer_key}:${passwords.consumer_secret}`;
        let Authorization = "Basic " + Buffer.from(basic).toString("base64");

        let headers = {
            Host: "api.twitter.com",
            "User-Agent": "My Twitter App v1.0.23",
            Authorization,
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        };

        return rp({
            method: "POST",
            uri: "https://api.twitter.com/oauth2/token",
            form: {
                grant_type: "client_credentials"
            },
            json: true,
            headers
        })
            .then(result => {
                if (result.error) {
                    console.error(result.error);
                }
                this.accessToken = result.access_token;
            })
            .catch(err => {
                console.error(err);
                throw err;
            });
    }

    async request<T>(url: string, options: any): Promise<T> {
        let opts = _.assign(
            {
                uri: url,
                json: true,
                headers: {
                    Authorization: `bearer ${this.accessToken}`
                }
            },
            options
        );

        if (this.logRequests) {
            console.log(
                JSON.stringify(
                    {
                        method: opts.method,
                        url: opts.uri,
                        data: opts.body
                    },
                    null,
                    4
                )
            );
        }

        return rp(opts).catch((err: any) => {
            console.log(
                "error on request " +
                JSON.stringify(
                    {
                        method: opts.method,
                        url: opts.uri,
                        data: opts.body
                    },
                    null,
                    4
                )
            );
            console.error(JSON.stringify(err, null, 4));
            throw err;
        });
    }

    async search<T>(data: any, queryParams?: _.Dictionary<string>): Promise<T> {
        let options: any = {
            method: "POST",
            body: data
        };
        if (queryParams) {
            options.qs = queryParams;
        }
        return this.request(this.searchUrl, options);
    }

    async searchCounts(data: CountsRequest): Promise<CountsResponse> {
        let options: any = {
            method: "POST",
            body: data
        };
        return this.request<CountsResponse>(this.countsUrl, options);
    }
}

let api = new Api();
export = api;
