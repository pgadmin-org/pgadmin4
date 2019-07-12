-- Collation: Cl1_$%{}[]()&*^!@"'`\/#;

-- DROP COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#";

CREATE COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#"
    (LC_COLLATE = 'C', LC_CTYPE = 'C');

ALTER COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#"
    OWNER TO <OWNER>;

COMMENT ON COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#"
    IS 'Description';
