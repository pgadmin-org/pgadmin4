CREATE CONSTRAINT TRIGGER "trig_after_update_$%{}[]()&*^!@""'`\/#"
    AFTER UPDATE OF col2
    ON public.tablefortrigger
    FOR EACH ROW
    WHEN (OLD.col2 IS DISTINCT FROM NEW.col2)
    EXECUTE PROCEDURE public."Trig1_$%{}[]()&*^!@""'`\/#"();

COMMENT ON TRIGGER "trig_after_update_$%{}[]()&*^!@""'`\/#" ON public.tablefortrigger
    IS 'comment for update event trigger';
