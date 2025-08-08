-- Collation: Cl1_$%{}[]()&*^!@"'`\/#b;

-- DROP COLLATION IF EXISTS testschema."Cl1_$%{}[]()&*^!@""'`\/#b";

CREATE COLLATION IF NOT EXISTS testschema."Cl1_$%{}[]()&*^!@""'`\/#b"
    (LC_COLLATE = 'C', LC_CTYPE = 'C', PROVIDER = 'builtin', DETERMINISTIC = true, VERSION = '1');

ALTER COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#b"
    OWNER TO <OWNER>;

COMMENT ON COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#b"
    IS 'builtin';
