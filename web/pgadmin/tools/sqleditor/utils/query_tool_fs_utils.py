##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import codecs


def read_file_generator(file, enc):
    """
    This will read the content of the file selected by user

    Returns:
        Content of file
    """
    try:
        with codecs.open(file, 'r', encoding=enc) as fileObj:
            while True:
                # 4MB chunk (4 * 1024 * 1024 Bytes)
                data = fileObj.read(4194304)
                if not data:
                    break
                yield data
    except UnicodeDecodeError:
        # This is the closest equivalent Python 3 offers to the permissive
        # Python 2 text handling model. The latin-1 encoding in Python
        # implements ISO_8859-1:1987 which maps all possible byte values
        # to the first 256 Unicode code points, and thus ensures decoding
        # errors will never occur regardless of the configured error and
        # handles most of the Windows encodings
        # handler.
        # Ref: https://goo.gl/vDhggS
        with codecs.open(file, 'r', encoding='latin-1') as fileObj:
            while True:
                # 4MB chunk (4 * 1024 * 1024 Bytes)
                data = fileObj.read(4194304)
                if not data:
                    break
                yield data
    except Exception:
        # As a last resort we will use the provided encoding and then
        # ignore the decoding errors
        with codecs.open(file, 'r', encoding=enc, errors='ignore') as fileObj:
            while True:
                # 4MB chunk (4 * 1024 * 1024 Bytes)
                data = fileObj.read(4194304)
                if not data:
                    break
                yield data
