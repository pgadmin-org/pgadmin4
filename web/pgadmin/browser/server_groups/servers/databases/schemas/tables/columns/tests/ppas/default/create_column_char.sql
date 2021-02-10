-- Column: testschema."table_1_$%{}[]()&*^!@""'`\/#"."col_2_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_1_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col_2_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_1_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_2_$%{}[]()&*^!@""'`\/#" character varying(50) COLLATE pg_catalog."C";

COMMENT ON COLUMN testschema."table_1_$%{}[]()&*^!@""'`\/#"."col_2_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for create';
