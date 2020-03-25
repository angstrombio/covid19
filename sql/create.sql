-- As sa; fill in actual passwords when running:
CREATE USER coronadb WITH PASSWORD '' CREATEDB;
CREATE USER corona WITH PASSWORD '';

-- As coronadb:
CREATE DATABASE corona WITH OWNER=coronadb;
CREATE SCHEMA IF NOT EXISTS covid19 AUTHORIZATION coronadb;
CREATE TABLE covid19.jhu (
    file_date DATE NOT NULL,
    fips VARCHAR,
    country VARCHAR,
    state VARCHAR,
    county VARCHAR,
    lat VARCHAR,
    long VARCHAR,
    last_update TIMESTAMP NOT NULL,
    cases INTEGER,
    deaths INTEGER,
    recovered INTEGER,
    active INTEGER,
    combined_key VARCHAR
)
GRANT CONNECT ON DATABASE corona TO corona;
GRANT USAGE ON SCHEMA covid19 TO corona;
GRANT SELECT ON ALL TABLES IN SCHEMA covid19 TO corona;
GRANT UPDATE ON ALL TABLES IN SCHEMA covid19 TO corona;
GRANT INSERT ON ALL TABLES IN SCHEMA covid19 TO corona;
GRANT DELETE ON TABLE covid19.jhu TO corona;

CREATE MATERIALIZED VIEW covid19.jhu_derived AS
    select x.*, prior.file_date as prior_date,
    prior.cases as prior_cases, case when prior.cases is null then coalesce(x.cases,0) else x.cases-prior.cases end as cases_delta,
    prior.deaths as prior_deaths, case when prior.deaths is null then coalesce(x.deaths,0) else x.deaths-prior.deaths end as deaths_delta,
    prior.recovered as prior_recovered, case when prior.recovered is null then coalesce(x.recovered,0) else x.recovered-prior.recovered end as recovered_delta,
    prior.active as prior_active, case when prior.active is null then coalesce(x.active,0) else x.active-prior.active end as active_delta
    from covid19.jhu x
        left outer join covid19.jhu prior
        on prior.file_date=x.file_date-1
        and prior.country=x.country
        and ((prior.state is null and x.state is null) or (prior.state=x.state))
        and ((prior.county is null and x.county is null) or (prior.county=x.county))
        and ((prior.fips is null and x.fips is null) or (prior.fips=x.fips))


CREATE VIEW covid19.cases_us_all AS select * from covid19.jhu_derived WHERE country='US'

CREATE VIEW covid19.cases_us_current AS select * from covid19.jhu_derived WHERE country='US' AND file_date=(select max(file_date) from covid19.jhu)