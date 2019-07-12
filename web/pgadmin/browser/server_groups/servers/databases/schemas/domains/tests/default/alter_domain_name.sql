-- DOMAIN: public."Dom2_$%{}[]()&*^!@""'`\/#"

-- DROP DOMAIN public."Dom2_$%{}[]()&*^!@""'`\/#";

CREATE DOMAIN public."Dom2_$%{}[]()&*^!@""'`\/#"
    AS bigint
    DEFAULT 3;

ALTER DOMAIN public."Dom2_$%{}[]()&*^!@""'`\/#" OWNER TO <OWNER>;

ALTER DOMAIN public."Dom2_$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT constraint_1 CHECK (true);

COMMENT ON DOMAIN public."Dom2_$%{}[]()&*^!@""'`\/#"
    IS 'test updated domain comment';
