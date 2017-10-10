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

### Testing

You can create a json file in the root and then set a `testFile` in the config. This can be used for testing the application locally without making calls to the Harvest API. Make sure you update `total_pages` so that there is only 1 page or the app will break.
