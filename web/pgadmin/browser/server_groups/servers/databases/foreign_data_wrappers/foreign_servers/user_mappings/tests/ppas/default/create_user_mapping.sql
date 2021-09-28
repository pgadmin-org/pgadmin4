-- User Mapping : enterprisedb

-- DROP USER MAPPING IF EXISTS FOR enterprisedb SERVER test_fs_for_user_mapping

CREATE USER MAPPING FOR enterprisedb SERVER test_fs_for_user_mapping
    OPTIONS ("user" 'test_user', password 'secret');
