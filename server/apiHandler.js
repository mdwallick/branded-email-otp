//
// funAuth API endpoint handlers
//
const OktaJwtVerifier = require('@okta/jwt-verifier');
const oktaJwtVerifier = new OktaJwtVerifier({
  issuer: process.env.ISSUER
});

function between(minimum, maximum) {
  return Math.floor(
    Math.random() * (maximum - minimum) + minimum
  )
}

module.exports = {

  handlePublic: function(req, res) {
    console.log("handlePublicEndpoint()");
    let results = {
      "success": true,
      "message": "This is the Public API, Anyone can request this"
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  },

  handlePrivate: function(req, res) {
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
  },

  handleAccess: function(req, res) {
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
  },

  handleTokenHook: function(req, res) {
    let auth = req.get("Authorization");
    console.log("auth: " + auth + " process.env.OKTA_HOOK_AUTH: " + process.env.OKTA_HOOK_AUTH);
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
  }

};
