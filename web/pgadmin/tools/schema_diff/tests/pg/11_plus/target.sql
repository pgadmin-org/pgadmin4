--
-- PostgreSQL database dump
--

-- Dumped from database version 10.7
-- Dumped by pg_dump version 12beta2

-- Started on 2019-11-01 12:55:22 IST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

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
-- TOC entry 12277 (class 1259 OID 149234)
-- Name: table_for_partition_1; Type: TABLE; Schema: target; Owner: postgres
--

CREATE TABLE target.table_for_partition_1 (
    col1 bigint
)
PARTITION BY RANGE (col1);


ALTER TABLE target.table_for_partition_1 OWNER TO postgres;

--
-- TOC entry 12278 (class 1259 OID 149237)
-- Name: part3; Type: TABLE; Schema: target; Owner: postgres
--

CREATE TABLE target.part3 (
    col1 bigint
);
ALTER TABLE ONLY target.table_for_partition_1 ATTACH PARTITION target.part3 FOR VALUES FROM ('13') TO ('56');


ALTER TABLE target.part3 OWNER TO postgres;

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


--
-- TOC entry 12284 (class 1259 OID 347823)
-- Name: test view; Type: VIEW; Schema: target; Owner: postgres
--

CREATE VIEW target."test view" AS
 SELECT pg_class.relname,
    pg_class.relnamespace,
    pg_class.reltype,
    pg_class.reloftype,
    pg_class.relowner,
    pg_class.relam,
    pg_class.relfilenode,
    pg_class.reltablespace,
    pg_class.relpages,
    pg_class.reltuples,
    pg_class.relallvisible,
    pg_class.reltoastrelid,
    pg_class.relhasindex,
    pg_class.relisshared,
    pg_class.relpersistence,
    pg_class.relkind,
    pg_class.relnatts,
    pg_class.relchecks,
    pg_class.relhasoids,
    pg_class.relhasrules,
    pg_class.relhastriggers,
    pg_class.relhassubclass,
    pg_class.relrowsecurity,
    pg_class.relforcerowsecurity,
    pg_class.relispopulated,
    pg_class.relreplident,
    pg_class.relispartition,
    pg_class.relfrozenxid,
    pg_class.relminmxid,
    pg_class.relacl,
    pg_class.reloptions,
    pg_class.relpartbound
   FROM pg_class
 LIMIT 10;


ALTER TABLE target."test view" OWNER TO postgres;

--
-- TOC entry 12285 (class 1259 OID 347828)
-- Name: test view f; Type: VIEW; Schema: target; Owner: postgres
--

CREATE VIEW target."test view f" WITH (security_barrier='true') AS
 SELECT 2;


ALTER TABLE target."test view f" OWNER TO postgres;

--
-- TOC entry 61105 (class 0 OID 0)
-- Dependencies: 12285
-- Name: VIEW "test view f"; Type: COMMENT; Schema: target; Owner: postgres
--

COMMENT ON VIEW target."test view f" IS 'cmn';

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
