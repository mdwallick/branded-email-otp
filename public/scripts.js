function callAPI(url, method, body, accessToken, callback) {
  console.log("callAPI()", url);

  let fullURL = apiServicesBaseURL + url;
  console.log("fullURL", fullURL);
  console.log("body", body);

  const httpRequest = new XMLHttpRequest();
  httpRequest.open(method, fullURL);

  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState == 4) {
      console.log(httpRequest.responseText);
      callback(httpRequest.responseText);
    }
  }

  httpRequest.setRequestHeader("Access-Control-Allow-Origin", "*");
  httpRequest.setRequestHeader("Content-Type", "application/json");
  httpRequest.responseType = "text";

  if (accessToken) {
    httpRequest.setRequestHeader("Authorization", "Bearer " + accessToken);
  }

  httpRequest.send(JSON.stringify(body));
}

/* All support JS goes here */
function sendEmailOTP(username) {
  console.log("sendEmailOTP()");
  let body = {
    "username": username
  }
  callAPI('/send-email-challenge', "POST", body, null, (json) => {
    console.log(JSON.parse(json));
  });
}

/* Challenge 2: Protect The API Calls */
function handlePublicAPICall() {
  console.log("handlePublicAPICall()");
  callAPI('/public', "GET", null, null, (json) => {
    $("#apiResultsDisplay").html(JSON.stringify(JSON.parse(json), null, 4));
  });
}

function handlePrivateAPICall() {
  console.log("handlePrivateAPICall()");
  signIn.authClient.tokenManager.get("accessToken").then(token => {
    callAPI('/private', "GET", null, token.accessToken, (json) => {
      $("#apiResultsDisplay").html(JSON.stringify(JSON.parse(json), null, 4));
    });
  });
}

function handleAccessAPICall() {
  console.log("handleAccessAPICall()");
  signIn.authClient.tokenManager.get("accessToken").then(token => {
    callAPI('/access', "GET", null, token.accessToken, (json) => {
      $("#apiResultsDisplay").html(JSON.stringify(JSON.parse(json), null, 4));
    });
  });
}

// sign in helpers
function checkAndShowIdToken() {
  console.log("checkAndShowIdToken()");
  signIn.authClient.tokenManager.get("idToken").then(token => {
    // check to see if the token is valid
    signIn.authClient.token.verify(token).then(() => {
        // the idToken is valid
        console.log("Token is Valid!");
        //console.log(token);
        var decoded_jwt = jwt_decode(token.idToken);
        decoded_jwt = JSON.stringify(decoded_jwt, null, 4);
        $("#idTokenDisplay").html(decoded_jwt);
        showAccessToken();
        showLoggedInStuff();
        $("#showIdTokenTabBtn").addClass("active").trigger("click");
      })
      .catch(err => {
        console.log("Token is not valid!", err);
        showNotLoggedInStuff();
      });
  })
  .catch(err => {
    console.log("Unable to retrieve idToken from local storage", err);
    showNotLoggedInStuff();
  });
}

function showAccessToken() {
  console.log("showAccessToken()");
  signIn.authClient.tokenManager.get("accessToken").then(token => {
    $("#accessTokenDisplay").html(JSON.stringify(jwt_decode(token.accessToken), null, 4));
  }).catch(err => {
    console.log("Unable to retrieve accessToken from local storage", err);
  });
}

function showApiAccessToken(token) {
  console.log("showApiAccessToken()");
  $("#apiAccessTokenDisplay").html(JSON.stringify(jwt_decode(token), null, 4));
}

function showNotLoggedInStuff() {
  console.log("showNotLoggedInStuff()");
  // Show login stuff
  signIn.show();
  $("#signin-header").show();

  // Hide post login stuff
  $("#okta-post-login-container").hide();
}

function showLoggedInStuff() {
  console.log("showLoggedInStuff()");
  // Hide login stuff
  signIn.hide();
  $("#signin-header").hide();

  // Show post login stuff
  $("#okta-post-login-container").show();

  // check the user's role, and show the user admin stuff if the right role is present
  signIn.authClient.tokenManager.get("idToken").then(token => {
    var role = token.claims.funAuthRole;
    if (role == "ADMIN") {
      getOktaApiToken();
      $("#showUserListTabBtn").show();
      $("#showApiAccessTokenTabBtn").show();
    }
  })
  .catch(err => {
    console.log("Error", err);
  });
}

function hasSession() {
  signIn.authClient.session.exists().then(exists => {
    console.log("Session exists", exists);
    alert(`Session exists? ${exists}`);
  });
}

function signOut() {
  console.log("signOut()");
  signIn.authClient.signOut({
    clearTokensBeforeRedirect: true
  });
  // kill the Okta API token as well
  oktaApiAuthClient.revokeAccessToken();
}

/* UX helpers */
function showLoader() {
  $("body").addClass("loading");
}

function hideLoader() {
  $("body").removeClass("loading");
}

function showModal(modalId) {
  currentModalId = $(`#${modalId}`);
  currentModalId.show();
}

function hideModal() {
  // When the user clicks on <span> (x), close the modal
  currentModalId.hide();
}

function openTokenTab(evt, tabName) {
  // Get all elements with class="tabcontent" and hide them
  $(".tabcontent").hide();

  // Get all elements with class="tablinks" and remove the class "active"
  $(".tablinks").removeClass("active");

  // Show the current tab, and add an "active" class to the button that opened the tab
  $(`#${tabName}`).show();
  $(evt.currentTarget).addClass("active");

  // if it's the user management tab, refresh the user list
  if (tabName == "userListTab") {
    loadUserList();
  }
}

// This is for formatting the JWT display
function jwt_decode(token) {
  try {
    var payload = token.split(".")[1]; // <header>.<payload>.<signature>
    var jwt_string = atob(payload); // base64 encoded text to a plain string
    var jwt = JSON.parse(jwt_string);
    return jwt;
    //return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    // return an empty JSON object
    return {};
  }
}
