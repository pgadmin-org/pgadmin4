##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""AWS IAM Authentication Module

This module provides functionality for generating AWS RDS/Aurora IAM
authentication tokens for database connections.
"""

import logging
from flask_babel import gettext

try:
    import botocore.session
    from botocore.exceptions import BotoCoreError, ClientError, \
        NoCredentialsError, PartialCredentialsError
    BOTOCORE_AVAILABLE = True
except ImportError:
    BOTOCORE_AVAILABLE = False

_ = gettext


def generate_rds_auth_token(host, port, username, region, profile=None,
                              role_arn=None):
    """
    Generate an AWS RDS IAM authentication token.

    Args:
        host (str): The hostname of the database server
        port (int): The port number of the database server
        username (str): The database username to authenticate as
        region (str): The AWS region where the database is located
        profile (str, optional): The AWS profile name to use for credentials
        role_arn (str, optional): The ARN of an IAM role to assume (future)

    Returns:
        str: The generated authentication token (valid for 15 minutes)

    Raises:
        Exception: If botocore is not available or token generation fails
    """
    if not BOTOCORE_AVAILABLE:
        raise Exception(
            _("AWS IAM authentication requires the 'botocore' package. "
              "Please install it with: pip install botocore")
        )

    try:
        # Create a botocore session with the specified profile (if any)
        session = botocore.session.Session(profile=profile)

        # TODO: Future enhancement - support role assumption via STS
        # if role_arn:
        #     sts_client = session.create_client('sts', region_name=region)
        #     assumed_role = sts_client.assume_role(
        #         RoleArn=role_arn,
        #         RoleSessionName='pgAdmin4-IAM-Session'
        #     )
        #     # Use temporary credentials from assumed role
        #     ...

        # Create RDS client
        rds_client = session.create_client('rds', region_name=region)

        # Generate the authentication token
        token = rds_client.generate_db_auth_token(
            DBHostname=host,
            Port=port,
            DBUsername=username,
            Region=region
        )

        logging.info(
            f"Successfully generated IAM auth token for {username}@{host}"
        )

        return token

    except NoCredentialsError:
        raise Exception(
            _("AWS credentials not found. Please configure your AWS "
              "credentials using 'aws configure' or ensure your "
              "environment has valid credentials.")
        )
    except PartialCredentialsError:
        raise Exception(
            _("Incomplete AWS credentials found. Please check your "
              "AWS configuration.")
        )
    except (BotoCoreError, ClientError) as e:
        error_msg = str(e)
        logging.error(f"AWS IAM token generation failed: {error_msg}")
        raise Exception(
            _("AWS IAM token generation failed: {error}").format(
                error=error_msg
            )
        )
    except Exception as e:
        error_msg = str(e)
        logging.error(f"Unexpected error during IAM auth: {error_msg}")
        raise Exception(
            _("IAM authentication error: {error}").format(error=error_msg)
        )
