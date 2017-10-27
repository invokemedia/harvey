Harvey
======

> Harvey is a Slack bot that can report the hours from Harvest for your team on a weekly or monthly basis.

![harvey screenshot](https://raw.githubusercontent.com/invokemedia/harvey/master/screenshot.png)

### Authentication

You need to have a Bearer token for an *admin user* before you can use this script.

### Setup

* clone this repo
* `npm install`
* `cp config-example.json config.json`
* Fill in the values in the `config.json` file.
* `npm run test`

You will need to also [setup a Slack Webhook](https://api.slack.com/custom-integrations/incoming-webhooks) for the results to be sent to.

### Running

By changing the `config.schedule` from `week` to `month`, you can control the range for the previous week or month. Be sure to update the `minimumHours` when changing from `week` to `month`.

#### Holidays

Most of us don't work on holidays. In order to have these days not counted, the `minimumHours` value is reduced by the `minimumDailyHours` value for each day of the week that is a holiday.

Example of the expected JSON file:

```
{
  "2017": [
    "2017-01-02",
    "2017-02-13",
    "2017-04-14",
    "2017-05-22",
    "2017-07-03",
    "2017-08-07",
    "2017-09-04",
    "2017-10-09",
    "2017-11-13",
    "2017-12-25",
    "2017-12-26",
    "2017-12-27",
    "2017-12-28",
    "2017-12-29"
  ]
}
```

It expects an object keyed by the current year, and then an array of dates in `YYYY-MM-DD` format inside of that.

If the `holidayUrl` field is empty or undefined, holidays will not be accounted for.

### Testing

You can create a json file in the root and then set a `testFile` in the config. This can be used for testing the application locally without making calls to the Harvest API. Make sure you update `total_pages` so that there is only 1 page or the app will break.
