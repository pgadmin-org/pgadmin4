-- Trigger: trig_be4r_update_$%{}[]()&*^!@"'`\/#

-- DROP TRIGGER IF EXISTS "trig_be4r_update_$%{}[]()&*^!@""'`\/#" ON public.tablefortrigger;

CREATE TRIGGER "trig_be4r_update_$%{}[]()&*^!@""'`\/#"
    BEFORE UPDATE OF col1
    ON public.tablefortrigger
    FOR EACH ROW
    WHEN (old.col2 IS DISTINCT FROM new.col2)
    EXECUTE FUNCTION public."Trig1_$%{}[]()&*^!@""'`\/#"();

COMMENT ON TRIGGER "trig_be4r_update_$%{}[]()&*^!@""'`\/#" ON public.tablefortrigger
    IS 'test comment';

ALTER TABLE public.tablefortrigger
    ENABLE REPLICA TRIGGER "trig_be4r_update_$%{}[]()&*^!@""'`\/#";
