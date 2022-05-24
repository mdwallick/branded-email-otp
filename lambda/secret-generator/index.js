const speakeasy = require("speakeasy");
const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient({ region: process.env.REGION });

exports.handler = async(event) => {
  let email = event.email;
  let user_id = event.user_id;

  if (!email || !user_id) {
    let error_message = "'email' and 'user_id' are required.";
    console.error(error_message);
    const response = {
      statusCode: 400, // http 400, bad request
      error: error_message
    };
    return response;
  }

  try {
    let shared_secret = getSharedSecret();
    await putRecord(email, user_id, shared_secret);
    const response = {
      statusCode: 200,
      secret: shared_secret
    };
    return response;
  } catch (err) {
    const response = {
      statusCode: 200,
      secret: "",
      error: err
    };
    return response;
  }
};

function getSharedSecret() {
  const options = {
    length: 64
  }
  let shared_secret = speakeasy.generateSecret(options).base32;
  return shared_secret;
}

async function putRecord(email, user_id, secret) {
  console.log("putRecord()");
  const params = {
    Item: {
      "email": email,
      "id": user_id,
      "sharedSecret": secret
    },
    TableName: process.env.TABLE_NAME
  };

  await docClient.put(params).promise()
    .then(data => console.log(data))
    .catch(console.error);
}
