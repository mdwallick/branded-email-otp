const express = require('express');
const cors = require('cors');
const apiHandler = require('./apiHandler.js');
const oktaHandler = require('./oktaHandler');

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

//
// funAuth API methods
//
app.get('/', (req, res) => {
  res.send('This is the funAuth API');
});

app.get('/api/public', (req, res) => {
  apiHandler.handlePublic(req, res);
});

app.get('/api/private', (req, res) => {
  apiHandler.handlePrivate(req, res);
});

app.get('/api/access', (req, res) => {
  apiHandler.handleAccess(req, res);
});

app.post('/api/access-hook', (req, res) => {
  apiHandler.handleTokenHook(req, res);
});

app.post('/api/send-email-challenge', (req, res) => {
  oktaHandler.handleEmailChallenge(req, res);
});

app.get('/api/user-idps/:username', (req, res) => {
  oktaHandler.handleIDPLookup(req, res);
});

// TODO finish this
app.post('/api/activate-user', (req, res) => {
  oktaHandler.handleActivateUser(req, res);
});

// TODO finish this
app.post('/api/forgot-password', (req, res) => {
  oktaHandler.handleForgotPassword(req, res);
});

app.listen(port, () => console.log(`funAuth app listening on port ${port}!`));
