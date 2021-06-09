CREATE CONSTRAINT TRIGGER "trig_after_delete_events_$%{}[]()&*^!@""'`\/#"
    AFTER DELETE
    ON public.tablefortrigger
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE PROCEDURE public."Trig1_$%{}[]()&*^!@""'`\/#"(12);

COMMENT ON TRIGGER "trig_after_delete_events_$%{}[]()&*^!@""'`\/#" ON public.tablefortrigger
    IS 'delete event trig';
