-- User Mapping : <OWNER>

-- DROP USER MAPPING IF EXISTS FOR <OWNER> SERVER test_fs_for_user_mapping

CREATE USER MAPPING FOR <OWNER> SERVER test_fs_for_user_mapping
    OPTIONS ("user" 'test_user12', password 'secret123');
