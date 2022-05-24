const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient({ region: process.env.REGION });

exports.handler = async(event) => {
  let email = event.email;

  if (!email) {
    let error_message = "'email' is required.";
    console.error(error_message);
    const response = {
      statusCode: 400, // http 400, bad request
      error: error_message
    };
    return response;
  }

  try {
    let user = await getRecord(email);
    let shared_secret = user.Item.sharedSecret;
    let token = generateOTP(shared_secret);
    const response = {
      statusCode: 200,
      token: token
    };
    return response;
  } catch (error) {
    const response = {
      statusCode: 200,
      error: error
    };
    return response;
  }
};

function generateOTP(shared_secret) {
  let totp = require("totp-generator");
  let params = { algorithm: "SHA-512", period: 30 };
  let token = totp(shared_secret, params);
  return token;
}

async function getRecord(email) {
  console.log("getRecord()");
  const params = {
    Key: {
      "email": email
    },
    TableName: process.env.TABLE_NAME
  };
  return await docClient.get(params).promise();
}
