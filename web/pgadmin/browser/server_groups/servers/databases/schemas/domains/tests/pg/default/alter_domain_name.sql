-- DOMAIN: public.Dom2_$%{}[]()&*^!@"'`\/#

-- DROP DOMAIN IF EXISTS public."Dom2_$%{}[]()&*^!@""'`\/#";

CREATE DOMAIN public."Dom2_$%{}[]()&*^!@""'`\/#"
    AS text
    COLLATE pg_catalog."C"
    DEFAULT 3;

ALTER DOMAIN public."Dom2_$%{}[]()&*^!@""'`\/#" OWNER TO postgres;

ALTER DOMAIN public."Dom2_$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT constraint_1 CHECK (3 < 5);

ALTER DOMAIN public."Dom2_$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT constraint_2 CHECK (4 < 2) NOT VALID;

COMMENT ON DOMAIN public."Dom2_$%{}[]()&*^!@""'`\/#"
    IS 'test updated domain comment';
