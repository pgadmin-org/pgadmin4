-- Type: range_type_$%{}[]()&*^!@"'`\/#

-- DROP TYPE IF EXISTS public."range_type_$%{}[]()&*^!@""'`\/#";

CREATE TYPE public."range_type_$%{}[]()&*^!@""'`\/#" AS RANGE
(
    SUBTYPE=bool,
    SUBTYPE_OPCLASS = bool_ops
);

ALTER TYPE public."range_type_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;

COMMENT ON TYPE public."range_type_$%{}[]()&*^!@""'`\/#"
    IS 'this is test';

GRANT USAGE ON TYPE public."range_type_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
