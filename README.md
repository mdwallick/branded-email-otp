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

1. Clone this repo and install the necessary Node packages

    ```bash
    git clone https://github.com/mdwallick/branded-email-otp.git && cd branded-email-otp
    npm install
    ```

2. Create a new Custom OTP authenticator with the following settings. This will
    be moved to the Terraform setup script once the "custom_otp" authenticator
    type is supported.

    * Authenticator Name: Branded Email OTP (or whatever you want shown on the
    widget)

    * HMAC algorithm: HMacSHA512

    * Time step: 30 seconds

    * Clock drift interval: 3

    * Shared secret encoding: Base32

    ![Custom OTP settings](https://s3.us-east-2.amazonaws.com/images.thoraxstudios.com/Custom+OTP+authenticator+scaled.png)

    Once you save the authenticator, click "Actions" then choose "Authenticator ID &
    Info" and make note of the Authenticator ID value. You'll need that for the
    next step.

3. Import the "customEmailDelivery.folder" file from the workflows folder into
    your tenant's workflows console.

4. Go to your workflows connections page and fix all the connections: Okta Org,
    Sendgrid and AWS credentials for Lamba functions.

5. Edit the Enroll custom email OTP workflow and put the authenticator ID value
    in the workflow card immediately to the right of the note.

    ![Worlflow card](https://s3.us-east-2.amazonaws.com/images.thoraxstudios.com/Workflow+factorProfileId+card+scaled.png)

6. Set up terraform

    ```bash
    cd terraform
    cp terraform.tfvars.sample terraform.tfvars
    ```

    Edit terraform.tfvars and fill in your Okta tenant details

    ```bash
    org_name        = "<okta_subdomain, e.g. atko>"
    base_url        = "<the okta domain  e.g. oktapreview.com, okta.com, or okta-emea.com>"
    api_token       = "<okta_api_token>"
    ```

    Run terraform to create all the necessary Okta objects

    ```bash
    make all
    ```

7. Set up the AWS DynamoDB for storing the shared secrets

    ```bash
    cd lambda
    make database
    ```

    Make note of the table's ARN (`TableArn` below). You'll need that later.

    ```json
    {
        "TableDescription": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "email",
                    "AttributeType": "S"
                }
            ],
            "TableName": "test-table",
            "KeySchema": [
                {
                    "AttributeName": "email",
                    "KeyType": "HASH"
                }
            ],
            "TableStatus": "CREATING",
            "CreationDateTime": "2022-05-25T10:50:21.659000-05:00",
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 1,
                "WriteCapacityUnits": 1
            },
            "TableSizeBytes": 0,
            "ItemCount": 0,
            "TableArn": "arn:aws:dynamodb:us-east-2:<AWS ACCOUNT NUMBER>:table/custom-email-otp",
            "TableId": "5df7274e-32b9-44dc-bb34-f18287d9d387",
            "TableClassSummary": {
                "TableClass": "STANDARD"
            }
        }
    }
    ```

8. Go to AWS IAM and create a new policy to allow your Lambda functions access
    to the DynamoDB. The ARN from the previous step is what you put into the
    "Resource" value.

    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "dynamodb:DeleteItem",
                    "dynamodb:GetItem",
                    "dynamodb:PutItem"
                ],
                "Resource": [
                    "arn:aws:dynamodb:<AWS REGION>:<AWS ACCOUNT NUMBER>:table/custom-email-otp"
                ]
            }
        ]
    }
    ```

9. Attach the new policy to each Lambda's IAM execution role. There will be
    three roles, one for each Lambda. If there's a better way to do this in
    order to automate deployment, I'd love to hear about it. I'm not an
    AWS IAM expert by any stretch.
