-- Type: enum_type_$%{}[]()&*^!@"'`\/#

-- DROP TYPE public."enum_type_$%{}[]()&*^!@""'`\/#";

CREATE TYPE public."enum_type_$%{}[]()&*^!@""'`\/#" AS ENUM
    ('a', 'b', 'c', 'd');

ALTER TYPE public."enum_type_$%{}[]()&*^!@""'`\/#"
    OWNER TO <OWNER>;

COMMENT ON TYPE public."enum_type_$%{}[]()&*^!@""'`\/#"
    IS 'this is test';

GRANT USAGE ON TYPE public."enum_type_$%{}[]()&*^!@""'`\/#" TO PUBLIC;

GRANT USAGE ON TYPE public."enum_type_$%{}[]()&*^!@""'`\/#" TO <OWNER>;
