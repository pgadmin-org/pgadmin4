-- User Mapping : postgres

-- DROP USER MAPPING FOR postgres SERVER test_fs_for_user_mapping

CREATE USER MAPPING FOR postgres SERVER test_fs_for_user_mapping
    OPTIONS ("user" 'test_user12', password 'secret123');
