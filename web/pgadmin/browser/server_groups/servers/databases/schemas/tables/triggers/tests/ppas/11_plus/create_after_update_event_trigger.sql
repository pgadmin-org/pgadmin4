-- Trigger: trig_after_update_$%{}[]()&*^!@"'`\/#

-- DROP TRIGGER IF EXISTS "trig_after_update_$%{}[]()&*^!@""'`\/#" ON public.tablefortrigger;

CREATE CONSTRAINT TRIGGER "trig_after_update_$%{}[]()&*^!@""'`\/#"
    AFTER UPDATE OF col2
    ON public.tablefortrigger
    FOR EACH ROW
    WHEN (old.col2 IS DISTINCT FROM new.col2)
    EXECUTE FUNCTION public."Trig1_$%{}[]()&*^!@""'`\/#"();

COMMENT ON TRIGGER "trig_after_update_$%{}[]()&*^!@""'`\/#" ON public.tablefortrigger
    IS 'comment for update event trigger';
