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
    await deleteRecord(email);
    const response = {
      statusCode: 200,
      message: `Deleted shared secret for ${email}`
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

async function deleteRecord(email) {
  console.log("deleteRecord()");
  const params = {
    Key: {
      "email": email
    },
    TableName: process.env.TABLE_NAME
  };
  return await docClient.delete(params).promise();
}
