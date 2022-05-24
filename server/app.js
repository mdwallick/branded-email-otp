const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const queryString = require('query-string');
const XMLHttpRequest = require("xhr2").XMLHttpRequest;
const OktaJwtVerifier = require('@okta/jwt-verifier');

const oktaJwtVerifier = new OktaJwtVerifier({
  issuer: process.env.ISSUER
});

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('This is the funAuth API');
});

app.get('/api/public', (req, res) => {
  console.log("handlePublicEndpoint()");

  let results = {
    "success": true,
    "message": "This is the Public API, Anyone can request this"
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(results));
});

app.get('/api/private', (req, res) => {
  console.log("handlePrivateEndpoint()");

  let auth = req.get('Authorization');
  let accessTokenString = "";
  let results = {};

  res.setHeader('Content-Type', 'application/json');

  if (auth) {
    accessTokenString = auth.replace("Bearer ", "");
  }

  oktaJwtVerifier.verifyAccessToken(accessTokenString, process.env.AUDIENCE)
    .then(jwt => {
      // the token is valid (per definition of 'valid' above)
      console.log(jwt.claims);
      results = {
        "success": true,
        "message": "This is the private API, Only a valid Okta JWT with a corresponding auth server can see this"
      }

      res.end(JSON.stringify(results));
    })
    .catch(err => {
      // a validation failed, inspect the error
      console.log(err);
      results = {
        "success": false,
        "message": "This is the private API and the token is invalid!"
      }

      res.status(403);
      res.end(JSON.stringify(results));
    });
});

app.get('/api/access', (req, res) => {
  console.log("handleAccessEndpoint()");

  let auth = req.get('Authorization');
  let accessTokenString = "";
  let results = {};

  res.setHeader('Content-Type', 'application/json');

  if (auth) {
    accessTokenString = auth.replace("Bearer ", "");
  }

  oktaJwtVerifier.verifyAccessToken(accessTokenString, process.env.AUDIENCE)
    .then(jwt => {
      // the token is valid (per definition of 'valid' above)
      console.log(jwt.claims);

      if (jwt.claims["access"] == "GRANTED") {
        results = {
          "success": true,
          "message": "This is the private API that requires a specific role to access, Only a valid Okta JWT with the correct claims and a corresponding auth server can see this"
        }
      } else {
        results = {
          "success": false,
          "message": "This is the access API that requires a specific role to access, 'access' claim is missing the 'GRANTED' value."
        }
      }

      res.end(JSON.stringify(results));
    })
    .catch(err => {
      // a validation failed, inspect the error
      console.log(err);

      results = {
        "success": false,
        "message": "This is the access API and the token is invalid!"
      }
      
      res.status(403);
      res.end(JSON.stringify(results));
    });
  });

app.post('/api/access-hook', (req, res) => {
  //console.log("auth: " + auth + " config.OKTA_HOOK_AUTH: " + config.OKTA_HOOK_AUTH);
  let auth = req.get("Authorization");
  let results = {}

  if (auth == process.env.OKTA_HOOK_AUTH) {
    results = {
      "commands": [{
          "type": "com.okta.identity.patch",
          "value": [{
            "op": "add",
            "path": "/claims/account_number",
            "value": "F0" + between(1000, 9999) + "-" + between(1000, 9999)
          }]
        },
        {
          "type": "com.okta.access.patch",
          "value": [{
            "op": "add",
            "path": "/claims/access",
            "value": "GRANTED"
          }]
        }
      ]
    };
  } else {
    results = {
      "success": false,
      "message": "Requires Auth to call this hook."
    }
    res.status(403);
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(results));
});

app.post('/api/send-email-challenge', (req, res) => {
  console.log("/api/send-email-challenge");
  let email = req.body.username;
  let template_id = 'd-970d1b91266140f998302b2dd260faef'; // default to thorax.studio brand
  if (email == 'gordon.sumner@mailinator.com') {
    template_id = 'd-0c6a0785b3b548a5a5ece75856dfb961'; // Anthem template
  } else if (email == 'andy.summers@mailinator.com') {
    template_id = 'd-261b61f7d890439fb610a7ea41f05905'; // Unicare template
  }

  let body = {
    "email": email,
    "template_id": template_id
  };
  let workflowId = process.env.WORKFLOW_SEND_OTP_ID;
  let workflowToken = process.env.WORKFLOW_SEND_OTP_CLIENT_TOKEN;
  callOktaWorkflow(workflowId, workflowToken, body, (response) => {
    console.log(response);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response));
  });
});

app.post('/api/activate-user', (req, res) => {
  console.log('/api/activate-user');
  let user_id = req.body.user_id;
  let body = {
    user_id: user_id,
    template_id: process.env.ACTIVATION_TEMPLATE_ID
  }
  let workflowId = process.env.WORKFLOW_ACTIVATE_USER_ID;
  let workflowToken = process.env.WORKFLOW_ACTIVATE_USER_CLIENT_TOKEN;
  callOktaWorkflow(workflowId, workflowToken, body, (response) => {
    console.log(response);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response));
  });
});

app.post('/api/forgot-password', (req, res) => {
  console.log('/api/forgot-password');
  let user_name = req.body.user_name;
  let body = {
    user_name: user_name,
    template_id: process.env.SSPR_TEMPLATE_ID
  }
  let workflowId = process.env.WORKFLOW_SSPR_ID;
  let workflowToken = process.env.WORKFLOW_SSPR_CLIENT_TOKEN;
  callOktaWorkflow(workflowId, workflowToken, body, (response) => {
    console.log(response);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response));
  });
});

app.get('/api/user-idps/:username', (req, res) => {
  console.log('/api/user-idps');
  let user_name = req.params.username;
  getUser(user_name, (response) => {
    res.setHeader('Content-Type', 'application/json');
    let user = JSON.parse(response);
    let idp_ids = user.profile.user_idps || [];
    res.end(JSON.stringify(idp_ids));
  });
});

app.listen(port, () => console.log(`funAuth app listening on port ${port}!`));

//////////////////////
// helper functions //
//////////////////////
function between(minimum, maximum) {
  return Math.floor(
    Math.random() * (maximum - minimum) + minimum
  )
}

/////////////////////////////////////
// Okta API stuff, not user-scoped //
/////////////////////////////////////
const OKTA_API_HEADERS = [
  { "key": "Content-Type", "value": "application/json" },
  { "key": "Accept", "value": "application/json" },
  { "key": "Authorization", "value": "Bearer " }
];

const OKTA_OAUTH_HEADERS = [
  { "key": "Content-Type", "value": "application/x-www-form-urlencoded" },
  { "key": "Accept", "value": "application/json" }
];

const OKTA_WORKFLOWS_HEADERS = [
  { "key": "Content-Type", "value": "application/json" },
  { "key": "Accept", "value": "application/json" },
  { "key": "x-api-client-token", "value": "" }
];

function getUser(userId, callback) {
  console.log("getUser()");
  let okta_url = process.env.OKTA_ORG_URL;
  console.log(okta_url);
  let url = `${okta_url}/api/v1/users/${userId}`;
  callOktaAPI(url, "GET", null, callback);
}

function callOktaAPI(url, method, body, callback) {
  console.log("callOktaAPI()", url);
  let scopes = 'okta.users.read okta.apps.read';
  getOktaAPIOAuthToken(scopes, (oAuthResponse) => {
    OKTA_API_HEADERS[2].value = `Bearer ${oAuthResponse}`;
    httpCaller(url, method, body, OKTA_API_HEADERS, callback);
  });
}

function callOktaWorkflow(flowId, workflowClientToken, body, callback) {
  console.log("callOktaWorkflow");
  console.log("flowId", flowId);
  console.log("workflowClientToken", workflowClientToken);
  console.log("body", body);

  OKTA_WORKFLOWS_HEADERS[2].value = workflowClientToken;
  let url = `${process.env.OKTA_WORKFLOW_API_BASE}/${flowId}/invoke`;
  httpCaller(url, "POST", JSON.stringify(body), OKTA_WORKFLOWS_HEADERS, callback);
}

// May want to adjust this to cache the token and refresh it when expired...
// no need to always get a token for every request
function getOktaAPIOAuthToken(scopes, callBack) {
  console.log("getOktaAPIOAuthToken");
  let signedJwt = createClientCredentialJwt();
  let url = `${process.env.OKTA_ORG_URL}/oauth2/v1/token`;
  let body = {
    "grant_type": "client_credentials",
    "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    "client_assertion": signedJwt,
    "scope": scopes
  }
  body = queryString.stringify(body);

  httpCaller(url, "POST", body, OKTA_OAUTH_HEADERS, (oAuthResponse) => {
    //console.log("oAuthResponse", oAuthResponse);
    let accessToken = JSON.parse(oAuthResponse).access_token
    callBack(accessToken);
  });
}

function createClientCredentialJwt() {
  let signedJwtPayload = {
    "aud": `${process.env.OKTA_ORG_URL}/oauth2/v1/token`,
    "iss": process.env.OKTA_API_CLIENT_ID,
    "sub": process.env.OKTA_API_CLIENT_ID,
    "exp": Math.floor(Date.now() / 1000) + (60 * 60)
  }
  let privateKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
  let signedJwt = jwt.sign(signedJwtPayload, privateKey, { algorithm: 'RS256' });
  return signedJwt;
}

function httpCaller(url, method, body, headers, callback) {
  //console.log("httpCaller()", url);
  const httpRequest = new XMLHttpRequest();
  httpRequest.open(method, url);

  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState == 4) {
      //console.log("httpRequest.responseText", httpRequest.responseText);
      callback(httpRequest.responseText);
    }
  }

  if (headers) {
    for (let itemIndex in headers) {
      httpRequest.setRequestHeader(headers[itemIndex].key, headers[itemIndex].value);
    }
  }

  httpRequest.responseType = "text";

  if (body) {
    httpRequest.send(body);
  } else {
    httpRequest.send();
  }
}
