-- SEQUENCE: public.Seq1_$%{}[]()&*^!@"'`\/#

-- DROP SEQUENCE IF EXISTS public."Seq1_$%{}[]()&*^!@""'`\/#";

CREATE SEQUENCE IF NOT EXISTS public."Seq1_$%{}[]()&*^!@""'`\/#"
    INCREMENT -7
    START -30
    MINVALUE -35
    MAXVALUE -15
    CACHE 1;

ALTER SEQUENCE public."Seq1_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;
