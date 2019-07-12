-- DOMAIN: public."Dom1_$%{}[]()&*^!@""'`\/#"

-- DROP DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#";

CREATE DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#"
    AS bigint
    DEFAULT 5
    NOT NULL;

ALTER DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#" OWNER TO <OWNER>;

ALTER DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT constraint_1 CHECK (true);

COMMENT ON DOMAIN public."Dom1_$%{}[]()&*^!@""'`\/#"
    IS 'test updated domain comment';
