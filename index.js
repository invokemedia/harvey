const request = require('node-fetch');
const _ = require('underscore');
const moment = require('moment');

// load up the config for the app
const config = require('./config.json');

// get the times from the last week
const start = moment().day(config.startWeek);
const startYMD = start.format('YYYY-MM-DD');
const startFormatted = start.format('dddd, MMMM Do YYYY');

const end = moment().day(config.endWeek);
const endYMD = end.format('YYYY-MM-DD');
const endFormatted = end.format('dddd, MMMM Do YYYY');

// only used when config.schedule === 'month'
const startOfMonth = moment().subtract(1, 'months').startOf('month');
const startOfMonthYMD = startOfMonth.format('YYYY-MM-DD');
const startOfMonthFormatted = startOfMonth.format('MMMM YYYY');

const endOfMonth = moment().subtract(1, 'months').endOf('month');
const endOfMonthYMD = endOfMonth.format('YYYY-MM-DD');

let page = 1;

// easy mapping for when the config.schedule changes
const urlObj = {
  week: `https://api.harvestapp.com/v2/time_entries?from=${startYMD}&to=${endYMD}&page=`,
  month: `https://api.harvestapp.com/v2/time_entries?from=${startOfMonthYMD}&to=${endOfMonthYMD}&page=`
};

function getURL() {
  return urlObj[config.schedule] + page;
}

const formattedDates = {
  week: `_${startFormatted}_ to _${endFormatted}_`,
  month: `_${startOfMonthFormatted}_`
};

const getTimeEntries = function(currentURL) {
  // used for local development
  if (process.env.NODE_ENV != 'production') {
    return new Promise(function(resolve) {
      resolve({
        json: () => {
          return (config.testFile) ? require(config.testFile) : {};
        }
      });
    });
  }

  return request(currentURL, {
    method: 'get',
    headers: {
      'user-agent': `Reports (${config.accountEmail})`,
      'harvest-account-id': `${config.harvestAccountId}`,
      authorization: `Bearer ${config.bearerToken}`,
      'accept': 'application/json',
      'content-type': 'application/json'
    }
  });
};

// add and merge up all the entries for an array of attachments for slack
const sumEntryHours = function(entries) {
  const results = _.groupBy(entries, (entry) => {
    return entry.user.name;
  });

  const attachments = Object.keys(results)
    .map((name) => {
      // we calculate the hours and add them to the top level for sorting
      const hours = _.pluck(results[name], 'hours').reduce((a, b) => a + b, 0);

      // we have slack emojis for each :firstname: of our team
      const slackEmojiName = name.split(' ')[0].toLowerCase();

      return {
        hours,
        fallback: `${name} only has ${hours} hours for the ${config.schedule} of ${formattedDates[config.schedule]}.`,
        color: "#c93742",
        title: `:${slackEmojiName}: ${name}`,
        fields: [{
          name: `:${slackEmojiName}:`,
          value: `Missing ${(config.minimumHours - hours).toFixed(2)} hours`,
          short: true
        }]
      };
    })
    .filter((entry) => {
      // do they have enough hours to be left out?
      return entry.hours < config.minimumHours;
    });

  return _.sortBy(attachments, 'hours');
};

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function postToSlack(attachments) {
  const prefix = (process.env.NODE_ENV != 'production') ? "======!TESTING======\n" : '<!channel> ';
  // we assume everything is cool to start
  let message = {
    username: config.botName,
    icon_url: config.botIcon,
    text: `${prefix}:tada: *All hours entered* for the ${config.schedule} of ${formattedDates[config.schedule]}.\n_I love you!_ :kissing_heart:`,
    attachments
  };

  // oh wait, there are messages to send
  if (attachments.length > 0) {
    message = {
      username: config.botName,
      icon_url: config.botIcon,
      text: `${prefix}*The following users have missing hours*.\n${toTitleCase(config.schedule)} of ${formattedDates[config.schedule]}.`,
      attachments
    };
  }

  return request(config.slackUrl, {
    method: 'post',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });
}

function manyGetTimeEntries(res) {
  const iter = Array.apply(null, {
    length: res.total_pages
  }).map(Number.call, Number);

  // create an array of promises
  return iter.map((val, index) => {
    page = index + 1;
    return getTimeEntries(getURL());
  });
}

getTimeEntries(getURL())
  .then((res) => {
    return res.json();
  })
  .then(manyGetTimeEntries)
  .then((requests) => {
    return Promise.all(requests);
  })
  .then((responses) => {
    // res.json() returns a promise
    return responses.map(res => res.json());
  })
  .then((jsonResponse) => {
    return Promise.all(jsonResponse);
  })
  .then((entries) => {
    // get the nested results
    return entries.map(entry => entry.time_entries);
  })
  .then((timeEntries) => {
    // flatten so we can now sum the hours and groupBy the names easier
    return _.flatten(timeEntries, true);
  })
  .then(sumEntryHours)
  .then(postToSlack)
  .then(() => {
    console.log('posted to slack');
  })
  .catch((err) => {
    console.error(err);
  });

process.on('uncaughtException', (err) => {
  console.log('uncaughtException', err.stack);
});

process.on('unhandledRejection', (reason, p) => {
  console.log('unhandledRejection', {
    p,
    reason
  });
});