-- Language: Lan1_$%{}[]()&*^!@"'`\/#

-- DROP LANGUAGE "Lan1_$%{}[]()&*^!@""'`\/#"

CREATE PROCEDURAL LANGUAGE "Lan1_$%{}[]()&*^!@""'`\/#"
    HANDLER plpgsql_call_handler
    INLINE plpgsql_inline_handler
    VALIDATOR plpgsql_validator;

ALTER LANGUAGE "Lan1_$%{}[]()&*^!@""'`\/#"
    OWNER TO <OWNER>;
