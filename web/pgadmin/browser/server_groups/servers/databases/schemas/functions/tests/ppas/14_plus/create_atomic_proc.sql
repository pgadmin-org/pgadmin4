-- PROCEDURE: public.Proc3_$%{}[]()&*^!@"'`\/#()

-- DROP PROCEDURE IF EXISTS public."Proc3_$%{}[]()&*^!@""'`\/#"();

CREATE OR REPLACE PROCEDURE public."Proc3_$%{}[]()&*^!@""'`\/#"(
	)
LANGUAGE 'sql'
    SET application_name='demo'

BEGIN ATOMIC
 SELECT 1;
END;

COMMENT ON PROCEDURE public."Proc3_$%{}[]()&*^!@""'`\/#"()
    IS 'demo comments';
