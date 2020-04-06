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
