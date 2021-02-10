-- SEQUENCE: public.Seq1_$%{}[]()&*^!@"'`\/#

-- DROP SEQUENCE public."Seq1_$%{}[]()&*^!@""'`\/#";

CREATE SEQUENCE public."Seq1_$%{}[]()&*^!@""'`\/#"
    CYCLE
    INCREMENT 12
    START 5
    MINVALUE 2
    MAXVALUE 9992
    CACHE 2;

ALTER SEQUENCE public."Seq1_$%{}[]()&*^!@""'`\/#"
    OWNER TO postgres;

COMMENT ON SEQUENCE public."Seq1_$%{}[]()&*^!@""'`\/#"
    IS 'Some comment';
