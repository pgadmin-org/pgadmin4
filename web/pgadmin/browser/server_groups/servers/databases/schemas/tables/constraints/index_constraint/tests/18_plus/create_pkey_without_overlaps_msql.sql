ALTER TABLE IF EXISTS testschema.tablefor_temporal_cons
    ADD CONSTRAINT pk_temporal PRIMARY KEY (room, valid_at WITHOUT OVERLAPS)
    INCLUDE (note)
    DEFERRABLE INITIALLY DEFERRED;
