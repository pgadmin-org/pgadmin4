-- Table: testschema.table_with_temporal_cons

-- DROP TABLE IF EXISTS testschema.table_with_temporal_cons;

CREATE TABLE IF NOT EXISTS testschema.table_with_temporal_cons
(
    room int4range NOT NULL,
    valid_at daterange NOT NULL,
    seat int4range,
    CONSTRAINT pk_table_temporal PRIMARY KEY (room, valid_at WITHOUT OVERLAPS),
    CONSTRAINT uc_table_temporal UNIQUE (seat, valid_at WITHOUT OVERLAPS)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS testschema.table_with_temporal_cons
    OWNER to <OWNER>;
