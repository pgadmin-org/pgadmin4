-- Trigger: trig_test_statement_$%{}[]()&*^!@\"'`\\/#"

-- DROP TRIGGER IF EXISTS "trig_test_statement_$%{}[]()&*^!@\""'`\\/#""" ON public.tablefortrigger;

CREATE TRIGGER "trig_test_statement_$%{}[]()&*^!@\""'`\\/#"""
    BEFORE INSERT OR DELETE OR TRUNCATE OR UPDATE OF col1, col2, col3
    ON public.tablefortrigger
    FOR EACH STATEMENT
    EXECUTE PROCEDURE public."Trig1_$%{}[]()&*^!@""'`\/#"();

COMMENT ON TRIGGER "trig_test_statement_$%{}[]()&*^!@\""'`\\/#""" ON public.tablefortrigger
    IS 'test comment';
