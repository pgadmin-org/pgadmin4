-- View: public."testmview_$%{}[]()&*^!@""'`\/#"

-- DROP MATERIALIZED VIEW public."testmview_$%{}[]()&*^!@""'`\/#";

CREATE MATERIALIZED VIEW public."testmview_$%{}[]()&*^!@""'`\/#"
TABLESPACE pg_default
AS
 SELECT test_mview_table.col1
   FROM test_mview_table
WITH DATA;

ALTER TABLE public."testmview_$%{}[]()&*^!@""'`\/#"
    OWNER TO postgres;
