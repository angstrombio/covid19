select * from covid19.bls_area_towns bat
    inner join covid19.bls_area_match_type bmt on bat.area_id=bmt.area_id
where bat.area_id not in (select area_id from covid19.census_state_codes);

select *
from covid19.bls_area_towns bat
left outer join covid19.census c on bat.fips_stcou=c.fips
where c.county is null;

select *
from covid19.bls_areas ba
inner join covid19.bls_area_match_type bmt on ba.area_id=bmt.area_id
left outer join covid19.census_msa msa on cast(msa.cbsa as varchar)=ba.area_id
where bmt.match_type='census_msa' and msa.msa_name is null;

select bat.area_id, sum(pct_of_msa_by_population)
from covid19.bls_area_towns bat
group by area_id;

select * from covid19.bls_relevant_jobs;

select * from covid19.bls_areas;
select * from covid19.bls_oes limit 100;

select *
from covid19.bls_providers_combined x

select distinct county_name, state_name, fips from covid19.nyt where fips not in (select fips from covid19.census);
select max(file_date) from covid19.nyt;
select * from covid19.nyt where file_date='2020-04-05'

select jhu.file_date,jhu.fips, jhu.state, jhu.county, jhu.cases, jhu.deaths, jhu.recovered, jhu.active, nyt.state_name as nyt_state, nyt.county_name as nyt_county, nyt.cases as nyt_cases, nyt.deaths as nyt_deaths 
from covid19.cases_us_current jhu
    left outer join covid19.nyt nyt on jhu.fips=nyt.fips and nyt.file_date=jhu.file_date
where jhu.fips != 'XXXXX' and jhu.fips < '80000'

select file_date, count(*) from covid19.jhu group by file_date order by file_date;
select * from covid19.cases_and_healthcare_historical_combined order by increase_per_10k_people asc limit 100;
