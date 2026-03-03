--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4 (Debian 17.4-1.pgdg120+2)
-- Dumped by pg_dump version 17.4 (Debian 17.4-1.pgdg120+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgboss; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA pgboss;


ALTER SCHEMA pgboss OWNER TO postgres;

--
-- Name: job_state; Type: TYPE; Schema: pgboss; Owner: postgres
--

CREATE TYPE pgboss.job_state AS ENUM (
    'created',
    'retry',
    'active',
    'completed',
    'expired',
    'cancelled',
    'failed'
);


ALTER TYPE pgboss.job_state OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: archive; Type: TABLE; Schema: pgboss; Owner: postgres
--

CREATE TABLE pgboss.archive (
    id uuid NOT NULL,
    name text NOT NULL,
    priority integer NOT NULL,
    data jsonb,
    state pgboss.job_state NOT NULL,
    retrylimit integer NOT NULL,
    retrycount integer NOT NULL,
    retrydelay integer NOT NULL,
    retrybackoff boolean NOT NULL,
    startafter timestamp with time zone NOT NULL,
    startedon timestamp with time zone,
    singletonkey text,
    singletonon timestamp without time zone,
    expirein interval NOT NULL,
    createdon timestamp with time zone NOT NULL,
    completedon timestamp with time zone,
    keepuntil timestamp with time zone NOT NULL,
    on_complete boolean NOT NULL,
    output jsonb,
    archivedon timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE pgboss.archive OWNER TO postgres;

--
-- Name: job; Type: TABLE; Schema: pgboss; Owner: postgres
--

CREATE TABLE pgboss.job (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    data jsonb,
    state pgboss.job_state DEFAULT 'created'::pgboss.job_state NOT NULL,
    retrylimit integer DEFAULT 0 NOT NULL,
    retrycount integer DEFAULT 0 NOT NULL,
    retrydelay integer DEFAULT 0 NOT NULL,
    retrybackoff boolean DEFAULT false NOT NULL,
    startafter timestamp with time zone DEFAULT now() NOT NULL,
    startedon timestamp with time zone,
    singletonkey text,
    singletonon timestamp without time zone,
    expirein interval DEFAULT '00:15:00'::interval NOT NULL,
    createdon timestamp with time zone DEFAULT now() NOT NULL,
    completedon timestamp with time zone,
    keepuntil timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    on_complete boolean DEFAULT false NOT NULL,
    output jsonb
);


ALTER TABLE pgboss.job OWNER TO postgres;

--
-- Name: schedule; Type: TABLE; Schema: pgboss; Owner: postgres
--

CREATE TABLE pgboss.schedule (
    name text NOT NULL,
    cron text NOT NULL,
    timezone text,
    data jsonb,
    options jsonb,
    created_on timestamp with time zone DEFAULT now() NOT NULL,
    updated_on timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE pgboss.schedule OWNER TO postgres;

--
-- Name: subscription; Type: TABLE; Schema: pgboss; Owner: postgres
--

CREATE TABLE pgboss.subscription (
    event text NOT NULL,
    name text NOT NULL,
    created_on timestamp with time zone DEFAULT now() NOT NULL,
    updated_on timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE pgboss.subscription OWNER TO postgres;

--
-- Name: version; Type: TABLE; Schema: pgboss; Owner: postgres
--

CREATE TABLE pgboss.version (
    version integer NOT NULL,
    maintained_on timestamp with time zone,
    cron_on timestamp with time zone
);


ALTER TABLE pgboss.version OWNER TO postgres;

--
-- Name: ballotDB; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ballotDB" (
    ballot_id character varying NOT NULL,
    election_id character varying,
    user_id character varying,
    status character varying,
    date_submitted character varying,
    votes json NOT NULL,
    history json,
    precinct character varying,
    ip_hash character varying,
    create_date character varying NOT NULL,
    update_date character varying NOT NULL,
    head boolean NOT NULL
);


ALTER TABLE public."ballotDB" OWNER TO postgres;

--
-- Name: electionDB; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."electionDB" (
    election_id character varying NOT NULL,
    title character varying,
    description text,
    frontend_url character varying,
    start_time character varying,
    end_time character varying,
    owner_id character varying,
    audit_ids json,
    admin_ids json,
    credential_ids json,
    state character varying,
    races json NOT NULL,
    settings json,
    auth_key character varying,
    claim_key_hash character varying,
    is_public boolean,
    create_date character varying NOT NULL,
    update_date character varying NOT NULL,
    head boolean NOT NULL,
    ballot_source character varying DEFAULT 'live_election'::character varying NOT NULL,
    public_archive_id character varying
);


ALTER TABLE public."electionDB" OWNER TO postgres;

--
-- Name: electionRollDB; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."electionRollDB" (
    voter_id character varying NOT NULL,
    election_id character varying NOT NULL,
    email character varying,
    submitted boolean NOT NULL,
    ballot_id character varying,
    address character varying,
    state character varying NOT NULL,
    history json,
    registration json,
    precinct character varying,
    email_data json,
    ip_hash character varying,
    create_date character varying NOT NULL,
    update_date character varying NOT NULL,
    head boolean NOT NULL
);


ALTER TABLE public."electionRollDB" OWNER TO postgres;

--
-- Name: kysely_migration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kysely_migration (
    name character varying(255) NOT NULL,
    "timestamp" character varying(255) NOT NULL
);


ALTER TABLE public.kysely_migration OWNER TO postgres;

--
-- Name: kysely_migration_lock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kysely_migration_lock (
    id character varying(255) NOT NULL,
    is_locked integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.kysely_migration_lock OWNER TO postgres;

--
-- Data for Name: archive; Type: TABLE DATA; Schema: pgboss; Owner: postgres
--

COPY pgboss.archive (id, name, priority, data, state, retrylimit, retrycount, retrydelay, retrybackoff, startafter, startedon, singletonkey, singletonon, expirein, createdon, completedon, keepuntil, on_complete, output, archivedon) FROM stdin;
\.


--
-- Data for Name: job; Type: TABLE DATA; Schema: pgboss; Owner: postgres
--

COPY pgboss.job (id, name, priority, data, state, retrylimit, retrycount, retrydelay, retrybackoff, startafter, startedon, singletonkey, singletonon, expirein, createdon, completedon, keepuntil, on_complete, output) FROM stdin;
4f15833d-41f1-4871-9c4e-c7e7cff13e41	__pgboss__maintenance	0	\N	completed	0	0	0	f	2025-04-15 23:48:55.07849+00	2025-04-15 23:48:55.116601+00	__pgboss__maintenance	\N	00:15:00	2025-04-15 23:48:55.07849+00	2025-04-15 23:48:55.196409+00	2025-04-15 23:56:55.07849+00	f	\N
1b724471-f328-4a5e-8b0c-0313cd2aad19	__pgboss__maintenance	0	\N	completed	0	0	0	f	2025-04-15 23:48:55.225736+00	2025-04-15 23:48:55.263112+00	__pgboss__maintenance	\N	00:15:00	2025-04-15 23:48:55.225736+00	2025-04-15 23:48:55.476041+00	2025-04-15 23:56:55.225736+00	f	\N
17647668-0a75-493e-bbd7-5db238ecbc6e	__pgboss__cron	0	\N	completed	2	0	0	f	2025-04-15 23:48:55.530845+00	2025-04-15 23:48:55.563751+00	\N	2025-04-15 23:48:00	00:15:00	2025-04-15 23:48:55.530845+00	2025-04-15 23:48:55.641169+00	2025-04-15 23:49:55.530845+00	f	\N
9d521fd9-a926-4ff7-96c5-f6fd4600b16f	__pgboss__cron	0	\N	completed	2	0	0	f	2025-04-15 23:49:01.753332+00	2025-04-15 23:49:03.260345+00	\N	2025-04-15 23:49:00	00:15:00	2025-04-15 23:48:55.753332+00	2025-04-15 23:49:03.278602+00	2025-04-15 23:50:01.753332+00	f	\N
93391095-8282-4968-94e4-2df27980cd59	__pgboss__cron	0	\N	completed	2	0	0	f	2025-04-15 23:50:01.274864+00	2025-04-15 23:50:03.258886+00	\N	2025-04-15 23:50:00	00:15:00	2025-04-15 23:49:03.274864+00	2025-04-15 23:50:03.267577+00	2025-04-15 23:51:01.274864+00	f	\N
46200357-73dd-4606-9b0f-a3a08e02aef3	__pgboss__cron	0	\N	completed	2	0	0	f	2025-04-15 23:51:01.265048+00	2025-04-15 23:51:03.261345+00	\N	2025-04-15 23:51:00	00:15:00	2025-04-15 23:50:03.265048+00	2025-04-15 23:51:03.274141+00	2025-04-15 23:52:01.265048+00	f	\N
87fd81cd-e54e-4af2-977f-36fe21220608	__pgboss__maintenance	0	\N	completed	0	0	0	f	2025-04-15 23:50:55.526604+00	2025-04-15 23:51:55.0873+00	__pgboss__maintenance	\N	00:15:00	2025-04-15 23:48:55.526604+00	2025-04-15 23:51:55.100411+00	2025-04-15 23:58:55.526604+00	f	\N
8e9e3f9c-4733-434a-b31a-8a09a58da43e	__pgboss__maintenance	0	\N	created	0	0	0	f	2025-04-15 23:53:55.103849+00	\N	__pgboss__maintenance	\N	00:15:00	2025-04-15 23:51:55.103849+00	\N	2025-04-16 00:01:55.103849+00	f	\N
7789cd63-c673-4009-a9ca-a2faf9621c93	__pgboss__cron	0	\N	created	2	0	0	f	2025-04-15 23:53:01.27188+00	\N	\N	2025-04-15 23:53:00	00:15:00	2025-04-15 23:52:03.27188+00	\N	2025-04-15 23:54:01.27188+00	f	\N
47e742c8-f2d3-4b68-a028-670e96218a9c	__pgboss__cron	0	\N	completed	2	0	0	f	2025-04-15 23:52:01.271403+00	2025-04-15 23:52:03.262159+00	\N	2025-04-15 23:52:00	00:15:00	2025-04-15 23:51:03.271403+00	2025-04-15 23:52:03.273671+00	2025-04-15 23:53:01.271403+00	f	\N
\.


--
-- Data for Name: schedule; Type: TABLE DATA; Schema: pgboss; Owner: postgres
--

COPY pgboss.schedule (name, cron, timezone, data, options, created_on, updated_on) FROM stdin;
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: pgboss; Owner: postgres
--

COPY pgboss.subscription (event, name, created_on, updated_on) FROM stdin;
\.


--
-- Data for Name: version; Type: TABLE DATA; Schema: pgboss; Owner: postgres
--

COPY pgboss.version (version, maintained_on, cron_on) FROM stdin;
20	2025-04-15 23:51:55.097862+00	2025-04-15 23:52:03.269272+00
\.


--
-- Data for Name: ballotDB; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ballotDB" (ballot_id, election_id, user_id, status, date_submitted, votes, history, precinct, ip_hash, create_date, update_date, head) FROM stdin;
\.


--
-- Data for Name: electionDB; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."electionDB" (election_id, title, description, frontend_url, start_time, end_time, owner_id, audit_ids, admin_ids, credential_ids, state, races, settings, auth_key, claim_key_hash, is_public, create_date, update_date, head, ballot_source, public_archive_id) FROM stdin;
4xtfb4	Demo Election			\N	\N	7bdcad1b-55cd-4cfd-842f-6be3fa89f1c3	\N	\N	\N	draft	[]	{"voter_authentication":{"voter_id":false,"email":false,"ip_address":false},"ballot_updates":false,"public_results":true,"time_zone":"America/Denver","random_candidate_order":false,"require_instruction_confirmation":true,"term_type":"election","voter_access":"open","contact_email":""}	\N	\N	\N	2025-04-15T23:51:28.526Z	1744761088526	f	live_election	\N
4xtfb4	Demo Election			\N	\N	7bdcad1b-55cd-4cfd-842f-6be3fa89f1c3	\N	\N	\N	draft	[]	{"voter_authentication":{"voter_id":false,"email":false,"ip_address":false},"ballot_updates":false,"public_results":true,"time_zone":"America/Denver","random_candidate_order":false,"require_instruction_confirmation":true,"term_type":"election","voter_access":"open","contact_email":""}	\N	\N	t	2025-04-15T23:51:28.526Z	1744761097565	f	live_election	\N
4xtfb4	Demo Election			\N	\N	7bdcad1b-55cd-4cfd-842f-6be3fa89f1c3	\N	\N	\N	draft	[{"title":"Demo Race","description":"Demo Race Description","race_id":"9db1981a-5d76-403b-990f-16d584f6f4ac","num_winners":1,"voting_method":"STAR","candidates":[{"candidate_id":"08bd9314-c946-47c8-9136-8b19142a4fc2","candidate_name":"Candidate 1"},{"candidate_id":"037e8145-1a39-4c08-9b7e-4f977906f47e","candidate_name":"Candidate 2"},{"candidate_id":"9a78e281-20cd-469f-940f-114aa1eae50f","candidate_name":"Candidate 3"},{"candidate_id":"437faabe-c8db-41fe-83a0-e2407b76735b","candidate_name":"Candidate 4"}]}]	{"voter_authentication":{"voter_id":false,"email":false,"ip_address":false},"ballot_updates":false,"public_results":true,"time_zone":"America/Denver","random_candidate_order":false,"require_instruction_confirmation":true,"term_type":"election","voter_access":"open","contact_email":""}	\N	\N	t	2025-04-15T23:51:28.526Z	1744761147142	f	live_election	\N
4xtfb4	Demo Election			\N	\N	7bdcad1b-55cd-4cfd-842f-6be3fa89f1c3	\N	\N	\N	finalized	[{"title":"Demo Race","description":"Demo Race Description","race_id":"9db1981a-5d76-403b-990f-16d584f6f4ac","num_winners":1,"voting_method":"STAR","candidates":[{"candidate_id":"08bd9314-c946-47c8-9136-8b19142a4fc2","candidate_name":"Candidate 1"},{"candidate_id":"037e8145-1a39-4c08-9b7e-4f977906f47e","candidate_name":"Candidate 2"},{"candidate_id":"9a78e281-20cd-469f-940f-114aa1eae50f","candidate_name":"Candidate 3"},{"candidate_id":"437faabe-c8db-41fe-83a0-e2407b76735b","candidate_name":"Candidate 4"}]}]	{"voter_authentication":{"voter_id":false,"email":false,"ip_address":false},"ballot_updates":false,"public_results":true,"time_zone":"America/Denver","random_candidate_order":false,"require_instruction_confirmation":true,"term_type":"election","voter_access":"open","contact_email":""}	\N	\N	t	2025-04-15T23:51:28.526Z	1744761153873	f	live_election	\N
4xtfb4	Demo Election			\N	\N	7bdcad1b-55cd-4cfd-842f-6be3fa89f1c3	\N	\N	\N	open	[{"title":"Demo Race","description":"Demo Race Description","race_id":"9db1981a-5d76-403b-990f-16d584f6f4ac","num_winners":1,"voting_method":"STAR","candidates":[{"candidate_id":"08bd9314-c946-47c8-9136-8b19142a4fc2","candidate_name":"Candidate 1"},{"candidate_id":"037e8145-1a39-4c08-9b7e-4f977906f47e","candidate_name":"Candidate 2"},{"candidate_id":"9a78e281-20cd-469f-940f-114aa1eae50f","candidate_name":"Candidate 3"},{"candidate_id":"437faabe-c8db-41fe-83a0-e2407b76735b","candidate_name":"Candidate 4"}]}]	{"voter_authentication":{"voter_id":false,"email":false,"ip_address":false},"ballot_updates":false,"public_results":true,"time_zone":"America/Denver","random_candidate_order":false,"require_instruction_confirmation":true,"term_type":"election","voter_access":"open","contact_email":""}	\N	\N	t	2025-04-15T23:51:28.526Z	1744761154296	t	live_election	\N
\.


--
-- Data for Name: electionRollDB; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."electionRollDB" (voter_id, election_id, email, submitted, ballot_id, address, state, history, registration, precinct, email_data, ip_hash, create_date, update_date, head) FROM stdin;
\.


--
-- Data for Name: kysely_migration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kysely_migration (name, "timestamp") FROM stdin;
2023_07_03_Initial	2025-04-15T23:48:53.200Z
2024_01_27_Create_Date	2025-04-15T23:48:53.215Z
2024_01_29_pkeys_and_heads	2025-04-15T23:48:53.249Z
2025_01_29_admin_upload	2025-04-15T23:48:53.253Z
\.


--
-- Data for Name: kysely_migration_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kysely_migration_lock (id, is_locked) FROM stdin;
migration_lock	0
\.


--
-- Name: job job_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: postgres
--

ALTER TABLE ONLY pgboss.job
    ADD CONSTRAINT job_pkey PRIMARY KEY (id);


--
-- Name: schedule schedule_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: postgres
--

ALTER TABLE ONLY pgboss.schedule
    ADD CONSTRAINT schedule_pkey PRIMARY KEY (name);


--
-- Name: subscription subscription_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: postgres
--

ALTER TABLE ONLY pgboss.subscription
    ADD CONSTRAINT subscription_pkey PRIMARY KEY (event, name);


--
-- Name: version version_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: postgres
--

ALTER TABLE ONLY pgboss.version
    ADD CONSTRAINT version_pkey PRIMARY KEY (version);


--
-- Name: ballotDB ballotDB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ballotDB"
    ADD CONSTRAINT "ballotDB_pkey" PRIMARY KEY (ballot_id, update_date);


--
-- Name: electionDB electionDB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."electionDB"
    ADD CONSTRAINT "electionDB_pkey" PRIMARY KEY (election_id, update_date);


--
-- Name: electionRollDB electionRollDB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."electionRollDB"
    ADD CONSTRAINT "electionRollDB_pkey" PRIMARY KEY (election_id, voter_id, update_date);


--
-- Name: kysely_migration_lock kysely_migration_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kysely_migration_lock
    ADD CONSTRAINT kysely_migration_lock_pkey PRIMARY KEY (id);


--
-- Name: kysely_migration kysely_migration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kysely_migration
    ADD CONSTRAINT kysely_migration_pkey PRIMARY KEY (name);


--
-- Name: archive_archivedon_idx; Type: INDEX; Schema: pgboss; Owner: postgres
--

CREATE INDEX archive_archivedon_idx ON pgboss.archive USING btree (archivedon);


--
-- Name: archive_id_idx; Type: INDEX; Schema: pgboss; Owner: postgres
--

CREATE INDEX archive_id_idx ON pgboss.archive USING btree (id);


--
-- Name: job_fetch; Type: INDEX; Schema: pgboss; Owner: postgres
--

CREATE INDEX job_fetch ON pgboss.job USING btree (name text_pattern_ops, startafter) WHERE (state < 'active'::pgboss.job_state);


--
-- Name: job_name; Type: INDEX; Schema: pgboss; Owner: postgres
--

CREATE INDEX job_name ON pgboss.job USING btree (name text_pattern_ops);


--
-- Name: job_singleton_queue; Type: INDEX; Schema: pgboss; Owner: postgres
--

CREATE UNIQUE INDEX job_singleton_queue ON pgboss.job USING btree (name, singletonkey) WHERE ((state < 'active'::pgboss.job_state) AND (singletonon IS NULL) AND (singletonkey ~~ '\_\_pgboss\_\_singleton\_queue%'::text));


--
-- Name: job_singletonkey; Type: INDEX; Schema: pgboss; Owner: postgres
--

CREATE UNIQUE INDEX job_singletonkey ON pgboss.job USING btree (name, singletonkey) WHERE ((state < 'completed'::pgboss.job_state) AND (singletonon IS NULL) AND (NOT (singletonkey ~~ '\_\_pgboss\_\_singleton\_queue%'::text)));


--
-- Name: job_singletonkeyon; Type: INDEX; Schema: pgboss; Owner: postgres
--

CREATE UNIQUE INDEX job_singletonkeyon ON pgboss.job USING btree (name, singletonon, singletonkey) WHERE (state < 'expired'::pgboss.job_state);


--
-- Name: job_singletonon; Type: INDEX; Schema: pgboss; Owner: postgres
--

CREATE UNIQUE INDEX job_singletonon ON pgboss.job USING btree (name, singletonon) WHERE ((state < 'expired'::pgboss.job_state) AND (singletonkey IS NULL));


--
-- Name: electionDB_head; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "electionDB_head" ON public."electionDB" USING btree (head);


--
-- PostgreSQL database dump complete
--

