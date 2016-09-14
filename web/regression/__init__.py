# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

global node_info_dict
node_info_dict = {
        "sid": [],  # server
        "did": [],  # database
        "lrid": [],  # role
        "tsid": [],  # tablespace
        "scid": [],  # schema
        "tfnid": [],  # trigger functions
        "coid": [],  # collation
        "cid": [],  # casts
        "etid": [], # event_trigger
        "eid": [],  # extension
        "fid": [],  # FDW
        "fsid": [],  # FRS
        "umid": [],  # user_mapping
        "seid": []  # sequence
}

global test_server_dict
test_server_dict = {
        "server": [],
        "database": []
}