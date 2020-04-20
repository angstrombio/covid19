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

select * from covid19.jhu limit 10;

CREATE VIEW covid19.nyt_jhu_combined AS (
select file_date, fips, state as state_name, county as county_name, cases, deaths, recovered, active from covid19.jhu where file_date >= '2020-03-22' and country = 'US'
UNION ALL
select file_date, fips, state_name, county_name, cases, deaths, 0 as recovered, 0 as active from covid19.nyt where file_date < '2020-03-22'
);


CREATE MATERIALIZED VIEW covid19.nyt_jhu_combined_derived AS (
    select x.*, 
        prior.file_date as prior_date,
        prior.cases as prior_cases,
        case when prior.cases is null then coalesce(x.cases, 0) else x.cases-prior.cases end as cases_delta,
        prior.deaths as prior_deaths,
        case when prior.deaths is null then coalesce(x.deaths, 0) else x.deaths-prior.deaths end as deaths_delta,
        prior.recovered as prior_recovered,
        case when prior.recovered is null then coalesce(x.recovered, 0) else x.recovered-prior.recovered end as recovered_delta,
        prior.active as prior_active,
        case when prior.active is null then coalesce(x.active, 0) else x.active-prior.active end as active_delta
    from covid19.nyt_jhu_combined x
        left outer join covid19.nyt_jhu_combined prior
            on prior.file_date=x.file_date-1
            and ((prior.state_name is null and x.state_name is null) or (prior.state_name=x.state_name))
            and ((prior.county_name is null and x.county_name is null) or (prior.county_name=x.county_name))
            and ((prior.fips is null and x.fips is null) or (prior.fips=x.fips))
);

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
        and ((prior.fips is null and x.fips is null) or (prior.fips=x.fips));


-- This view is no longer necessary since it is just a select all from the MV, but keeping for backwards compatibility
-- In a prior iteration, we needed to filter the non-US cases here
CREATE VIEW covid19.cases_us_all AS select * from covid19.nyt_jhu_combined_derived;

CREATE VIEW covid19.cases_us_current AS select * from covid19.nyt_jhu_combined_derived WHERE file_date=(select max(file_date) from covid19.nyt_jhu_combined_derived);


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
create view covid19.cases_and_healthcare_historical_by_msa as (
    select CAST(msa.cbsa as VARCHAR) as GEOID,
        msa.cbsa as cbsa,
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
        case when hc.licensed_beds is null or hc.licensed_beds=0 then null else (sum(cases.cases::float)-sum(cases.deaths))/hc.licensed_beds end as cases_per_licensed_bed,
        case when hc.staffed_beds is null or hc.staffed_beds=0 then null else (sum(cases.cases::float)-sum(cases.deaths))/hc.staffed_beds end as cases_per_staffed_bed,
        case when hc.icu_beds is null or hc.icu_beds=0 then null else (sum(cases.cases::float)-sum(cases.deaths))/hc.icu_beds end as cases_per_icu_bed,
        case when msa.pop_2018 is null then null else sum(cases_delta)::float/msa.pop_2018*10000 end as increase_per_10k_people,
        case when msa.pop_2018 is null then null else sum(cases.deaths)::float/msa.pop_2018*10000 end as deaths_per_10k_people,
        sum(deaths_delta) as deaths_today,
        case when sum(cases.cases) < 20 then null else sum(cases.deaths)::float/sum(cases.cases) end as deaths_per_case
    from covid19.census_msa msa
        inner join covid19.census_msa_counties mc on msa.cbsa=mc.cbsa
        left outer join covid19.nyt_jhu_combined_derived cases on cases.fips=mc.fips_stcou
        left outer join covid19.healthcare_msa hc on hc.cbsa=msa.cbsa
    group by msa.cbsa, msa.msa_type, msa.msa_name, msa.pop_2018, cases.file_date, hc.num_hospitals, hc.licensed_beds, hc.staffed_beds, hc.icu_beds, hc.combined_bed_utilization
    order by msa.cbsa, cases.file_date desc
);
-- COUNTIES NEW:
create view covid19.cases_and_healthcare_historical_by_county as (
    select counties.fips as GEOID,
        0 as cbsa,
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
        case when hc.licensed_beds is null or hc.licensed_beds=0 then null else (sum(cases.cases::float)-sum(cases.deaths))/hc.licensed_beds end as cases_per_licensed_bed,
        case when hc.staffed_beds is null or hc.staffed_beds=0 then null else (sum(cases.cases::float)-sum(cases.deaths))/hc.staffed_beds end as cases_per_staffed_bed,
        case when hc.icu_beds is null or hc.icu_beds=0 then null else (sum(cases.cases::float)-sum(cases.deaths))/hc.icu_beds end as cases_per_icu_bed,
        case when counties.pop_2018 is null then null else sum(cases_delta)::float/counties.pop_2018*10000 end as increase_per_10k_people,
        case when counties.pop_2018 is null then null else sum(cases.deaths)::float/counties.pop_2018*10000 end as deaths_per_10k_people,
        sum(deaths_delta) as deaths_today,
        case when sum(cases.cases) < 20 then null else sum(cases.deaths)::float/sum(cases.cases) end as deaths_per_case
    from covid19.census counties
        inner join covid19.states states on counties.state=states.state_name
        left outer join covid19.nyt_jhu_combined_derived cases on cases.fips=counties.fips
        left outer join covid19.healthcare_counties hc on hc.fips=counties.fips
    where counties.county_num <> 0
    group by counties.fips, counties.county, counties.state, states.abbreviation, counties.pop_2018, cases.file_date, hc.num_hospitals, hc.licensed_beds, hc.staffed_beds, hc.icu_beds, hc.combined_bed_utilization
    order by counties.fips, cases.file_date desc
);
create view covid19.cases_and_healthcare_historical_combined as (
    select * from covid19.cases_and_healthcare_historical_by_msa
    UNION ALL
    select * from covid19.cases_and_healthcare_historical_by_county where fips not in (select fips_stcou from covid19.census_msa_counties)
);
create table covid19.bls_areas (
    area_id VARCHAR NOT NULL,
    area_type VARCHAR NOT NULL,
    msa_name VARCHAR NOT NULL
);
create table covid19.bls_area_counties (
    area_id VARCHAR NOT NULL,
    fips VARCHAR NOT NULL,
    state VARCHAR NOT NULL,
    state_abbr VARCHAR NOT NULL,
    county_code VARCHAR NOT NULL,
    township_code VARCHAR NOT NULL,
    county_or_township_name VARCHAR NOT NULL,
    fips_stcou VARCHAR NOT NULL
);

create table covid19.bls_oes (
    area VARCHAR NOT NULL,
    area_title VARCHAR NOT NULL,
    area_type VARCHAR NOT NULL,
    occ_code VARCHAR NOT NULL,
    occ_title VARCHAR NOT NULL,
    o_group VARCHAR NOT NULL,
    tot_emp INTEGER
);

create table covid19.bls_area_types (
    area_type_id VARCHAR NOT NULL,
    area_type_name VARCHAR NOT NULL
);

select distinct bc.state_abbr -- a.msa_name, c.msa_name, a.state_abbr
    from covid19.bls_areas ba
    inner join covid19.bls_area_counties bc on ba.area_id=bc.area_id
    left outer join covid19.census_msa c on ba.area_id=cast(c.cbsa as varchar)
    where ba.area_type='4' 
    and bc.state_abbr != 'PR'
    and c.msa_name is null;
    
select c.cbsa, c.msa_name, c.msa_type, c.pop_2018 as msa_pop, cc.fips_stcou, cc.county_name, cc.pop_2018 as county_pop, hc.staffed_beds
    from covid19.census_msa c
    left outer join covid19.census_msa_counties cc on c.cbsa=cc.cbsa
    left outer join covid19.healthcare_counties hc on cc.fips_stcou=hc.fips
    left outer join covid19.bls_areas a on cast(c.cbsa as varchar)=a.area_id
    where a.msa_name is null;
    
    
select ba.area_id as bls_area, ba.area_type, ba.msa_name as bls_msa_name, bc.state_abbr as bls_state, bc.county_code, bc.township_code, bc.county_or_township_name as bls_county_name, cc.state as census_state, cc.county as census_county, cc.pop_2018 as county_pop, hc.staffed_beds
    from covid19.bls_areas ba
    inner join covid19.bls_area_counties bc on ba.area_id=bc.area_id
    left outer join covid19.census cc on bc.fips_stcou=cc.fips
    left outer join covid19.healthcare_counties hc on bc.fips_stcou=hc.fips
    where ba.area_id not in (select cast(cbsa as varchar) from covid19.census_msa)
    and ba.msa_name not like '%PR';
    
select ba.area_id as bls_area, ba.area_type, ba.msa_name as bls_msa_name, bc.state_abbr as bls_state, bc.county_code, bc.township_code, bc.county_or_township_name as bls_county_name, cc.state as census_state, cc.county as census_county, cc.pop_2018 as county_pop, cm.cbsa as census_msa_cbsa, cm.msa_name as census_msa_name, cm.pop_2018 as census_msa_pop, cm.msa_type as census_msa_type
    from covid19.bls_areas ba
    inner join covid19.bls_area_counties bc on ba.area_id=bc.area_id
    left outer join covid19.census cc on bc.fips_stcou=cc.fips
    left outer join covid19.healthcare_counties hc on bc.fips_stcou=hc.fips
    left outer join covid19.census_msa cm on cast(cm.cbsa as varchar)=ba.area_id
    where ba.msa_name not like '%PR';
    

create table covid19.bls_area_match_type (
    area_id VARCHAR NOT NULL,
    match_type VARCHAR NOT NULL
);

create table covid19.bls_area_towns (
    area_id VARCHAR NOT NULL,
    state_code VARCHAR NOT NULL,
    county_code VARCHAR NOT NULL,
    township_code VARCHAR NOT NULL,
    town_or_county_name VARCHAR NOT NULL,
    pct_of_msa_by_population FLOAT NOT NULL,
    fips_stcou VARCHAR NOT NULL
);
    
create table covid19.census_state_codes (
    state_code VARCHAR NOT NULL,
    state_name VARCHAR NOT NULL
);

create table covid19.bls_relevant_jobs (
    occ_code VARCHAR,
    occ_title VARCHAR,
    is_provider BOOLEAN,
    is_other_at_risk BOOLEAN
);


CREATE VIEW covid19.bls_providers_by_area AS (
select bo.area as area_id, sum(case when brj.is_provider then bo.tot_emp else 0 end) as num_providers, sum(case when brj.is_other_at_risk then bo.tot_emp else 0 end) as num_other_at_risk
from covid19.bls_oes bo
inner join covid19.bls_relevant_jobs brj on bo.occ_code=brj.occ_code
group by bo.area
);

CREATE VIEW covid19.bls_providers_by_census_msa AS (
select ba.area_id, sum(pba.num_providers) as num_providers, sum(pba.num_other_at_risk) as num_other_at_risk 
from covid19.bls_areas ba
inner join covid19.bls_area_match_type bmt on ba.area_id=bmt.area_id
inner join covid19.bls_providers_by_area pba on pba.area_id=ba.area_id
inner join covid19.census_msa m on cast(m.cbsa as VARCHAR) = ba.area_id
where bmt.match_type='census_msa'
group by ba.area_id);

CREATE VIEW covid19.bls_providers_by_census_nonmsa_counties AS (
select ba.area_id, bat.fips_stcou, sum(round(pba.num_providers*bat.pct_of_msa_by_population)) as num_providers, sum(round(pba.num_other_at_risk*bat.pct_of_msa_by_population)) as num_other_at_risk
from covid19.bls_areas ba
inner join covid19.bls_area_match_type bmt on ba.area_id=bmt.area_id
inner join covid19.bls_providers_by_area pba on pba.area_id=ba.area_id
inner join covid19.bls_area_towns bat on ba.area_id=bat.area_id
where bmt.match_type='allocate_county_or_town'
group by ba.area_id, bat.fips_stcou);


CREATE VIEW covid19.bls_providers_combined AS (
SELECT cast(m.cbsa as VARCHAR) as GEOID, m.cbsa, NULL as fips, pm.num_providers as num_providers, pm.num_other_at_risk as num_other_at_risk
from covid19.census_msa m
inner join covid19.bls_providers_by_census_msa pm on cast(m.cbsa as VARCHAR)=pm.area_id
UNION ALL
SELECT cast(m.cbsa as VARCHAR) as GEOID, m.cbsa, NULL as fips, sum(bpc.num_providers) as num_providers, sum(bpc.num_other_at_risk)as num_other_at_risk
from covid19.census_msa m
inner join covid19.census_msa_counties c on m.cbsa=c.cbsa
inner join covid19.bls_providers_by_census_nonmsa_counties bpc on c.fips_stcou=bpc.fips_stcou
group by m.cbsa
UNION ALL
SELECT c.fips as GEOID, NULL as cbsa, c.fips as fips, sum(bpc.num_providers) as num_providers, sum(bpc.num_other_at_risk)as num_other_at_risk
from covid19.census c
inner join covid19.bls_providers_by_census_nonmsa_counties bpc on c.fips=bpc.fips_stcou
where c.fips not in (select fips_stcou from covid19.census_msa_counties)
group by c.fips);

CREATE TABLE covid19.nyt (
    file_date DATE NOT NULL, 
    county_name VARCHAR NOT NULL,
    state_name VARCHAR NOT NULL,
    fips VARCHAR NOT NULL,
    cases INTEGER,
    deaths INTEGER
);