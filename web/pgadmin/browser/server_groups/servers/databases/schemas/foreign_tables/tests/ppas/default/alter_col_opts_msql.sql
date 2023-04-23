ALTER FOREIGN TABLE IF EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"
    DROP COLUMN col2;

ALTER FOREIGN TABLE IF EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN col1 DROP NOT NULL;

ALTER FOREIGN TABLE IF EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN col1 TYPE integer;

ALTER FOREIGN TABLE IF EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN col1 SET STATISTICS -1;

ALTER FOREIGN TABLE IF EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"
    OPTIONS (SET schema_name 'test_public');
