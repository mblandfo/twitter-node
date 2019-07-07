/** YYYYMMDDHHmm */
type TwitterDate = string;

type Tweet = any;

interface SearchRequest {
    query: string;
    /** A unique id can be passed in as tag to mark this rule */
    tag?: string;
    fromDate: TwitterDate;
    toDate: TwitterDate;
    next?: string;
    /** 1-500, default is 100 */
    maxResults?: number;
}

interface SearchResponse {
    results: Tweet[];
    requestParameters: SearchRequest;
    next?: string;
}

interface CountsRequest {
    query: string;
    /** Default: 'hour' */
    bucket: 'day' | 'hour' | 'minute';
    fromDate: TwitterDate;
    toDate: TwitterDate;
    next?: string;
}

interface CountsResponse {
    results: {
        timePeriod: TwitterDate;
        count: number;
    }
    totalCount: number;
    requestParameters: CountsRequest;
    next: string;
}