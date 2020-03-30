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
);
CREATE TABLE covid19.census (
    region INTEGER NOT NULL,
    division INTEGER NOT NULL,
    state_num INTEGER NOT NULL,
    county_num INTEGER NOT NULL,
    fips VARCHAR NOT NULL,
    state VARCHAR NOT NULL,
    county VARCHAR NOT NULL,
    pop_2018 INTEGER NOT NULL
);


CREATE TABLE covid19.census_msa (
    cbsa INTEGER NOT NULL,
    msa_name VARCHAR NOT NULL,
    msa_type VARCHAR NOT NULL,
    pop_2018 INTEGER NOT NULL
);

CREATE TABLE covid19.census_mdiv (
    cbsa INTEGER NOT NULL,
    mdiv INTEGER NOT NULL,
    mdiv_name VARCHAR NOT NULL,
    pop_2018 INTEGER NOT NULL
);

CREATE TABLE covid19.census_msa_counties (
    cbsa INTEGER NOT NULL,
    fips_stcou VARCHAR NOT NULL,
    county_name VARCHAR NOT NULL,
    pop_2018 INTEGER NOT NULL
);

CREATE TABLE covid19.census_mdiv_counties (
    cbsa INTEGER NOT NULL,
    mdiv INTEGER NOT NULL,
    fips_stcou VARCHAR NOT NULL,
    county_name VARCHAR NOT NULL,
    pop_2018 INTEGER NOT NULL
);
CREATE TABLE covid19.def_healthcare_data (
    OBJECTID INTEGER NOT NULL,
    x VARCHAR NOT NULL,
    y VARCHAR NOT NULL,
    hospital_name varchar NOT NULL,
    hospital_type  varchar ,
    hq_address  varchar ,
    hq_address1  varchar ,
    hq_city  varchar ,
    hq_state  varchar ,
    hq_zip_code  varchar ,
    county_name  varchar ,
    state_name varchar,
    state_fips varchar not null,
    cnty_fips varchar not null,
    fips varchar not null,
    num_licensed_beds integer,
    num_staffed_beds integer,
    num_icu_beds integer,
    bed_utilization float,
    potential_increase_in_bed_capac integer
);

CREATE TABLE covid19.states (
    state_name VARCHAR NOT NULL,
    abbreviation VARCHAR NOT NULL
); -- manually populated
GRANT CONNECT ON DATABASE corona TO corona;
GRANT USAGE ON SCHEMA covid19 TO corona;
GRANT SELECT ON ALL TABLES IN SCHEMA covid19 TO corona;
GRANT UPDATE ON ALL TABLES IN SCHEMA covid19 TO corona;
GRANT INSERT ON ALL TABLES IN SCHEMA covid19 TO corona;
GRANT DELETE ON TABLE covid19.jhu TO corona;
GRANT DELETE ON TABLE covid19.census TO corona;
GRANT DELETE ON TABLE covid19.census_msa TO corona;
GRANT DELETE ON TABLE covid19.census_mdiv TO corona;
GRANT DELETE ON TABLE covid19.census_msa_counties TO corona;
GRANT DELETE ON TABLE covid19.census_mdiv_counties TO corona;
GRANT DELETE on TABLE covid19.def_healthcare_data TO corona;
CREATE MATERIALIZED VIEW covid19.jhu_derived AS
    select x.*, prior.file_date as prior_date,
    prior.cases as prior_cases, case when prior.cases is null then coalesce(x.cases,0) else x.cases-prior.cases end as cases_delta,
    prior2.cases as prior_cases2, prior3.cases as prior_cases3,
    case when prior2.cases is null then coalesce(x.cases,0) else x.cases-prior2.cases end as cases_delta2,
    case when prior3.cases is null then coalesce(x.cases,0) else x.cases-prior3.cases end as cases_delta3,
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
        left outer join covid19.jhu prior2
        on prior2.file_date=x.file_date-2
        and prior2.country=x.country
        and ((prior2.state is null and x.state is null) or (prior2.state=x.state))
        and ((prior2.county is null and x.county is null) or (prior2.county=x.county))
        and ((prior2.fips is null and x.fips is null) or (prior2.fips=x.fips))
        left outer join covid19.jhu prior3
        on prior3.file_date=x.file_date-3
        and prior3.country=x.country
        and ((prior3.state is null and x.state is null) or (prior3.state=x.state))
        and ((prior3.county is null and x.county is null) or (prior3.county=x.county))
        and ((prior3.fips is null and x.fips is null) or (prior3.fips=x.fips));


CREATE VIEW covid19.cases_us_all AS select * from covid19.jhu_derived WHERE country='US';

CREATE VIEW covid19.cases_us_current AS select * from covid19.jhu_derived WHERE country='US' AND file_date=(select max(file_date) from covid19.jhu);


create view covid19.healthcare_counties as
    select fips, county_name, state_name, count(src.objectid) as num_hospitals, sum(num_licensed_beds) as licensed_beds, sum(num_staffed_beds) as staffed_beds, sum(num_icu_beds) as icu_beds, case when count(calc.utilized_beds) is null then null else sum(calc.utilized_beds)/sum(calc.beds_to_combine) end as combined_bed_utilization
    from covid19.def_healthcare_data src
    left outer join (select objectid, bed_utilization*num_licensed_beds as utilized_beds, num_licensed_beds as beds_to_combine from covid19.def_healthcare_data where bed_utilization is not null) as calc on src.objectid=calc.objectid
    group by fips, county_name, state_name;


create view covid19.healthcare_msa as
    select msa.cbsa, msa.msa_name,  count(src.objectid) as num_hospitals, sum(num_licensed_beds) as licensed_beds, sum(num_staffed_beds) as staffed_beds, sum(num_icu_beds) as icu_beds, case when count(calc.utilized_beds) is null then null else sum(calc.utilized_beds)/sum(calc.beds_to_combine) end as combined_bed_utilization
    from covid19.census_msa msa
    left outer join covid19.census_msa_counties mc on msa.cbsa=mc.cbsa
    left outer join covid19.def_healthcare_data src on src.fips=mc.fips_stcou
    left outer join (select objectid, bed_utilization*num_licensed_beds as utilized_beds, num_licensed_beds as beds_to_combine from covid19.def_healthcare_data where bed_utilization is not null) as calc on src.objectid=calc.objectid
    group by msa.cbsa, msa.msa_name;


-- NEW MSA:
create view covid19.cases_and_healthcare_historical_by_msa as (
    select msa.cbsa as cbsa,
        null as fips,
        msa.msa_name as area_name,
        msa.msa_type as area_type,
        msa.pop_2018 as population,
        cases.file_date as file_date,
        sum(cases.cases) as cases,
        case when msa.pop_2018 is null then null else sum(cases.cases)::float/msa.pop_2018*10000 end as cases_per_10k_people,
        sum(cases.deaths) as deaths,
        sum(recovered) as recovered,
        sum(active) as active,
        sum(cases_delta) as increase_yesterday,
        hc.num_hospitals,
        hc.licensed_beds,
        hc.staffed_beds,
        hc.icu_beds,
        hc.combined_bed_utilization,
        case when hc.licensed_beds is null or hc.licensed_beds=0 then null else sum(cases.cases::float)/hc.licensed_beds end as cases_per_licensed_bed,
        case when hc.staffed_beds is null or hc.staffed_beds=0 then null else sum(cases.cases::float)/hc.staffed_beds end as cases_per_staffed_bed,
        case when hc.icu_beds is null or hc.icu_beds=0 then null else sum(cases.cases::float)/hc.icu_beds end as cases_per_icu_bed
    from covid19.census_msa msa
        inner join covid19.census_msa_counties mc on msa.cbsa=mc.cbsa
        left outer join covid19.jhu_derived cases on cases.fips=mc.fips_stcou
        left outer join covid19.healthcare_msa hc on hc.cbsa=msa.cbsa
    group by msa.cbsa, msa.msa_type, msa.msa_name, msa.pop_2018, cases.file_date, hc.num_hospitals, hc.licensed_beds, hc.staffed_beds, hc.icu_beds, hc.combined_bed_utilization
    order by msa.cbsa, cases.file_date desc
);
-- COUNTIES NEW:
create view covid19.cases_and_healthcare_historical_by_county as (
    select 0 as cbsa,
        counties.fips as fips,
        concat(counties.county, ', ', states.abbreviation) as area_name,
        'County' as area_type,
        counties.pop_2018 as population,
        cases.file_date as file_date,
        sum(cases.cases) as cases,
        case when counties.pop_2018 is null then null else sum(cases.cases)::float/counties.pop_2018*10000 end as cases_per_10k_people,
        sum(cases.deaths) as deaths,
        sum(recovered) as recovered,
        sum(active) as active,
        sum(cases_delta) as increase_yesterday,
        hc.num_hospitals,
        hc.licensed_beds,
        hc.staffed_beds,
        hc.icu_beds,
        hc.combined_bed_utilization,
        case when hc.licensed_beds is null or hc.licensed_beds=0 then null else sum(cases.cases::float)/hc.licensed_beds end as cases_per_licensed_bed,
        case when hc.staffed_beds is null or hc.staffed_beds=0 then null else sum(cases.cases::float)/hc.staffed_beds end as cases_per_staffed_bed,
        case when hc.icu_beds is null or hc.icu_beds=0 then null else sum(cases.cases::float)/hc.icu_beds end as cases_per_icu_bed
    from covid19.census counties
        inner join covid19.states states on counties.state=states.state_name
        left outer join covid19.jhu_derived cases on cases.fips=counties.fips
        left outer join covid19.healthcare_counties hc on hc.fips=counties.fips
    where counties.county_num <> 0
    group by counties.fips, counties.county, counties.state, states.abbreviation, counties.pop_2018, cases.file_date, hc.num_hospitals, hc.licensed_beds, hc.staffed_beds, hc.icu_beds, hc.combined_bed_utilization
    order by counties.fips, cases.file_date desc
);
