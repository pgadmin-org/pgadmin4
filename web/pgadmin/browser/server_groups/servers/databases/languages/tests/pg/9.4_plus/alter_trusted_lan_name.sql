-- Language: Lan2_$%{}[]()&*^!@"'`\/#

-- DROP LANGUAGE "Lan2_$%{}[]()&*^!@""'`\/#"

CREATE TRUSTED PROCEDURAL LANGUAGE "Lan2_$%{}[]()&*^!@""'`\/#"
    HANDLER plpgsql_call_handler
    INLINE plpgsql_inline_handler
    VALIDATOR plpgsql_validator;

ALTER LANGUAGE "Lan2_$%{}[]()&*^!@""'`\/#"
    OWNER TO <OWNER>;
