import api = require("./api");
import fs = require('fs');

interface SearchOptions {
    query: string;
    fromDate: string;
    toDate: string;

    /** 1-500, default 500. We pay for number of requests, so might as well
     * get the most data out of them that we can. */
    maxResults?: number;
}

class SearchManager {
    constructor(public options: SearchOptions) {
    }

    cacheDir = 'cache';
    nextFile = 'nextIndex.txt';
    next: string;
    hasNext = true;

    /** For client caching, to identify search terms? */
    private tag = newGuid();

    async getCounts() {
        let data: CountsRequest = <any>Object.assign({
            bucket: 'day',
            // next: 'eyJhdXRoZW50aWNpdHkiOiJmNTk1ZTcxZmY4YjNiZTg2MWI1YWUyMDBmNzk3MzgyNzk1OWVhNTFjYjk3NTUwZmNmYmFmZDU0MzI2ODA5NDA2IiwiZnJvbURhdGUiOiIyMDE5MDUxNTAwMDAiLCJ0b0RhdGUiOiIyMDE5MDYyODAwMDAiLCJidWNrZXQiOiJkYXkiLCJuZXh0Ijp7Im1heERhdGUiOiIyMDE5MDUyODAwMDAwMCIsImV4cGVuc2l2ZVF1ZXJ5IjpmYWxzZX19'
        }, this.options);
        return api.searchCounts(data).then(response => {
            console.log(`counts.totalCount = ${response.totalCount}`);
            console.log(`counts.next = ${response.next}`);
            return response;
        });
    }

    async getNext() {
        let data: SearchRequest = <any>Object.assign({}, this.options);
        data.next = this.next;
        data.tag = this.tag;
        data.maxResults = data.maxResults || 500;
        let isFirstRequest = !data.next;

        let cachedResponse = this.getCachedResponse(data);
        if (cachedResponse) {
            this.next = cachedResponse.next;
            let isLastRequest = !this.next;
            this.hasNext = !isLastRequest;
            return Promise.resolve(cachedResponse);
        }

        if (isFirstRequest) {
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir);
            }
        }

        return api.search<SearchResponse>(data).then(response => {
            this.next = response.next;
            let isLastRequest = !this.next;
            this.hasNext = !isLastRequest;
            this.cacheNext(isFirstRequest, isLastRequest);
            this.cacheResponse(data.next, response);
            let numTweets = response.results && response.results.length;
            console.log(`got ${numTweets} tweets, next = ${response.next}`);
            return response;
        });
    }

    private cacheNext(isFirstRequest: boolean, isLastRequest: boolean) {
        if (isFirstRequest) {
            fs.writeFileSync(this.nextFile, this.next + '\n');
        } else if (!isLastRequest) {
            fs.appendFileSync(this.nextFile, this.next + '\n');
        } else {
            fs.appendFileSync(this.nextFile, 'Complete!\n');
        }
    }

    /** If you stopped your program mid search, you can pick it up from cached next value */
    getNextValueFromFile() {
        if (fs.existsSync(this.nextFile)) {
            let contents = fs.readFileSync(this.nextFile, 'utf8');
            let nextValues = contents.trim().split('\n');
            let lastValue = nextValues[nextValues.length - 1];
            return lastValue;
        }
    }

    clearCacheDir() {
        fs.unlinkSync(this.nextFile);
        let path = './' + this.cacheDir;
        if (fs.existsSync(path)) {
            let filesToDelete: string[] = [];
            fs.readdirSync(path).forEach(function (file) {
                var curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    throw new Error('unexpected Dir ' + curPath);
                } else { // delete file
                    filesToDelete.push(curPath);
                }
            });
            filesToDelete.forEach(file => {
                fs.unlinkSync(file);
            });
            fs.rmdirSync(path);
        }
    }

    private cacheResponse(next: string, response: SearchResponse) {
        let path = this.getCacheFileName(next);
        fs.writeFileSync(path, JSON.stringify(response));
    }

    private getCachedResponse(data: SearchRequest) {
        let path = this.getCacheFileName(data.next);
        if (fs.existsSync(path)) {
            let file = fs.readFileSync(path, 'utf8');
            let cachedResponse = <SearchResponse>JSON.parse(file);
            if (this.requestsMatch(cachedResponse.requestParameters, data)) {
                return cachedResponse;
            } else {
                let cachedRequestParameters = cachedResponse.requestParameters;
                let requestParameters = data;
                let msg = 'Cache is for a different search. Cache dir should be cleared first';
                let errMsg = { msg, cachedRequestParameters, requestParameters };
                throw new Error(JSON.stringify(errMsg, null, 4));
            }
        }
    }

    private requestsMatch(cachedRequestParameters: SearchRequest, requestParameters: SearchRequest) {
        return cachedRequestParameters.toDate === requestParameters.toDate &&
            cachedRequestParameters.fromDate === requestParameters.fromDate &&
            cachedRequestParameters.maxResults === requestParameters.maxResults;
        // (cachedRequestParameters.next || '') === (requestParameters.next || '');
        // query is not on cachedResponse.. check tag? 
        //cachedRequestParameters.query === requestParameters.query
    }

    private getCacheFileName(next: string) {
        let path = './' + this.cacheDir;
        if (!path.endsWith('/')) {
            path += '/';
        }
        next = next || 'InitialRequest';
        path += next + '.json';
        return path;
    }
}

function newGuid() {
    var sGuid = '';
    for (let i = 0; i < 32; i++) {
        sGuid += Math.floor(Math.random() * 0xF).toString(0xF);
    }
    return sGuid;
}

export = SearchManager;