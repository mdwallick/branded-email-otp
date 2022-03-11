const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient({ region: process.env.REGION });

exports.handler = async(event) => {
  let email = event.email;
  let template_id = event.template_id;

  if (!email || !template_id) {
    let error_message = "'email' and 'template_id' are required.";
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
    await sendEmail(email, template_id, token);
    const response = {
      statusCode: 200,
      message: `Sent OTP email to ${email}`
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

async function sendEmail(email, template_id, token) {
  const mailer = require('@sendgrid/mail');
  mailer.setApiKey(process.env.EMAIL_API_KEY);
  let mail_from = SENDER_MAP[template_id];
  let msg = {
    from: mail_from,
    template_id: template_id,
    personalizations: [{
      to: { email: email },
      dynamic_template_data: {
        verificationToken: token
      }
    }]
  };

  try {
    // just send the message
    console.log('sending message', msg);
    await mailer.send(msg);
    console.log('message sent');
  } catch (error) {
    console.error('Error sending email');
    console.error(error);
    if (error.response) {
      console.error(error.response.body)
    }
  }
}

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

let SENDER_MAP = {
  'd-0c6a0785b3b548a5a5ece75856dfb961': 'Anthem Demo<noreply@anthem-poc.com>',
  'd-261b61f7d890439fb610a7ea41f05905': 'Unicare Demo<noreply@unicare-poc.com>',
  'd-970d1b91266140f998302b2dd260faef': 'Thorax Studios<noreply@thorax.studio>'
};
