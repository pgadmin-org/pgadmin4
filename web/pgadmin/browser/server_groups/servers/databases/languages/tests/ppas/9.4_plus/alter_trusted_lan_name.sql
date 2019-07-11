-- Language: Lan2_$%{}[]()&*^!@"'`\/#

-- DROP LANGUAGE "Lan2_$%{}[]()&*^!@""'`\/#"

CREATE TRUSTED PROCEDURAL LANGUAGE "Lan2_$%{}[]()&*^!@""'`\/#"
    HANDLER spl_call_handler
    INLINE spl_inline_handler
    VALIDATOR spl_validator;

ALTER LANGUAGE "Lan2_$%{}[]()&*^!@""'`\/#"
    OWNER TO <OWNER>;
