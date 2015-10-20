##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################
"""This File Provides Cryptography."""

from Crypto.Cipher import AES
from Crypto import Random
import base64

padding_string = '}'


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
    l = decrypted.count(padding_string)

    return decrypted[:len(decrypted)-l]


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
