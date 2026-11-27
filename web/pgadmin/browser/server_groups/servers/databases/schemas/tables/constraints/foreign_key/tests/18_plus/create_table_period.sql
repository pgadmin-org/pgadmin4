-- Table: testschema.test_period_table

-- DROP TABLE IF EXISTS testschema.test_period_table;

CREATE TABLE IF NOT EXISTS testschema.test_period_table
(
    id int4range,
    valid_at daterange,
    CONSTRAINT fk_period_table FOREIGN KEY (id, PERIOD valid_at)
        REFERENCES testschema.test_period_ref_table (id, PERIOD valid_at) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS testschema.test_period_table
    OWNER to <OWNER>;
