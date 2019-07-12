-- Collation: Cl1_$%{}[]()&*^!@"'`\/#a;

-- DROP COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#a";

CREATE COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#a"
    (LC_COLLATE = 'C', LC_CTYPE = 'C');

ALTER COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#a"
    OWNER TO <OWNER>;

COMMENT ON COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#a"
    IS 'Description for alter';
