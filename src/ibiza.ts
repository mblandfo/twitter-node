import api = require("./api");
import moment = require('moment');
// import fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
import _ = require('lodash');
import SearchManager = require('./SearchManager');

let hashtags = [
    '#ibizagate',
    '#ibizavideo',
    '#ibizaaffaere', //81k
    // '#Strache',
    // '#StracheVideo',
    // '#StracheGate',
    // '#Kurz',
    // '#FPÖ',
    // '#fpoe', // 161k (without strache ones)
    // '#neuwahlen',
    // '#neuwahl',
    // '#Misstrauensantrag',
    // '#Misstrauensvotum',
    // '#Regierungskrise',
    // '#Kickl',
    // '#übergangsregierung',
    // '#Bierlein',
    // '#philippastrache',
    // '#HCStrache',
    // '#ibiza'
];

let query = hashtags.join(" OR ");
let fromDate = moment.utc('2019-05-17');
let toDate = moment.utc('2019-05-29');
let twitterDateFormat = 'YYYYMMDDHHmm';
const outputCsv = 'tweets.csv';

let searchManager = new SearchManager({
    query,
    fromDate: fromDate.format(twitterDateFormat),
    toDate: toDate.format(twitterDateFormat)
});
// searchManager.clearCacheDir();

async function go() {
    // api.accessToken = "AAAAAAAAAAAAAAAAAAAAANqS%2FAAAAAAA25ty6fTTTY3FnQOHwDZczvG%2Bdpc%3DP2PLis6Rd9fXXjSxPEyEebFYrMoQbuA6ErwlqRgiIkfq3bQfGP";

    await api.login();

    let counts = await searchManager.getCounts();
    console.log(JSON.stringify(counts, null, 4));
    console.log('x');

    while (searchManager.hasNext) {
        let response = await searchManager.getNext();
        let tweets = response.results;
        await writeTweets(outputCsv, tweets, false);
        console.log('--');
    }
}

async function writeTweets(path: string, tweets, append: boolean) {
    if (tweets.length === 0) {
        return;
    }

    _.each(tweets, t => {
        try {
            if (t.user) {
                t.userId = t.user.id;
                t.userName = t.user.name;
                t.userScreen_name = t.user.screen_name;
                t.userLocation = t.user.location;
                t.userDescription = t.user.description;
                t.userProtected = t.user.protected;
                t.userVerified = t.user.verified;
                t.userFollowers = t.user.followers_count;
                t.userFavourites_count = t.user.favourites_count;
                t.userFriends = t.user.friends_count;
                t.userStatuses = t.user.statuses_count;
                t.userCreatedAt = t.user.created_at;
            }
            if (t.entities) {
                t.hashTags = _.map(t.entities.hashtags, hashTag => hashTag.text);
            }
            if (t.place) {
                t.country = t.place.country;
                t.placeFullName = t.place.full_name;
            }
            if (t.geo) {
                t.geo = JSON.stringify(t.geo.coordinates);
            }
            if (t.coordinates) {
                t.coordinates = JSON.stringify(t.coordinates.coordinates);
            }
        } catch (e) { }
    });

    let keys = [
        "created_at", "id", "id_str", "text", "source",
        "truncated", "in_reply_to_status_id", "in_reply_to_status_id_str", "in_reply_to_user_id",
        "in_reply_to_user_id_str", "in_reply_to_screen_name", "userId", "userName", "geo", "coordinates", "country",
        "placeFullName",
        "contributors", "is_quote_status", "quote_count", "reply_count", "retweet_count", "favorite_count",
        "hashTags", "favorited", "retweeted", "possibly_sensitive", "filter_level", "lang",
        "userScreen_name", "userLocation", "userDescription", "userProtected",
        "userVerified", "userFollowers", "userFavourites_count", "userFriends",
        "userStatuses", "userCreatedAt"
    ];

    const csvWriter = createCsvWriter({
        path,
        append,
        header: _.map(keys, k => {
            return {
                id: k, title: k
            };
        })
    });

    return csvWriter.writeRecords(tweets)
        .then(() => {
            console.log('...Done');
        });
}

go();
