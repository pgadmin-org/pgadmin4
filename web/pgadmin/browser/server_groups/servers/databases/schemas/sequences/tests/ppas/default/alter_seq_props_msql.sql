SELECT setval(E'public."Seq1_$%{}[]()&*^!@""''`\\/#"', 7, false);

ALTER SEQUENCE IF EXISTS public."Seq1_$%{}[]()&*^!@""'`\/#"
    INCREMENT 12
    MINVALUE 2
    MAXVALUE 9992
    CACHE 2
    CYCLE;
