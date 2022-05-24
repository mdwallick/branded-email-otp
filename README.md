# branded-email-otp

Self-contained Node server, SPA client, Okta workflows and AWS lambda
functions to demonstrate multi-branded email OTP

## Prerequisites

* An OIE-enabled Okta tenant

* An AWS Account

* A free [Sendgrid](https://signup.sendgrid.com/) account for sending emails

* Command line interfaces for running/deploying
  * Node/NPM
  * AWS CLI
  * Terraform

## Set Up

Clone this repo and install the necessary Node packages

```bash
git clone https://github.com/mdwallick/branded-email-otp.git && cd branded-email-otp
npm install
```

1. Create a new Custom OTP authenticator with the following settings:
    * Authenticator Name: whatever you want shown on the sign in widget

    * HMAC algorithm: HMacSHA512

    * Time step: 30 seconds

    * Clock drift interval: 3

    * Shared secret encoding: Base32

    ![Custom OTP settings](https://s3.us-east-2.amazonaws.com/images.thoraxstudios.com/Custom+OTP+authenticator+scaled.png)

    Once you save the authenticator, click "Actions" then choose "Authenticator ID &
    Info" and make note of the Authenticator ID value. You'll need that for the
    next step.

2. Import the "customEmailDelivery.folder" file from the workflows folder into
your tenant's workflows console.

3. Go to your connections page and fix all the connections: Okta Org, Sendgrid and AWS credentials for Lamba functions.

4. Edit the Enroll custom email OTP workflow and put the authenticator ID value
in the workflow card immediately to the right of the note.

    ![Worlflow card](https://s3.us-east-2.amazonaws.com/images.thoraxstudios.com/Workflow+factorProfileId+card+scaled.png)

5. Run terraform to create all the necessary Okta objects.

6. Set up the AWS DynamoDB for storing the shared secrets

    ```bash
    cd lambda
    make database
    ```

    Make note of the new table's ARN. You'll need that later.

    ![Dynamodb create result](https://s3.us-east-2.amazonaws.com/images.thoraxstudios.com/Dynamodb+create+sample+scaled.png)

7. Go to AWS IAM and create a new policy to allow your Lambda functions access to the DynamoDB

8. Attach the policy to each Lambda IAM execution role
