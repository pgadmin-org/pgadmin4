ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    DROP COLUMN col2;

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN col1 DROP NOT NULL;

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN col1 TYPE integer;

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN col1 SET STATISTICS -1;
