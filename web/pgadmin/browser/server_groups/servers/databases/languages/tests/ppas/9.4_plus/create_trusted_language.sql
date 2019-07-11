-- Language: Lan1_$%{}[]()&*^!@"'`\/#

-- DROP LANGUAGE "Lan1_$%{}[]()&*^!@""'`\/#"

CREATE TRUSTED PROCEDURAL LANGUAGE "Lan1_$%{}[]()&*^!@""'`\/#"
    HANDLER spl_call_handler
    INLINE spl_inline_handler
    VALIDATOR spl_validator;

ALTER LANGUAGE "Lan1_$%{}[]()&*^!@""'`\/#"
    OWNER TO <OWNER>;
