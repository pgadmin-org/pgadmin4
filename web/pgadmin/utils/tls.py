##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Certificate verification for pgAdmin's own outbound HTTPS requests."""

import os
import ssl

import config


def get_ca_file():
    """
    Return the CA bundle that outbound HTTPS requests should verify against.

    config.CA_FILE wins if the file exists; the macOS app ships one and the
    container points it at the system bundle. Otherwise use certifi's
    bundle, because the Python in the macOS app has no usable default CA
    store. Setting CA_FILE to None or '' selects Python's own defaults (the
    system store on most platforms). Returns None when Python's defaults
    should be used.
    """
    ca_file = getattr(config, 'CA_FILE', None)
    if not ca_file:
        return None
    if os.path.isfile(ca_file):
        return ca_file
    try:
        import certifi
        return certifi.where()
    except ImportError:
        return None


def create_ssl_context():
    """Return a verifying client SSL context that uses get_ca_file()."""
    context = ssl.create_default_context(cafile=get_ca_file())
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    return context


def ca_file_env():
    """
    Return the environment that makes a child process verify against
    get_ca_file(), for Python code (such as pgacloud) that relies on
    OpenSSL's default verify paths.
    """
    ca_file = get_ca_file()
    return {'SSL_CERT_FILE': ca_file} if ca_file else {}
