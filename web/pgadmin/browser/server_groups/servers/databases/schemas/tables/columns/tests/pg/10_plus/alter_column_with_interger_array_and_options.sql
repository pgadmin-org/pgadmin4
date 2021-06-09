-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__3_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col__3_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col__3_$%{}[]()&*^!@""'`\/#" integer[] NOT NULL;

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__3_$%{}[]()&*^!@""'`\/#"
    IS 'comment';

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "col__3_$%{}[]()&*^!@""'`\/#"
    SET (n_distinct=2);
