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


select distinct county_name, state_name, fips from covid19.nyt where fips not in (select fips from covid19.census);
select max(file_date) from covid19.nyt;
select * from covid19.nyt where file_date='2020-04-05';


select file_date, count(*) from covid19.jhu group by file_date order by file_date;
select * from covid19.cases_and_healthcare_historical_combined order by increase_per_10k_people limit 100;

select * from covid19.census where state='Utah' and county in ('Weber County', 'Morgan County');

select * from covid19.census_msa m 
left outer join covid19.census_msa_counties c on m.cbsa=c.cbsa
where msa_name like '%, UT';
select * from covid19.census_msa_counties;

select *
from covid19.nyt_jhu_combined_derived d
inner join covid19.census_msa_counties c on d.fips=c.fips_stcou
where c.cbsa=35620 and d.fips='36061'
order by file_date desc, d.state_name, d.county_name;

select * from covid19.nyt_jhu_combined_derived where fips='90044';

select * from covid19.census_msa_counties c where c.county_name like '%RI'

select * from covid19.cases_and_healthcare_historical_combined where cbsa='39300'
