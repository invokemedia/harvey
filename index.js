const request = require('node-fetch');
const _ = require('underscore');
const moment = require('moment');

const config = require('./config.json');

// get the times from the last week
const start = moment().day(config.startWeek);
const startYMD = start.format('YYYY-MM-DD');
const startFormatted = start.format('dddd, MMMM Do YYYY');

const end = moment().day(config.endWeek);
const endYMD = end.format('YYYY-MM-DD');
const endFormatted = end.format('dddd, MMMM Do YYYY');

const startOfMonth = moment().subtract(1, 'months').startOf('month');
const startOfMonthYMD = startOfMonth.format('YYYY-MM-DD');
const startOfMonthFormatted = startOfMonth.format('MMMM YYYY');

const endOfMonth = moment().subtract(1, 'months').endOf('month');
const endOfMonthYMD = endOfMonth.format('YYYY-MM-DD');

const url = {
  week: `https://api.harvestapp.com/v2/time_entries?from=${startYMD}&to=${endYMD}`,
  month: `https://api.harvestapp.com/v2/time_entries?from=${startOfMonthYMD}&to=${endOfMonthYMD}`
};

const formattedDates = {
  week: `_${startFormatted}_ to _${endFormatted}_`,
  month: `_${startOfMonthFormatted}_`
};

const getTimeEntries = function() {
  if (process.env.NODE_ENV != 'production') {
    return new Promise(function(resolve) {
      resolve({
        json: () => {
          return (config.testFile) ? require(config.testFile) : {};
        }
      });
    });
  }

  return request(url[config.schedule], {
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

// add up all the hours for the array of entries
const sumEntryHours = function(entries) {
  const results = _.groupBy(entries, (entry) => {
    return entry.user.name;
  });

  const attachments = Object.keys(results)
    .map((name) => {
      const hours = _.pluck(results[name], 'hours').reduce((a, b) => a + b, 0);
      return {
        hours,
        fallback: `${name} only has ${hours} hours for the ${config.schedule} of ${formattedDates[config.schedule]}.`,
        color: "#c93742",
        title: `:${name.split(' ')[0].toLowerCase()}: ${name}`,
        fields: [{
          name: `:${name.split(' ')[0].toLowerCase()}:`,
          value: `Missing ${(config.minimumHours - hours).toFixed(2)} hours`,
          short: true
        }]
      };
    })
    .filter((entry) => {
      return entry.hours < config.minimumHours;
    });

  return _.sortBy(attachments, 'hours');
};

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

getTimeEntries()
  .then((res) => {
    return res.json();
  })
  .then((res) => {
    return res.time_entries;
  })
  .then(sumEntryHours)
  .then((attachments) => {
    let message = {
      username: config.botName,
      icon_url: config.botIcon,
      text: `:tada: *All hours entered* for the ${config.schedule} of ${formattedDates[config.schedule]}.\n_I love you!_ :kissing_heart:`,
      attachments
    };

    if (attachments.length > 0) {
      message = {
        username: config.botName,
        icon_url: config.botIcon,
        text: `*The following users have missing hours*.\n${toTitleCase(config.schedule)} of ${formattedDates[config.schedule]}.`,
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
  })
  .then(() => {
    console.log('posted to slack');
  })
  .catch((err) => {
    console.error(err);
  });