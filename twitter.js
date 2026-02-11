const { TwitterApi } = require("twitter-api-v2");

const client = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

async function postTweet(text) {
  await client.v2.tweet(text);
}

module.exports = { postTweet };
