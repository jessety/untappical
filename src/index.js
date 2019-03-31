'use strict';

const http = require('http');
const express = require('express');
const logger = require('simple-express-logs');
const ical = require('ical-generator');
const Untappd = require('untappd-js');

require('env-smart').config();

const { name, version } = require('../package');

const untappd = new Untappd();

untappd.setClientId(process.env.CLIENT_ID);
untappd.setClientSecret(process.env.CLIENT_SECRET);

const app = express();

// Calender objects for each user
const calendars = {};

// Array of checkins we've processed
const checkins = [];

// Log all incoming requests
app.use(logger());

// Remove default branding
app.use((request, response, next) => {
  response.setHeader('X-Powered-By', `${name} ${version}`);
  next();
});

// Handle valid requests for a user

app.get(`${process.env.ROUTE}/:username`, async (request, response) => {

  const { username } = request.params;

  try {

    console.log(`Processing request for ${username}`);

    // Create a calendar object for this user, if we don't already have one

    if (calendars[username] === undefined) {
      calendars[username] = ical({ domain: process.env.DOMAIN, name: `Untappd check-ins for ${username}` });
    }

    const calendar = calendars[username];

    // Make a request to the Untappd API for this user's checkins

    const result = await untappd.userActivityFeed({ USERNAME: username });

    // Iterate through checkins and add them all to the calendar object

    console.log(`Untappd API returned ${result.response.checkins.items.length} checkins for ${username}`);

    for (const checkin of result.response.checkins.items) {

      const { created_at, checkin_id, checkin_comment, rating_score, beer, brewery, venue } = checkin;

      // First, check if we've already added a calendar event for this checkin

      if (checkins.includes(checkin_id)) {
        continue;
      }

      checkins.push(checkin_id);

      // Now, create a calendar event for this checkin and add it onto that user's calendar

      const start = new Date(created_at);

      const end = new Date(created_at);
      end.setMinutes(end.getMinutes() + 5);

      const summary = `${beer.beer_name} by ${brewery.brewery_name}`;

      const url = `https://untappd.com/user/${username}/checkin/${checkin_id}`;

      // The description includes the checkin comment, rating, any comments, and toasts

      let description = '';

      if (checkin_comment !== undefined) {

        description = checkin_comment;
      }

      if (rating_score !== undefined && rating_score !== 0) {

        if (description !== '') {
          description += `\n\n`;
        }

        description += `${rating_score}/5`;
      }

      if (checkin.comments !== undefined && checkin.comments.items !== undefined && checkin.comments.items.length > 0) {

        if (description !== '') {
          description += `\n\n`;
        }

        for (const commentItem of checkin.comments.items) {

          const { user, comment } = commentItem;

          const { user_name, first_name, last_name } = user;

          description += `\n${first_name} ${last_name} (@${user_name}): ${comment}`;
        }
      }

      if (checkin.toasts !== undefined && checkin.toasts.items !== undefined && checkin.toasts.items.length > 0) {

        if (description !== '') {
          description += `\n\n`;
        }

        description += `🍻 by `;

        for (const [index, toast] of checkin.toasts.items.entries()) {

          const { user } = toast;
          const { user_name, first_name, last_name } = user;

          description += `${first_name} ${last_name} (${user_name})`;

          if (index !== checkin.toasts.items.length - 1) {
            description += `, `;
          }
        }
      }

      const event = calendar.createEvent({
        uid: checkin_id,
        start,
        end,
        summary,
        description,
        url
      });

      if (venue !== undefined) {

        if (venue.venue_name !== undefined) {

          let location = `${venue.venue_name}`;

          if (venue.location !== undefined && venue.location.venue_address !== undefined) {
            location += `\n${venue.location.venue_address}, ${venue.location.venue_city}, ${venue.location.venue_state} ${venue.location.venue_country}`;
          }

          event.location(location);
        }

        if (venue.location !== undefined && venue.location.lat !== undefined && venue.location.lng !== undefined) {

          event.geo(`${venue.location.lat};${venue.location.lng}`);
        }
      }
    }

    console.log(`Responding with ${calendar.events().length} calendar events for ${username}`);

    calendar.serve(response);

  } catch (e) {

    console.error(`Recieved error:`, e);
    response.status(500).end(`Error - ${e.message}`);
    return;
  }
});

// Handle all other requests
app.all('*', (request, response) => {
  response.status(404).end('404');
});

// Start the server
const server = http.createServer(app).listen(process.env.PORT, () => {

  console.log(`🍻 ${name} ${version} live on port ${process.env.PORT} 👌`);
});

// Output server errors
server.on('error', (error) => {

  console.error('Server error:', error);
});
