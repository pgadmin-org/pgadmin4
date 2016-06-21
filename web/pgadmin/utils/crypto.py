##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

"""This File Provides Cryptography."""

import base64
import hashlib

from Crypto import Random
from Crypto.Cipher import AES

padding_string = b'}'


def encrypt(plaintext, key):
    """
    Encrypt the plaintext with AES method.

    Parameters:
        plaintext -- String to be encrypted.
        key       -- Key for encryption.
    """

    iv = Random.new().read(AES.block_size)
    cipher = AES.new(pad(key), AES.MODE_CFB, iv)
    excrypted = base64.b64encode(iv + cipher.encrypt(plaintext))

    return excrypted


def decrypt(ciphertext, key):
    """
    Decrypt the AES encrypted string.

    Parameters:
        ciphertext -- Encrypted string with AES method.
        key        -- key to decrypt the encrypted string.
    """

    global padding_string

    ciphertext = base64.b64decode(ciphertext)
    iv = ciphertext[:AES.block_size]
    cipher = AES.new(pad(key), AES.MODE_CFB, iv)
    decrypted = cipher.decrypt(ciphertext[AES.block_size:])

    return decrypted


def pad(str):
    """Add padding to the key."""

    global padding_string
    str_len = len(str)

    # Key must be maximum 32 bytes long, so take first 32 bytes
    if str_len > 32:
        return str[:32]

    # If key size id 16, 24 or 32 bytes then padding not require
    if str_len == 16 or str_len == 24 or str_len == 32:
        return str

    # Add padding to make key 32 bytes long
    return str + ((32 - len(str) % 32) * padding_string)


def pqencryptpassword(password, user):
    """
    pqencryptpassword -- to encrypt a password
    This is intended to be used by client applications that wish to send
    commands like ALTER USER joe PASSWORD 'pwd'.  The password need not
    be sent in cleartext if it is encrypted on the client side.  This is
    good because it ensures the cleartext password won't end up in logs,
    pg_stat displays, etc. We export the function so that clients won't
    be dependent on low-level details like whether the enceyption is MD5
    or something else.

    Arguments are the cleartext password, and the SQL name of the user it
    is for.

    Return value is "md5" followed by a 32-hex-digit MD5 checksum..

    Args:
      password:
      user:

    Returns:

    """

    m = hashlib.md5()

    # Place salt at the end because it may be known by users trying to crack
    # the MD5 output.

    m.update(password.encode())
    m.update(user.encode())

    return "md5" + m.hexdigest()
