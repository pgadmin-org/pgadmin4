-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_1111_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_1111_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_1111_$%{}[]()&*^!@""'`\/#" character varying(50) COLLATE pg_catalog."C";

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_1111_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for create';

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "col_1111_$%{}[]()&*^!@""'`\/#" SET STORAGE MAIN;