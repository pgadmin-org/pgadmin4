-- DOMAIN: public.Dom1_$%{}[]()&*^!@"'`\/#

-- DROP DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#";

CREATE DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#"
    AS numeric(5,2)
    DEFAULT 3
    NOT NULL;

ALTER DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#" OWNER TO enterprisedb;

COMMENT ON DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#"
    IS 'test_comment';
