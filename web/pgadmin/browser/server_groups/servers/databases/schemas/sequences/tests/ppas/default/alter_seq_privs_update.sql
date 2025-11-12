-- SEQUENCE: public.Seq1_$%{}[]()&*^!@"'`\/#

-- DROP SEQUENCE IF EXISTS public."Seq1_$%{}[]()&*^!@""'`\/#";

CREATE SEQUENCE IF NOT EXISTS public."Seq1_$%{}[]()&*^!@""'`\/#"
    CYCLE
    INCREMENT 12
    START 5
    MINVALUE 2
    MAXVALUE 9992
    CACHE 2;

ALTER SEQUENCE public."Seq1_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;

COMMENT ON SEQUENCE public."Seq1_$%{}[]()&*^!@""'`\/#"
    IS 'Some comment';

GRANT SELECT ON SEQUENCE public."Seq1_$%{}[]()&*^!@""'`\/#" TO PUBLIC;

GRANT ALL ON SEQUENCE public."Seq1_$%{}[]()&*^!@""'`\/#" TO enterprisedb;
