-- Language: Lan1_$%{}[]()&*^!@"'`\/#

-- DROP LANGUAGE IF EXISTS "Lan1_$%{}[]()&*^!@""'`\/#"

CREATE OR REPLACE PROCEDURAL LANGUAGE "Lan1_$%{}[]()&*^!@""'`\/#"
    HANDLER plpgsql_call_handler
    INLINE plpgsql_inline_handler
    VALIDATOR plpgsql_validator;

ALTER LANGUAGE "Lan1_$%{}[]()&*^!@""'`\/#"
    OWNER TO <OWNER>;
