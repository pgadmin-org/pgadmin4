-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_comp_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_comp_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_comp_$%{}[]()&*^!@""'`\/#" character varying COLLATE pg_catalog."default" NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "col_comp_$%{}[]()&*^!@""'`\/#" SET COMPRESSION lz4;
