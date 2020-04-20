--
-- PostgreSQL database dump
--

-- Dumped from database version 10.7
-- Dumped by pg_dump version 12beta2

-- Started on 2019-11-01 12:55:22 IST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;

--
-- TOC entry 18 (class 2615 OID 139771)
-- Name: target; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA target;


ALTER SCHEMA target OWNER TO postgres;

SET default_tablespace = '';

CREATE EXTENSION btree_gist
    SCHEMA target;

--
-- TOC entry 12250 (class 1259 OID 139938)
-- Name: MView; Type: MATERIALIZED VIEW; Schema: target; Owner: postgres
--

CREATE MATERIALIZED VIEW target."MView" AS
 SELECT 'tekst'::text AS text
  WITH NO DATA;


ALTER TABLE target."MView" OWNER TO postgres;

--
-- TOC entry 12259 (class 1259 OID 148971)
-- Name: table_for_column; Type: TABLE; Schema: target; Owner: postgres
--

CREATE TABLE target.table_for_column (
    col1 bigint,
    col2 bigint,
    col4 text
);


ALTER TABLE target.table_for_column OWNER TO postgres;

--
-- TOC entry 12268 (class 1259 OID 149089)
-- Name: table_for_constraints; Type: TABLE; Schema: target; Owner: postgres
--

CREATE TABLE target.table_for_constraints (
    col1 integer NOT NULL,
    col2 text,
    CONSTRAINT check_con CHECK ((col1 > 30))
);


ALTER TABLE target.table_for_constraints OWNER TO postgres;

--
-- TOC entry 61066 (class 0 OID 0)
-- Dependencies: 12268
-- Name: TABLE table_for_constraints; Type: COMMENT; Schema: target; Owner: postgres
--

COMMENT ON TABLE target.table_for_constraints IS 'comments';


--
-- TOC entry 61067 (class 0 OID 0)
-- Dependencies: 12268
-- Name: CONSTRAINT check_con ON table_for_constraints; Type: COMMENT; Schema: target; Owner: postgres
--

COMMENT ON CONSTRAINT check_con ON target.table_for_constraints IS 'coment';


--
-- TOC entry 12257 (class 1259 OID 148960)
-- Name: table_for_del; Type: TABLE; Schema: target; Owner: postgres
--

CREATE TABLE target.table_for_del (
);


ALTER TABLE target.table_for_del OWNER TO postgres;

--
-- TOC entry 12271 (class 1259 OID 149172)
-- Name: table_for_foreign_key; Type: TABLE; Schema: target; Owner: postgres
--

CREATE TABLE target.table_for_foreign_key (
    col1 integer NOT NULL,
    col2 "char",
    col3 bigint
);


ALTER TABLE target.table_for_foreign_key OWNER TO postgres;

--
-- TOC entry 12263 (class 1259 OID 149013)
-- Name: table_for_identical; Type: TABLE; Schema: target; Owner: postgres
--

CREATE TABLE target.table_for_identical (
    col1 integer NOT NULL,
    col2 text
);


ALTER TABLE target.table_for_identical OWNER TO postgres;

--
-- TOC entry 12261 (class 1259 OID 148986)
-- Name: table_for_index; Type: TABLE; Schema: target; Owner: postgres
--

CREATE TABLE target.table_for_index (
    col1 integer NOT NULL,
    col2 text
);


ALTER TABLE target.table_for_index OWNER TO postgres;

--
-- TOC entry 12270 (class 1259 OID 149144)
-- Name: table_for_primary_key; Type: TABLE; Schema: target; Owner: postgres
--

CREATE TABLE target.table_for_primary_key (
    col1 integer NOT NULL,
    col2 text NOT NULL
);


ALTER TABLE target.table_for_primary_key OWNER TO postgres;

--
-- TOC entry 12265 (class 1259 OID 149034)
-- Name: table_for_rule; Type: TABLE; Schema: target; Owner: postgres
--

CREATE TABLE target.table_for_rule (
    col1 bigint NOT NULL,
    col2 text
);


ALTER TABLE target.table_for_rule OWNER TO postgres;

--
-- TOC entry 12267 (class 1259 OID 149066)
-- Name: table_for_trigger; Type: TABLE; Schema: target; Owner: postgres
--

CREATE TABLE target.table_for_trigger (
    col1 bigint NOT NULL,
    col2 text
);


ALTER TABLE target.table_for_trigger OWNER TO postgres;


--
-- TOC entry 56906 (class 2606 OID 149097)
-- Name: table_for_constraints Exclusion; Type: CONSTRAINT; Schema: target; Owner: postgres
--

ALTER TABLE ONLY target.table_for_constraints
    ADD CONSTRAINT "Exclusion" EXCLUDE USING gist (col2 WITH <>) WITH (fillfactor='15') WHERE ((col1 > 1)) DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 61068 (class 0 OID 0)
-- Dependencies: 56906
-- Name: CONSTRAINT "Exclusion" ON table_for_constraints; Type: COMMENT; Schema: target; Owner: postgres
--

COMMENT ON CONSTRAINT "Exclusion" ON target.table_for_constraints IS 'comments';


--
-- TOC entry 56910 (class 2606 OID 149176)
-- Name: table_for_foreign_key table_for_foreign_key_pkey; Type: CONSTRAINT; Schema: target; Owner: postgres
--

ALTER TABLE ONLY target.table_for_foreign_key
    ADD CONSTRAINT table_for_foreign_key_pkey PRIMARY KEY (col1);


--
-- TOC entry 56897 (class 2606 OID 148993)
-- Name: table_for_index table_for_index_pkey; Type: CONSTRAINT; Schema: target; Owner: postgres
--

ALTER TABLE ONLY target.table_for_index
    ADD CONSTRAINT table_for_index_pkey PRIMARY KEY (col1);


--
-- TOC entry 56908 (class 2606 OID 149151)
-- Name: table_for_primary_key table_for_primary_key_pkey; Type: CONSTRAINT; Schema: target; Owner: postgres
--

ALTER TABLE ONLY target.table_for_primary_key
    ADD CONSTRAINT table_for_primary_key_pkey PRIMARY KEY (col1);


--
-- TOC entry 56902 (class 2606 OID 149041)
-- Name: table_for_rule table_for_rule_pkey; Type: CONSTRAINT; Schema: target; Owner: postgres
--

ALTER TABLE ONLY target.table_for_rule
    ADD CONSTRAINT table_for_rule_pkey PRIMARY KEY (col1);


--
-- TOC entry 56900 (class 2606 OID 149020)
-- Name: table_for_identical table_for_table_for_identical_pkey; Type: CONSTRAINT; Schema: target; Owner: postgres
--

ALTER TABLE ONLY target.table_for_identical
    ADD CONSTRAINT table_for_table_for_identical_pkey PRIMARY KEY (col1);


--
-- TOC entry 56904 (class 2606 OID 149073)
-- Name: table_for_trigger table_for_trigger_pkey; Type: CONSTRAINT; Schema: target; Owner: postgres
--

ALTER TABLE ONLY target.table_for_trigger
    ADD CONSTRAINT table_for_trigger_pkey PRIMARY KEY (col1);


--
-- TOC entry 56893 (class 1259 OID 148994)
-- Name: index1; Type: INDEX; Schema: target; Owner: postgres
--

CREATE INDEX index1 ON target.table_for_index USING btree (col2 text_pattern_ops);


--
-- TOC entry 56894 (class 1259 OID 148995)
-- Name: index2; Type: INDEX; Schema: target; Owner: postgres
--

CREATE INDEX index2 ON target.table_for_index USING btree (col2 text_pattern_ops);


--
-- TOC entry 56898 (class 1259 OID 149021)
-- Name: index_identical; Type: INDEX; Schema: target; Owner: postgres
--

CREATE INDEX index_identical ON target.table_for_identical USING btree (col2 text_pattern_ops);


--
-- TOC entry 56895 (class 1259 OID 149212)
-- Name: index_same; Type: INDEX; Schema: target; Owner: postgres
--

CREATE INDEX index_same ON target.table_for_index USING btree (col2 text_pattern_ops);


--
-- TOC entry 56892 (class 1259 OID 139945)
-- Name: mview_index; Type: INDEX; Schema: target; Owner: postgres
--

CREATE INDEX mview_index ON target."MView" USING btree (text text_pattern_ops);


--
-- TOC entry 61045 (class 2618 OID 149042)
-- Name: table_for_rule rule1; Type: RULE; Schema: target; Owner: postgres
--

CREATE RULE rule1 AS
    ON UPDATE TO target.table_for_rule DO INSTEAD NOTHING;


--
-- TOC entry 61069 (class 0 OID 0)
-- Dependencies: 61045
-- Name: RULE rule1 ON table_for_rule; Type: COMMENT; Schema: target; Owner: postgres
--

COMMENT ON RULE rule1 ON target.table_for_rule IS 'comments';


--
-- TOC entry 61046 (class 2618 OID 149043)
-- Name: table_for_rule rule2; Type: RULE; Schema: target; Owner: postgres
--

CREATE RULE rule2 AS
    ON UPDATE TO target.table_for_rule DO NOTHING;


--
-- TOC entry 61047 (class 2618 OID 149044)
-- Name: table_for_rule rule3; Type: RULE; Schema: target; Owner: postgres
--

CREATE RULE rule3 AS
    ON INSERT TO target.table_for_rule DO NOTHING;


--
-- TOC entry 61050 (class 0 OID 139938)
-- Dependencies: 12250 61062
-- Name: MView; Type: MATERIALIZED VIEW DATA; Schema: target; Owner: postgres
--

REFRESH MATERIALIZED VIEW target."MView";

-- Collation scripts
CREATE COLLATION target.coll_tar
    FROM pg_catalog."POSIX";

ALTER COLLATION target.coll_tar
    OWNER TO postgres;

CREATE COLLATION target.coll_diff
    (LC_COLLATE = 'C', LC_CTYPE = 'C');

ALTER COLLATION target.coll_diff
    OWNER TO postgres;

-- FTS Configuration scripts
CREATE TEXT SEARCH CONFIGURATION target.fts_con_tar (
    COPY=german
);

ALTER TEXT SEARCH CONFIGURATION target.fts_con_tar OWNER TO postgres;

CREATE TEXT SEARCH CONFIGURATION target.fts_con_diff (
	PARSER = default
);
ALTER TEXT SEARCH CONFIGURATION target.fts_con_diff ADD MAPPING FOR asciiword WITH dutch_stem;
ALTER TEXT SEARCH CONFIGURATION target.fts_con_diff ADD MAPPING FOR email WITH simple;
ALTER TEXT SEARCH CONFIGURATION target.fts_con_diff ADD MAPPING FOR hword WITH german_stem;

-- FTS Dictionary scripts
CREATE TEXT SEARCH DICTIONARY target.fts_dict_tar (
    TEMPLATE = simple,
    stopwords = 'english'
);

CREATE TEXT SEARCH DICTIONARY target.fts_dict_diff (
    TEMPLATE = simple,
    stopwords = 'german'
);

COMMENT ON TEXT SEARCH DICTIONARY target.fts_dict_diff
    IS 'Comment';

-- FTS Parser scripts
CREATE TEXT SEARCH PARSER target.fts_par_tar (
    START = prsd_start,
    GETTOKEN = prsd_nexttoken,
    END = prsd_end,
    LEXTYPES = prsd_lextype);

CREATE TEXT SEARCH PARSER target.fts_par_diff (
    START = int4_accum,
    GETTOKEN = inet_gist_penalty,
    END = btint2sortsupport,
    LEXTYPES = dispell_init);

COMMENT ON TEXT SEARCH PARSER target.fts_par_diff
      IS 'Comment';

-- FTS Template scripts
CREATE TEXT SEARCH TEMPLATE target.fts_templ_tar (
    INIT = dispell_init,
    LEXIZE = dispell_lexize
);

CREATE TEXT SEARCH TEMPLATE target.fts_templ_diff (
    INIT = dsimple_init,
    LEXIZE = dsimple_lexize
);

COMMENT ON TEXT SEARCH TEMPLATE target.fts_templ_diff IS 'Comment';

-- Domain and Domain Constraint script
CREATE DOMAIN target.dom_src
    AS bigint
    DEFAULT 100
    NOT NULL;

ALTER DOMAIN target.dom_src OWNER TO postgres;

ALTER DOMAIN target.dom_src
    ADD CONSTRAINT con_src CHECK (VALUE <> 100);

CREATE DOMAIN target.dom_cons_diff
    AS bigint
    DEFAULT 400;

ALTER DOMAIN target.dom_cons_diff OWNER TO postgres;

ALTER DOMAIN target.dom_cons_diff
    ADD CONSTRAINT cons_diff_1 CHECK (VALUE <> 40);

ALTER DOMAIN target.dom_cons_diff
    ADD CONSTRAINT cons_tar_only CHECK (VALUE <> 25);

CREATE DOMAIN target.dom_type_diff
    AS numeric(8,4);

ALTER DOMAIN target.dom_type_diff OWNER TO postgres;

ALTER DOMAIN target.dom_type_diff
    ADD CONSTRAINT cons1 CHECK (VALUE <> 45::numeric);

ALTER DOMAIN target.dom_type_diff
    ADD CONSTRAINT cons2 CHECK (VALUE <> 50::numeric);

COMMENT ON DOMAIN target.dom_type_diff
    IS 'Comment';

-- Type Script composite type
CREATE TYPE target.typ_comp_tar AS
(
	m1 bit(5),
	m2 text COLLATE pg_catalog."POSIX"
);
ALTER TYPE target.typ_comp_tar
    OWNER TO postgres;
CREATE TYPE target.typ_comp_diff AS
(
	m1 bit(5),
	m2 text COLLATE pg_catalog."POSIX"
);
ALTER TYPE target.typ_comp_diff
    OWNER TO postgres;

CREATE TYPE target.typ_comp_diff_no_column AS
(
	a "char",
	b "char"
);
ALTER TYPE target.typ_comp_diff_no_column
    OWNER TO postgres;

-- Type Script ENUM type
CREATE TYPE target.typ_enum_tar AS ENUM
    ('test_enum');
ALTER TYPE target.typ_enum_tar
    OWNER TO postgres;

CREATE TYPE target.typ_enum_diff AS ENUM
    ('test_enum', 'test_enum_1');
ALTER TYPE target.typ_enum_diff
    OWNER TO postgres;

-- Type Script RANGE type
CREATE TYPE target.typ_range_tar AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."POSIX",
    SUBTYPE_OPCLASS = text_ops
);
ALTER TYPE target.typ_range_tar
    OWNER TO postgres;

CREATE TYPE target.typ_range_col_diff AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."POSIX",
    SUBTYPE_OPCLASS = text_ops
);

CREATE TYPE target.typ_range_subtype_diff AS RANGE
(
    SUBTYPE=bool,
    SUBTYPE_OPCLASS = bool_ops
);
ALTER TYPE target.typ_range_subtype_diff
    OWNER TO postgres;

-- Type Script SHELL type
CREATE TYPE target.typ_shell_tar;
ALTER TYPE target.typ_shell_tar
    OWNER TO postgres;

CREATE TYPE target.typ_shell_diff;
ALTER TYPE target.typ_shell_diff
    OWNER TO postgres;

-- Type script to test when Type is different
CREATE TYPE target.typ_comp_range_diff AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."C",
    SUBTYPE_OPCLASS = text_ops
);
ALTER TYPE target.typ_comp_range_diff
    OWNER TO postgres;

CREATE TYPE target.typ_comp_enum_diff AS ENUM
    ('test_enum', 'test_enum_1');
ALTER TYPE target.typ_comp_enum_diff
    OWNER TO postgres;

CREATE TYPE target.typ_range_comp_diff AS
(
	m1 bigint,
	m2 text[] COLLATE pg_catalog."POSIX"
);
ALTER TYPE target.typ_range_comp_diff
    OWNER TO postgres;

CREATE TYPE target.typ_range_enum_diff AS ENUM
    ('test_enum', 'test_enum_1');
ALTER TYPE target.typ_range_enum_diff
    OWNER TO postgres;

CREATE TYPE target.typ_enum_comp_diff AS
(
	m1 bigint,
	m2 text[] COLLATE pg_catalog."POSIX"
);
ALTER TYPE target.typ_enum_comp_diff
    OWNER TO postgres;

CREATE TYPE target.typ_enum_range_diff AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."C",
    SUBTYPE_OPCLASS = text_ops
);
ALTER TYPE target.typ_enum_range_diff
    OWNER TO postgres;

-- Sequences Script
CREATE SEQUENCE target.seq_tar
    CYCLE
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 3
    CACHE 6;
ALTER SEQUENCE target.seq_tar
    OWNER TO postgres;

CREATE SEQUENCE target.seq_diff_comment_acl
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

ALTER SEQUENCE target.seq_diff_comment_acl
    OWNER TO postgres;

CREATE SEQUENCE target.seq_diff_comment_acl_remove
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;
ALTER SEQUENCE target.seq_diff_comment_acl_remove
    OWNER TO postgres;
COMMENT ON SEQUENCE target.seq_diff_comment_acl_remove
    IS 'Test Comment';
GRANT ALL ON SEQUENCE target.seq_diff_comment_acl_remove TO PUBLIC;
GRANT ALL ON SEQUENCE target.seq_diff_comment_acl_remove TO postgres;

CREATE SEQUENCE target.seq_diff
    INCREMENT 5
    START 3
    MINVALUE 3
    MAXVALUE 80
    CACHE 1;

ALTER SEQUENCE target.seq_diff
    OWNER TO postgres;

CREATE SEQUENCE target.seq_start_diff
    INCREMENT 5
    START 1
    MINVALUE 1
    MAXVALUE 20;
ALTER SEQUENCE target.seq_start_diff
    OWNER TO postgres;

-- Foreign Data Wrapper to test foreign table
CREATE FOREIGN DATA WRAPPER test_fdw_for_foreign_table;
ALTER FOREIGN DATA WRAPPER test_fdw_for_foreign_table
    OWNER TO postgres;

-- Foreign Server to test foreign table
CREATE SERVER test_fs_for_foreign_table
    FOREIGN DATA WRAPPER test_fdw_for_foreign_table;
ALTER SERVER test_fs_for_foreign_table
    OWNER TO postgres;
CREATE SERVER test_fs2_for_foreign_table
    FOREIGN DATA WRAPPER test_fdw_for_foreign_table;
ALTER SERVER test_fs2_for_foreign_table
    OWNER TO postgres;

-- Table to test inheritance in foreign table
CREATE TABLE public.test_table_for_foreign_table
(
    tid bigint NOT NULL,
    tname text COLLATE pg_catalog."default",
    CONSTRAINT test_table_for_foreign_table_pkey PRIMARY KEY (tid)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;
ALTER TABLE public.test_table_for_foreign_table
    OWNER to postgres;

CREATE FOREIGN TABLE target.ft_tar(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table;
ALTER FOREIGN TABLE target.ft_tar
    OWNER TO postgres;
ALTER FOREIGN TABLE target.ft_tar
    ADD CONSTRAINT fcheck CHECK ((fid > 1000)) NO INHERIT;
COMMENT ON FOREIGN TABLE target.ft_tar
    IS 'Test Comment';
GRANT INSERT ON TABLE target.ft_tar TO PUBLIC;
GRANT ALL ON TABLE target.ft_tar TO postgres;

CREATE FOREIGN TABLE target.ft_diff_col(
    fid bigint NULL,
    fname text NOT NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table;
ALTER FOREIGN TABLE target.ft_diff_col
    OWNER TO postgres;
ALTER FOREIGN TABLE target.ft_diff_col
    ADD CONSTRAINT fcheck CHECK ((fid > 1000)) NO INHERIT;
COMMENT ON FOREIGN TABLE target.ft_diff_col
    IS 'Comment';
GRANT INSERT ON TABLE target.ft_diff_col TO PUBLIC;
GRANT ALL ON TABLE target.ft_diff_col TO postgres;

CREATE FOREIGN TABLE target.ft_diff_const(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table;
ALTER FOREIGN TABLE target.ft_diff_const
    OWNER TO postgres;

ALTER FOREIGN TABLE target.ft_diff_const
    ADD CONSTRAINT fcheck CHECK ((fid > 1000)) NO INHERIT;
ALTER FOREIGN TABLE target.ft_diff_const
    ADD CONSTRAINT fcheck1 CHECK ((fid > 50)) NO INHERIT NOT VALID;
ALTER FOREIGN TABLE target.ft_diff_const
    ADD CONSTRAINT fcheck2 CHECK ((fid > 20)) NO INHERIT;
ALTER FOREIGN TABLE target.ft_diff_const
    ADD CONSTRAINT fcheck_tar CHECK ((fid > 50));

GRANT INSERT ON TABLE target.ft_diff_const TO PUBLIC;
GRANT ALL ON TABLE target.ft_diff_const TO postgres;

CREATE FOREIGN TABLE target.ft_diff_opt(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table
    OPTIONS (opt1 'val1', opt2 'val30', opt_tar 'val_tar');

ALTER FOREIGN TABLE target.ft_diff_opt
    OWNER TO postgres;

CREATE FOREIGN TABLE target.ft_diff_foreign_server(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs2_for_foreign_table;
ALTER FOREIGN TABLE target.ft_diff_foreign_server
    OWNER TO postgres;

CREATE FOREIGN TABLE target.ft_diff_foreign_server_1(
    fid bigint NULL,
    fcity text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs2_for_foreign_table
    OPTIONS (opt1 'val1', opt2 'val2');
ALTER FOREIGN TABLE target.ft_diff_foreign_server_1
    OWNER TO postgres;
ALTER FOREIGN TABLE target.ft_diff_foreign_server_1
    ADD CONSTRAINT cs2 CHECK ((fid > 200)) NO INHERIT;

-- Test for RM #5350
CREATE TABLE target.events_transactions
(
    event_code integer,
    numerator integer,
    account_token text COLLATE pg_catalog."default",
    transaction_dt timestamp without time zone,
    payment_method integer,
    approval text COLLATE pg_catalog."default",
    amount integer,
    file_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    file_name character varying(256) COLLATE pg_catalog."default",
    payment_pin integer,
    transfer_dt timestamp without time zone,
    transaction_type integer
);
