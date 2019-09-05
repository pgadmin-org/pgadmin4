ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT cons1 CHECK (true) NO INHERIT;

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    OPTIONS (ADD schema_name 'public');

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    OPTIONS (ADD table_name 'test_table');
