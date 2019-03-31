# Untappical

> ICS calendar feed server for [Untappd](https://untappd.com/) checkins

Ever wanted your Untappd checkins to start showing up on your calendar? Me either, but here we are.

 ### Installation

```bash 
$ npm install
```

## Setup

Create a `.env` file in the project directory with your Untappd [client ID and secret](https://untappd.com/api/dashboard):

```ini
CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```


## Usage

```bash 
$ npm run start
```

An ecosystem file for pm2 is included as well.  To start `untappical` as a pm2 service, run:

```bash 
$ pm2 start ecosystem.config.js
```

The server is now running. To see the feed in your calendar application, add a subscription with the following path:
`http://host:port/users/username`

So for example, if the server is running on your local machine on port `8080` and your username was `test123`, you would use the URL:
`http://localhost:8080/users/test123`

Cheers 🍻
