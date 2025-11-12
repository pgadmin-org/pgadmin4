-- SEQUENCE: public.Seq1_$%{}[]()&*^!@"'`\/#

-- DROP SEQUENCE IF EXISTS public."Seq1_$%{}[]()&*^!@""'`\/#";

CREATE UNLOGGED SEQUENCE IF NOT EXISTS public."Seq1_$%{}[]()&*^!@""'`\/#"
    INCREMENT 5
    START 5
    MINVALUE 5
    MAXVALUE 999
    CACHE 1;

ALTER SEQUENCE public."Seq1_$%{}[]()&*^!@""'`\/#"
    OWNER TO postgres;
