##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

"""This File Provides Cryptography."""

import base64
import hashlib
import os

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher
from cryptography.hazmat.primitives.ciphers.algorithms import AES
from cryptography.hazmat.primitives.ciphers.modes import CFB8

padding_string = b'}'
iv_size = AES.block_size // 8


def encrypt(plaintext, key):
    """
    Encrypt the plaintext with AES method.

    Parameters:
        plaintext -- String to be encrypted.
        key       -- Key for encryption.
    """

    iv = os.urandom(iv_size)
    cipher = Cipher(AES(pad(key)), CFB8(iv), default_backend())
    encryptor = cipher.encryptor()

    # If user has entered non ascii password (Python2)
    # we have to encode it first
    if isinstance(plaintext, str):
        plaintext = plaintext.encode()

    return base64.b64encode(iv + encryptor.update(plaintext) +
                            encryptor.finalize())


def decrypt(ciphertext, key):
    """
    Decrypt the AES encrypted string.

    Parameters:
        ciphertext -- Encrypted string with AES method.
        key        -- key to decrypt the encrypted string.
    """

    ciphertext = base64.b64decode(ciphertext)
    iv = ciphertext[:iv_size]

    cipher = Cipher(AES(pad(key)), CFB8(iv), default_backend())
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext[iv_size:]) + decryptor.finalize()


def pad(key):
    """Add padding to the key."""

    if isinstance(key, str):
        key = key.encode()

    # Key must be maximum 32 bytes long, so take first 32 bytes
    key = key[:32]

    # If key size is 16, 24 or 32 bytes then padding is not required
    if len(key) in (16, 24, 32):
        return key

    # Add padding to make key 32 bytes long
    return key.ljust(32, padding_string)
