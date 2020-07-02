insert into covid19.bls_area_types (area_type_id, area_type_name) VALUES ('4', 'MSA');
insert into covid19.bls_area_types (area_type_id, area_type_name) VALUES ('6', 'Non-metropolitan area');

insert into covid19.bls_area_match_type (area_id, match_type)
select ba.area_id, 'census_msa' from covid19.bls_areas ba inner join covid19.census_msa cm on ba.area_id=cast(cm.cbsa as varchar);

insert into covid19.census_state_codes (state_code, state_name)
select distinct lpad(state_num::text, 2, '0'), state from covid19.census;

insert into covid19.bls_area_match_type (area_id, match_type)
select distinct area_id, 'allocate_county_or_town' from covid19.bls_area_towns;

insert into covid19.bls_area_match_type (area_id, match_type)
select distinct area_id, 'ignore' from covid19.bls_areas where area_id not in (select area_id from covid19.bls_area_match_type);

INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1022', 'Oral and Maxillofacial Surgeons', TRUE, FALSE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1071', 'Physician Assistants', TRUE, FALSE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1081', 'Podiatrists', TRUE, FALSE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1126', 'Respiratory Therapists', FALSE, TRUE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1141', 'Registered Nurses', FALSE, TRUE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1151', 'Nurse Anesthetists', FALSE, TRUE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1161', 'Nurse Midwives', FALSE, TRUE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1171', 'Nurse Practitioners', TRUE, FALSE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1211', 'Anesthesiologists', TRUE, FALSE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1215', 'Family Medicine Physicians', TRUE, FALSE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1216', 'General Internal Medicine Physicians', TRUE, FALSE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1218', 'Obstetricians and Gynecologists', TRUE, FALSE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1221', 'Pediatricians, General', TRUE, FALSE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1228', 'Physicians, All Other; and Ophthalmologists, Except Pediatric', TRUE, FALSE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-1248', 'Surgeons, Except Ophthalmologists', TRUE, FALSE);
INSERT INTO covid19.bls_relevant_jobs (occ_code, occ_title, is_provider, is_other_at_risk) VALUES ('29-2061', 'Licensed Practical and Licensed Vocational Nurses', FALSE, TRUE);


-- Correct big mistake in JHU data
update covid19.jhu set cases=103 where fips='12091' and file_date='2020-04-13';

-- Map Rhode Island unassigned onto the single MSA in the state, given the large number of unassigned cases
INSERT INTO covid19.census_msa_counties (cbsa, fips_stcou, county_name, pop_2018) VALUES ('39300', '90044','Rhode Island Unassigned', 1);

