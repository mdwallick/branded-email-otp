const httpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

///////////////////////////////////////////////////
// Functions for calling Okta APIS
///////////////////////////////////////////////////
function getUsers(callback) {
  callOktaAPI("/users", "GET", null, (response) => {
    let sorted = response.slice();
    sorted.sort((a, b) => (a.profile.firstName > b.profile.firstName) ? 1 : -1);
    callback(sorted);
    hideLoader();
  });
}

function getUser() {
  let user_id = $(this).data('id');
  console.log("getUser", user_id);
  showLoader();
  callOktaAPI(`/users/${user_id}`, "GET", null, (response) => {
    marhsalToUserForm(response);
  });
}

function createUser() {
  console.log("createUser()");
  hideModal();
  showLoader();

  // get the group ID by name
  let group_name = sessionStorage.getItem("userGroup");
  getGroupByName(group_name, (group_id) => {
    let userProfile = {
      "profile": {
        "login": $("#email_addy").val(),
        "firstName": $("#first_name").val(),
        "lastName": $("#last_name").val(),
        "email": $("#email_addy").val()
      },
      "groupIds": [group_id]
    }

    callOktaAPI("/users?activate=false", "POST", userProfile, (response) => {
      console.log("Created user", response);
      loadUserList();
      alert("User created!");
      hideLoader();
    });
  });
}

function updateUser() {
  let user_id = $('#userId').val();
  console.log("updateUser()", user_id);
  hideModal();
  showLoader();
  let userProfile = {
    "profile": {
      "login": $("#email").val(),
      "firstName": $("#firstName").val(),
      "lastName": $("#lastName").val(),
      "email": $("#email").val(),
      "mobilePhone": $("#phone").val()
    }
  }

  callOktaAPI(`/users/${user_id}`, "POST", userProfile, (response) => {
    console.log("Updted user", response);
    loadUserList();
    alert("User updated!");
    hideLoader();
  });
}

// this isn't used anywhere just yet
function changePassword() {
  console.log("changePassword()");
  let user_id = sessionStorage.getItem("userId");
  let password = prompt("Enter your new password");
  if (password) {
    let userProfile = {
      "profile": {},
      "credentials": {
        "password": { "value": password }
      }
    }

    showLoader();
    callOktaAPI(`/users/${user_id}`, "POST", userProfile, (response) => {
      console.log("Password changed for user", response);
      alert("User password changed!");
      hideLoader();
    });
  }
}

function forgotPassword(user_name) {
  console.log("forgotPassword()", user_name);
  showLoader();
  let body = {
    user_name: user_name
  };

  // call the Okta workflow to activate the user
  callAPI('/forgot-password', 'POST', body, null, (response) => {
    console.log(response);
    hideLoader();
  });
}

function activateUser() {
  let user_id = $(this).data('id');
  console.log("activateUser()", user_id);
  showLoader();
  let body = {
    user_id: user_id
  };

  // call the Okta workflow to activate the user
  callAPI('/activate-user', 'POST', body, null, (response) => {
    console.log(response);
    loadUserList();
    hideLoader();
  });

  // callOktaAPI(`/users/${user_id}/lifecycle/activate?sendEmail=false`, "POST", null, (response) => {
  //   console.log("Activated user", response);
  //   // TODO grab the activation token and send it to the backend to get an email sent
  //   let body = {
  //     email: null,
  //     token: response.activationToken
  //   }
  //   callAPI('/send-activation-email', 'POST', JSON.stringify(body), null, (response) => {
  //     console.log(response);
  //   });
  //   loadUserList();
  //   hideLoader();
  // });
}

function resetPassword() {
  let user_id = $(this).data('id');
  console.log("resetPassword()", user_id);
  showLoader();
  callOktaAPI(`/users/${user_id}/lifecycle/reset_password?sendEmail=false`, "POST", null, (response) => {
    console.log(response);
    loadUserList();
    hideLoader();
  });
}

function suspendUser() {
  let user_id = $(this).data('id');
  console.log("suspendUser()", user_id);
  showLoader();
  callOktaAPI(`/users/${user_id}/lifecycle/suspend`, "POST", null, (response) => {
    console.log(response);
    loadUserList();
    hideLoader();
  });
}

function unsuspendUser() {
  let user_id = $(this).data('id');
  console.log("unsuspendUser()", user_id);
  showLoader();
  callOktaAPI(`/users/${user_id}/lifecycle/unsuspend`, "POST", null, (response) => {
    console.log(response);
    loadUserList();
    hideLoader();
  });
}

function deactivateUser() {
  let user_id = $(this).data('id');
  console.log("deactivateUser()", user_id);
  var msg = 'This operation cannot be undone.\n\nDo you want to continue?';
  if (confirm(msg)) {
    showLoader();
    callOktaAPI(`/users/${user_id}/lifecycle/deactivate?sendEmail=false`, "POST", null, (response) => {
      console.log(response);
      loadUserList();
      hideLoader();
    });
  }
}

function deleteUser() {
  let user_id = $(this).data('id');
  console.log("deleteUser()", user_id);
  showLoader();
  callOktaAPI(`/users/${user_id}?sendEmail=false`, "DELETE", null, (response) => {
    console.log(response);
    loadUserList();
    hideLoader();
  });
}

/////////////////////////
// group functions
/////////////////////////

// this isn't used anywhere just yet
function getGroupList(callback) {
  console.log("getGroupList()");
  callOktaAPI('/groups', "GET", null, (response) => {
    callback(response);
  });
}

function getGroupByName(groupName, callback) {
  console.log("getGroupByName()");
  callOktaAPI(`/groups?q=${groupName}`, "GET", null, (response) => {
    console.log(response);
    let groupId = response[0].id;
    console.log("Got group ID for name:", groupName, groupId);
    callback(groupId);
  });
}

/////////////////////////
// UI helpers
/////////////////////////
function loadUserList() {
  console.log("loadUserList()");
  $('#userListTable').empty()
  showLoader();

  getUsers((userList) => {
    marshalToUserList(userList);
    hideLoader();
  });
}

function marhsalToUserForm(userProfile) {
  console.log("marhsalToUserForm()");
  $("#userId").val(userProfile.id);
  $("#username").val(userProfile.profile.login);
  $("#firstName").val(userProfile.profile.firstName);
  $("#lastName").val(userProfile.profile.lastName);
  $("#email").val(userProfile.profile.email);
  $("#phone").val(userProfile.profile.mobilePhone);
  hideLoader();
  showModal('editUserModal');
}

function marshalToUserList(userList) {
  console.log("marshalToUserList()");
  //console.log("userList", userList);
  buildHtmlTable(userList, '#userListTable');
}

// Builds the HTML Table out of data.
function buildHtmlTable(data, selector) {
  addAllColumnHeaders(selector);
  var currentUserId = sessionStorage.getItem("userId");

  for (var i = 0; i < data.length; i++) {
    //console.log("data", data[i]);
    var row$ = $('<tr/>');
    var user_id = data[i].id;
    var user_status = data[i].status;
    var full_name = `${data[i].profile.firstName} ${data[i].profile.lastName}`;
    var email = data[i].profile.email;
    var phone = data[i].profile.mobilePhone;

    var edit_link = $('<a/>').attr('href', '#').attr('data-id', user_id).text(full_name).click(getUser);

    var activate_button = $('<button/>')
      .attr('class', 'activate')
      .attr('data-id', user_id)
      .text('Activate').click(activateUser);

    var reset_password_button = $('<button/>')
      .attr('class', 'resetpw')
      .attr('data-id', user_id)
      .text('Reset Password')
      .click(resetPassword);

    var suspend_button = $('<button/>')
      .attr('class', 'suspend')
      .attr('data-id', user_id)
      .text('Suspend')
      .click(suspendUser);

    var unsuspend_button = $('<button/>')
      .attr('class', 'unsuspend')
      .attr('data-id', user_id)
      .text('UnSuspend').click(unsuspendUser);

    var deactivate_button = $('<button/>')
      .attr('class', 'deactivate')
      .attr('data-id', user_id)
      .text('Deactivate')
      .click(deactivateUser);

    var delete_button = $('<button/>')
      .attr('class', 'delete')
      .attr('data-id', user_id)
      .text('Delete')
      .click(deleteUser);

    row$.append($('<td/>').html(edit_link));
    row$.append($('<td/>').html(email));
    row$.append($('<td/>').html(phone));
    row$.append($('<td/>').html(user_status));

    cell$ = $("<td/>");
    if (currentUserId != user_id) {
      switch (user_status) {
        case "ACTIVE":
          cell$.append(reset_password_button).append(suspend_button).append(deactivate_button);
          break;
        case "SUSPENDED":
          cell$.append(unsuspend_button).append(deactivate_button);
          break;
        case "STAGED":
          cell$.append(activate_button).append(deactivate_button);
          break;
        case "DEPROVISIONED":
          cell$.append(delete_button);
          break;
      }
    } else {
      cell$.append(reset_password_button);
    }
    row$.append(cell$);
    $(selector).append(row$);
  }
}

// Adds a header row to the table and returns the set of columns.
// Need to do union of keys from all records as some records may not contain
// all records.
function addAllColumnHeaders(selector) {
  var headerTr$ = $('<tr/>');
  headerTr$.append($('<th/>').html('Name'));
  headerTr$.append($('<th/>').html('Email'));
  headerTr$.append($('<th/>').html('Phone'));
  headerTr$.append($('<th/>').html('Status'));
  headerTr$.append($('<th/>').html('Actions'));
  $(selector).append(headerTr$);
}

///////////////////////////////////////////////////
// API helpers
///////////////////////////////////////////////////
function callOktaAPI(url, method, body, callback) {
  console.log("callOktaAPI()");
  httpCaller(url, method, body, (response, status) => {
    if (status == httpStatus.OK || status == httpStatus.NO_CONTENT) {
      let res = handleResponse(response, status);
      callback(res);
    } else {
      handleError(response, status);
    }
  });
}

function httpCaller(url, method, body, callback) {
  console.log("httpCaller()", url);
  let fullURL = oktaApiServicesBaseURL + url;
  console.log("fullURL", fullURL);
  console.log("body", body);

  const httpRequest = new XMLHttpRequest();
  httpRequest.open(method, fullURL);

  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState == 4) {
      //console.log("responseText", httpRequest.responseText);
      callback(httpRequest.responseText, httpRequest.status);
    }
  }

  httpRequest.setRequestHeader("Access-Control-Allow-Origin", "*");
  httpRequest.setRequestHeader("Content-Type", "application/json");
  httpRequest.responseType = "text";

  oktaApiAuthClient.tokenManager.get('accessToken').then(token => {
    if (token && !oktaApiAuthClient.tokenManager.hasExpired(token)) {
      // Token is valid
      httpRequest.setRequestHeader("Authorization", `Bearer ${token.accessToken}`);
      httpRequest.send(JSON.stringify(body));
    } else {
      console.log("No valid Okta API access token in storage");
    }
  });
}

function handleResponse(response, status) {
  try {
    // try to parse the response into JSON
    if (status == httpStatus.OK) {
      let res = JSON.parse(response);
      return res;
    } else {
      handleError(response, status);
    }
  } catch (err) {
    console.log("Error", err);
    console.log("Response is not JSON. Status code:", status);
    console.log(response);
  }
}

function handleError(response, status) {
  try {
    // try to parse the response into JSON
    let res = JSON.parse(response);
    console.log("Error", status);
    console.log(res);
    var msg = `Error code: ${res.errorCode}\nSummary: ${res.errorSummary}`;
    alert(msg);
  } catch (err) {
    console.log("Response is not JSON. Status code:", status);
    console.log(response);
  } finally {
    hideLoader();
  }
}

function getOktaApiToken() {
  console.log("getOktaApiToken()");
  // use the oktaApiAuthClient to get an Okta API OAuth token for the current user
  signIn.authClient.session.exists().then(exists => {
    // session exists
    if (exists) {
      oktaApiAuthClient.token.getWithoutPrompt({
        responseType: ['token'],
        scopes: okta_api_scopes
      }).then(res => {
        var tokens = res.tokens;
        // Do something with tokens, such as
        oktaApiAuthClient.tokenManager.setTokens(tokens);
        //console.log("API access token", tokens.accessToken);
        showApiAccessToken(tokens.accessToken.accessToken);
      }).catch(err => {
        console.log(err);
      });
    } else {
      console.log("I'm logged in, but my session is not active?");
    }
  });
}
