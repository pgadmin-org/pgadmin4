-- Type: composite_type_$%{}[]()&*^!@"'`\/#

-- DROP TYPE IF EXISTS public."composite_type_$%{}[]()&*^!@""'`\/#";

CREATE TYPE public."composite_type_$%{}[]()&*^!@""'`\/#" AS
(
	mname1 bigint,
	mname2 character varying(50) COLLATE pg_catalog."C",
	mname3 text[] COLLATE pg_catalog."C"
);

ALTER TYPE public."composite_type_$%{}[]()&*^!@""'`\/#"
    OWNER TO <OWNER>;
