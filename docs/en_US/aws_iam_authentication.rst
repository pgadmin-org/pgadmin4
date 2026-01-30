.. _aws_iam_authentication:

*******************************************
`AWS IAM Database Authentication`:index:
*******************************************

**Prerequisite:** AWS account with RDS/Aurora PostgreSQL and IAM configuration

Reference: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html

pgAdmin supports AWS IAM Database Authentication for connecting to Amazon RDS
and Aurora PostgreSQL databases. This feature allows you to authenticate using
AWS IAM credentials instead of a database password, providing enhanced security
through temporary authentication tokens.

How It Works
============

When IAM authentication is enabled:

1. pgAdmin generates a temporary authentication token using your AWS credentials
2. The token is valid for 15 minutes and is automatically refreshed as needed
3. SSL/TLS is automatically enforced (required by AWS for IAM authentication)
4. No database password needs to be stored or transmitted

Prerequisites
=============

Before using IAM authentication with pgAdmin, ensure the following:

AWS RDS/Aurora Configuration
----------------------------

* IAM Database Authentication must be enabled on your RDS instance or Aurora cluster
* A database user must be created and granted the ``rds_iam`` role:

  .. code-block:: sql

     CREATE USER your_username WITH LOGIN;
     GRANT rds_iam TO your_username;

* An IAM policy must allow the ``rds-db:connect`` action for the database user

  .. code-block:: json

     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "rds-db:connect",
           "Resource": "arn:aws:rds-db:region:account-id:dbuser:resource-id/db-user-name"
         }
       ]
     }

Local AWS Configuration
-----------------------

* AWS credentials must be configured on the machine running pgAdmin
* Credentials can be provided via:

  * AWS credentials file (``~/.aws/credentials``)
  * Environment variables (``AWS_ACCESS_KEY_ID``, ``AWS_SECRET_ACCESS_KEY``)
  * IAM role (when running on EC2/ECS/Lambda)

* The ``botocore`` Python package must be installed (included with pgAdmin)

Configuring IAM Authentication in pgAdmin
=========================================

To connect to a PostgreSQL server using IAM authentication:

1. Open the *Server* dialog (right-click on *Servers* and select *Register* > *Server*)
2. In the *Connection* tab:

   * Set *Host name/address* to your RDS/Aurora endpoint
   * Set *Port* to the database port (default: 5432)
   * Set *Maintenance database* to the database name
   * Set *Username* to the IAM-enabled database user
   * Enable *AWS IAM authentication*
   * Leave the *Password* field empty

3. Configure the AWS-specific fields:

   * *AWS Profile*: (Optional) The AWS profile name from your credentials file.
     Leave empty to use the default profile or environment credentials.
   * *AWS Region*: The AWS region where your RDS/Aurora instance is located
     (e.g., ``us-east-1``, ``eu-west-1``).

4. Click *Save* to store the server configuration

Connection Behavior
===================

When connecting with IAM authentication:

* pgAdmin automatically generates a fresh IAM authentication token
* If the connection fails due to an expired token, pgAdmin will automatically
  retry with a new token
* SSL mode is automatically set to ``require`` if not explicitly configured
* You will not be prompted for a password

Troubleshooting
===============

**Connection fails with "PAM authentication failed"**

* Verify the database user has the ``rds_iam`` role granted
* Ensure the IAM policy allows the ``rds-db:connect`` action
* Check that the AWS region is correctly configured

**Token generation fails**

* Verify AWS credentials are properly configured
* Check that the AWS profile name (if specified) exists in your credentials file
* Ensure the machine has network access to AWS STS endpoints

**SSL connection required**

* IAM authentication requires SSL. pgAdmin automatically enables SSL mode,
  but ensure your RDS instance has SSL enabled and the client can establish
  secure connections.

Limitations
===========

* IAM authentication tokens expire after 15 minutes. pgAdmin handles token
  refresh automatically, but very long-running idle connections may need
  to reconnect.
* This feature requires the ``botocore`` Python package.
* IAM authentication is only supported for Amazon RDS and Aurora PostgreSQL,
  not for self-hosted PostgreSQL servers.

