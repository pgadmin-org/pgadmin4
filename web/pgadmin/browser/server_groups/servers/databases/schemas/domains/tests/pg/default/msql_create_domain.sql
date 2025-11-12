CREATE DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#"
    AS text
    COLLATE pg_catalog."C"
    DEFAULT 5
    NOT NULL;

ALTER DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#" OWNER TO postgres;

ALTER DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT constraint_1 CHECK (3 < 5);

ALTER DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT constraint_2 CHECK (4 < 2) NOT VALID;

COMMENT ON DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#"
    IS 'test_comment';
