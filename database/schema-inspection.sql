--
-- PostgreSQL database dump
--

\restrict ebII3lQoFguS1f5PLOmF4NSP604vVT7iuVTaEdWXvxdQaiKmvke6MujgvcMfn9M

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_users (
    user_id bigint NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    given_name character varying(120) CONSTRAINT app_users_first_name_not_null NOT NULL,
    middle_name character varying(120),
    family_name character varying(120) CONSTRAINT app_users_last_name_not_null NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: app_users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.app_users ALTER COLUMN user_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.app_users_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: document_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_requests (
    request_id bigint NOT NULL,
    reference_number character varying(40) NOT NULL,
    document_type_id smallint NOT NULL,
    student_user_id bigint NOT NULL,
    status character varying(30) DEFAULT 'Pending'::character varying NOT NULL,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT document_requests_status_check CHECK (((status)::text = ANY ((ARRAY['Draft'::character varying, 'Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying, 'Returned for Revision'::character varying, 'Completed'::character varying, 'Cancelled'::character varying])::text[])))
);


--
-- Name: document_requests_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.document_requests ALTER COLUMN request_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.document_requests_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: document_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_types (
    document_type_id smallint NOT NULL,
    document_code character varying(40) NOT NULL,
    document_name character varying(120) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: document_types_document_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.document_types ALTER COLUMN document_type_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.document_types_document_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: leave_of_absence_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_of_absence_details (
    request_id bigint NOT NULL,
    reason text NOT NULL,
    CONSTRAINT leave_of_absence_details_reason_check CHECK ((length(TRIM(BOTH FROM reason)) > 0))
);


--
-- Name: load_revision_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.load_revision_details (
    request_id bigint NOT NULL,
    academic_term character varying(30) NOT NULL,
    school_year character varying(15) NOT NULL,
    family_name character varying(60) NOT NULL,
    given_name character varying(60) NOT NULL,
    middle_name character varying(60),
    student_number character varying(30) NOT NULL,
    permit_date date NOT NULL,
    college character varying(120) NOT NULL,
    department character varying(120) NOT NULL,
    course_year character varying(100) NOT NULL,
    load_before_units numeric(6,2) NOT NULL,
    load_before_hours numeric(6,2) NOT NULL,
    load_after_units numeric(6,2) NOT NULL,
    load_after_hours numeric(6,2) NOT NULL,
    conflict_of_schedule boolean DEFAULT false NOT NULL,
    subjects_dissolved boolean DEFAULT false NOT NULL,
    other_reason text,
    student_signature_name character varying(150) NOT NULL,
    CONSTRAINT load_revision_details_academic_term_check CHECK (((academic_term)::text = ANY ((ARRAY['1st Semester'::character varying, '2nd Semester'::character varying, 'Summer Term'::character varying])::text[]))),
    CONSTRAINT load_revision_details_check CHECK (((conflict_of_schedule = true) OR (subjects_dissolved = true) OR (NULLIF(TRIM(BOTH FROM other_reason), ''::text) IS NOT NULL))),
    CONSTRAINT load_revision_details_load_after_hours_check CHECK ((load_after_hours >= (0)::numeric)),
    CONSTRAINT load_revision_details_load_after_units_check CHECK ((load_after_units >= (0)::numeric)),
    CONSTRAINT load_revision_details_load_before_hours_check CHECK ((load_before_hours >= (0)::numeric)),
    CONSTRAINT load_revision_details_load_before_units_check CHECK ((load_before_units >= (0)::numeric))
);


--
-- Name: load_revision_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.load_revision_subjects (
    subject_id bigint NOT NULL,
    request_id bigint NOT NULL,
    revision_action character varying(10) NOT NULL,
    course_number_section character varying(50) NOT NULL,
    course_title character varying(150) NOT NULL,
    units numeric(4,2) NOT NULL,
    is_closed_subject boolean DEFAULT false NOT NULL,
    CONSTRAINT load_revision_subjects_check CHECK ((((revision_action)::text = 'ADD'::text) OR (is_closed_subject = false))),
    CONSTRAINT load_revision_subjects_revision_action_check CHECK (((revision_action)::text = ANY ((ARRAY['ADD'::character varying, 'WITHDRAW'::character varying])::text[]))),
    CONSTRAINT load_revision_subjects_units_check CHECK ((units > (0)::numeric))
);


--
-- Name: load_revision_subjects_subject_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.load_revision_subjects ALTER COLUMN subject_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.load_revision_subjects_subject_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: personnel_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personnel_profiles (
    personnel_profile_id bigint NOT NULL,
    user_id bigint NOT NULL,
    employee_number character varying(30),
    college character varying(120),
    department character varying(120),
    position_title character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: personnel_profiles_personnel_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.personnel_profiles ALTER COLUMN personnel_profile_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.personnel_profiles_personnel_profile_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    role_id bigint NOT NULL,
    role_code character varying(30) NOT NULL,
    role_name character varying(60) NOT NULL,
    description text
);


--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.roles ALTER COLUMN role_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.roles_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: shifter_application_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifter_application_details (
    request_id bigint NOT NULL,
    reason text NOT NULL,
    CONSTRAINT shifter_application_details_reason_check CHECK ((length(TRIM(BOTH FROM reason)) > 0))
);


--
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_profiles (
    student_profile_id bigint NOT NULL,
    user_id bigint NOT NULL,
    student_number character varying(30) NOT NULL,
    college character varying(120),
    department character varying(120),
    program character varying(120),
    year_level integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT student_profiles_year_level_check CHECK (((year_level >= 1) AND (year_level <= 10)))
);


--
-- Name: student_profiles_student_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.student_profiles ALTER COLUMN student_profile_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.student_profiles_student_profile_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id bigint NOT NULL,
    role_id bigint NOT NULL,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: app_users app_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_email_key UNIQUE (email);


--
-- Name: app_users app_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (user_id);


--
-- Name: document_requests document_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_pkey PRIMARY KEY (request_id);


--
-- Name: document_requests document_requests_reference_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_reference_number_key UNIQUE (reference_number);


--
-- Name: document_types document_types_document_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_document_code_key UNIQUE (document_code);


--
-- Name: document_types document_types_document_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_document_name_key UNIQUE (document_name);


--
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (document_type_id);


--
-- Name: leave_of_absence_details leave_of_absence_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_of_absence_details
    ADD CONSTRAINT leave_of_absence_details_pkey PRIMARY KEY (request_id);


--
-- Name: load_revision_details load_revision_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.load_revision_details
    ADD CONSTRAINT load_revision_details_pkey PRIMARY KEY (request_id);


--
-- Name: load_revision_subjects load_revision_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.load_revision_subjects
    ADD CONSTRAINT load_revision_subjects_pkey PRIMARY KEY (subject_id);


--
-- Name: personnel_profiles personnel_profiles_employee_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_profiles
    ADD CONSTRAINT personnel_profiles_employee_number_key UNIQUE (employee_number);


--
-- Name: personnel_profiles personnel_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_profiles
    ADD CONSTRAINT personnel_profiles_pkey PRIMARY KEY (personnel_profile_id);


--
-- Name: personnel_profiles personnel_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_profiles
    ADD CONSTRAINT personnel_profiles_user_id_key UNIQUE (user_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: roles roles_role_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_code_key UNIQUE (role_code);


--
-- Name: roles roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);


--
-- Name: shifter_application_details shifter_application_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifter_application_details
    ADD CONSTRAINT shifter_application_details_pkey PRIMARY KEY (request_id);


--
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (student_profile_id);


--
-- Name: student_profiles student_profiles_student_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_student_number_key UNIQUE (student_number);


--
-- Name: student_profiles student_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (sid);


--
-- Name: idx_requests_document_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_document_type ON public.document_requests USING btree (document_type_id);


--
-- Name: idx_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_status ON public.document_requests USING btree (status);


--
-- Name: idx_requests_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_student ON public.document_requests USING btree (student_user_id);


--
-- Name: idx_requests_submitted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_submitted ON public.document_requests USING btree (submitted_at);


--
-- Name: idx_revision_subjects_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision_subjects_request ON public.load_revision_subjects USING btree (request_id);


--
-- Name: idx_user_sessions_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_expire ON public.user_sessions USING btree (expire);


--
-- Name: document_requests document_requests_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(document_type_id) ON DELETE RESTRICT;


--
-- Name: document_requests document_requests_student_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_student_user_id_fkey FOREIGN KEY (student_user_id) REFERENCES public.app_users(user_id) ON DELETE RESTRICT;


--
-- Name: leave_of_absence_details leave_of_absence_details_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_of_absence_details
    ADD CONSTRAINT leave_of_absence_details_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.document_requests(request_id) ON DELETE CASCADE;


--
-- Name: load_revision_details load_revision_details_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.load_revision_details
    ADD CONSTRAINT load_revision_details_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.document_requests(request_id) ON DELETE CASCADE;


--
-- Name: load_revision_subjects load_revision_subjects_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.load_revision_subjects
    ADD CONSTRAINT load_revision_subjects_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.load_revision_details(request_id) ON DELETE CASCADE;


--
-- Name: personnel_profiles personnel_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_profiles
    ADD CONSTRAINT personnel_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(user_id) ON DELETE CASCADE;


--
-- Name: shifter_application_details shifter_application_details_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifter_application_details
    ADD CONSTRAINT shifter_application_details_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.document_requests(request_id) ON DELETE CASCADE;


--
-- Name: student_profiles student_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(user_id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE RESTRICT;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ebII3lQoFguS1f5PLOmF4NSP604vVT7iuVTaEdWXvxdQaiKmvke6MujgvcMfn9M

