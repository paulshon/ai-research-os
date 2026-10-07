# 새 DB(openalex @ ch-v2) 항목 전체 목록

표 40개 · 딕셔너리 3개(lit_cohort_dict, lit_jf_dict, lit_journal2_dict)

## 표 목록

| 표 | 엔진 | 행 수 | 크기(GiB) | 열 수 |
|---|---|---:|---:|---:|
| papers_v2 | ReplacingMergeTree | 476,196,327 | 245.17 | 20 |
| papers_v2_ext | ReplacingMergeTree | 476,196,327 | 187.43 | 40 |
| lit_papers | ReplacingMergeTree | 174,194,577 | 181.64 | 113 |
| oa_authors | MergeTree | 132,148,629 | 54.67 | 21 |
| work_ids | ReplacingMergeTree | 476,196,327 | 9.14 | 6 |
| oa_awards | MergeTree | 17,139,262 | 3.42 | 30 |
| oa_sources | MergeTree | 256,981 | 0.23 | 39 |
| oa_institutions | MergeTree | 136,136 | 0.13 | 28 |
| papers_full_test | ReplacingMergeTree | 184,917 | 0.06 | 54 |
| oa_source_issn | MergeTree | 420,589 | 0.01 | 5 |
| oa_authors_dupids | MergeTree | 1,690,884 | 0.01 | 1 |
| oa_funders | MergeTree | 45,661 | 0.01 | 17 |
| lit_journal2 | MergeTree | 256,981 | 0.01 | 35 |
| jcr_by_source | MergeTree | 22,338 | 0.01 | 40 |
| oa_concepts | MergeTree | 65,026 | 0.01 | 18 |
| jcr_journals | MergeTree | 22,643 | 0 | 33 |
| jcr_category | MergeTree | 32,215 | 0 | 18 |
| lit_doi_dupe | MergeTree | 243,068 | 0 | 1 |
| lit_journal_carried | MergeTree | 203,498 | 0 | 12 |
| lit_topic_year | MergeTree | 191,197 | 0 | 7 |
| oa_keywords | MergeTree | 65,004 | 0 | 7 |
| oa_topics | MergeTree | 4,516 | 0 | 14 |
| jcr_source_map | MergeTree | 22,352 | 0 | 8 |
| oa_publishers | MergeTree | 10,707 | 0 | 21 |
| lit_year_facet | MergeTree | 44,498 | 0 | 10 |
| oa_subfields | MergeTree | 252 | 0 | 14 |
| lit_cohort | MergeTree | 742 | 0 | 6 |
| lit_journal_field | MergeTree | 8,904 | 0 | 2 |
| oa_countries | MergeTree | 247 | 0 | 21 |
| oa_fields | MergeTree | 26 | 0 | 13 |
| oa_languages | MergeTree | 181 | 0 | 7 |
| jcr_category_summary | MergeTree | 254 | 0 | 2 |
| oa_sdgs | MergeTree | 17 | 0 | 11 |
| oa_continents | MergeTree | 7 | 0 | 11 |
| oa_domains | MergeTree | 4 | 0 | 12 |
| oa_licenses | MergeTree | 10 | 0 | 9 |
| oa_institution_types | MergeTree | 8 | 0 | 7 |
| oa_source_types | MergeTree | 6 | 0 | 7 |
| lit_meta | ReplacingMergeTree | 1 | 0 | 4 |
| ingest_batches | MergeTree | 0 | 0 | 6 |

## papers_v2  (476,196,327행, 20열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | doi | String |
| 3 | title | String |
| 4 | abstract | String |
| 5 | publication_year | UInt16 |
| 6 | type | LowCardinality(String) |
| 7 | cited_by_count | UInt32 |
| 8 | authorships_json | String |
| 9 | primary_location_json | String |
| 10 | topics_json | String |
| 11 | referenced_works | Array(String) |
| 12 | is_oa | UInt8 |
| 13 | pdf_url | String |
| 14 | language | LowCardinality(String) |
| 15 | updated_date | Date |
| 16 | pmid | String |
| 17 | pmcid | String |
| 18 | ids_json | String |
| 19 | tier | UInt8 |
| 20 | ingested_at | DateTime |

## papers_v2_ext  (476,196,327행, 40열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | updated_date | Date |
| 3 | ingested_at | DateTime |
| 4 | authorships_full | String |
| 5 | referenced_works_full | Array(String) |
| 6 | abstract_full | String |
| 7 | indexed_in | Array(Nullable(String)) |
| 8 | publication_date | Nullable(Date32) |
| 9 | authors_count | Nullable(Int32) |
| 10 | corresponding_author_ids | Array(Nullable(String)) |
| 11 | corresponding_institution_ids | Array(Nullable(String)) |
| 12 | primary_topic | Tuple(id Nullable(String), display_name Nullable(String), score Nullable(Float32), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String))) |
| 13 | keywords | Array(Tuple(id Nullable(String), display_name Nullable(String), score Nullable(Float32))) |
| 14 | concepts | Array(Tuple(id Nullable(String), wikidata Nullable(String), display_name Nullable(String), level Nullable(Int32), score Nullable(Float32))) |
| 15 | locations | Array(Tuple(id Nullable(String), source Tuple(id Nullable(String), display_name Nullable(String), issn_l Nullable(String), issn Array(Nullable(String)), is_oa Nullable(Bool), is_in_doaj Nullable(Bool), is_core Nullable(Bool), listed_in Array(Nullable(String)), host_organization Nullable(String), host_organization_name Nullable(String), host_organization_lineage Array(Nullable(String)), host_organization_lineage_names Array(Nullable(String)), type Nullable(String)), is_oa Nullable(Bool), is_published Nullable(Bool), landing_page_url Nullable(String), pdf_url Nullable(String), raw_source_name Nullable(String), raw_type Nullable(String), provenance Nullable(String), license Nullable(String), license_id Nullable(String), version Nullable(String), is_accepted Nullable(Bool))) |
| 16 | locations_count | Nullable(Int32) |
| 17 | best_oa_location | Tuple(id Nullable(String), source Tuple(id Nullable(String), display_name Nullable(String), issn_l Nullable(String), issn Array(Nullable(String)), is_oa Nullable(Bool), is_in_doaj Nullable(Bool), is_core Nullable(Bool), listed_in Array(Nullable(String)), host_organization Nullable(String), host_organization_name Nullable(String), host_organization_lineage Array(Nullable(String)), host_organization_lineage_names Array(Nullable(String)), type Nullable(String)), is_oa Nullable(Bool), is_published Nullable(Bool), landing_page_url Nullable(String), pdf_url Nullable(String), raw_source_name Nullable(String), raw_type Nullable(String), provenance Nullable(String), license Nullable(String), license_id Nullable(String), version Nullable(String), is_accepted Nullable(Bool)) |
| 18 | sustainable_development_goals | Array(Tuple(id Nullable(String), display_name Nullable(String), score Nullable(Float64))) |
| 19 | awards | Array(Tuple(id Nullable(String), display_name Nullable(String), funder_award_id Nullable(String), funder_id Nullable(String), funder_display_name Nullable(String))) |
| 20 | funders | Array(Tuple(id Nullable(String), display_name Nullable(String), ror Nullable(String))) |
| 21 | institutions | Array(Tuple(id Nullable(String), display_name Nullable(String), ror Nullable(String), country_code Nullable(String), type Nullable(String), lineage Array(Nullable(String)))) |
| 22 | countries_distinct_count | Nullable(Int32) |
| 23 | institutions_distinct_count | Nullable(Int32) |
| 24 | open_access | Tuple(is_oa Nullable(Bool), oa_status Nullable(String), any_repository_has_fulltext Nullable(Bool), oa_url Nullable(String)) |
| 25 | is_paratext | Nullable(Bool) |
| 26 | is_retracted | Nullable(Bool) |
| 27 | is_xpac | Nullable(Bool) |
| 28 | biblio | Tuple(volume Nullable(String), issue Nullable(String), first_page Nullable(String), last_page Nullable(String)) |
| 29 | referenced_works_count | Nullable(Int32) |
| 30 | related_works | Array(Nullable(String)) |
| 31 | counts_by_year | Array(Tuple(year Nullable(Int32), cited_by_count Nullable(Int32))) |
| 32 | apc_list | Tuple(value Nullable(Int32), currency Nullable(String), value_usd Nullable(Int32)) |
| 33 | apc_paid | Tuple(value Nullable(Float64), currency Nullable(String), value_usd Nullable(Float64)) |
| 34 | fwci | Nullable(Float64) |
| 35 | citation_normalized_percentile | Tuple(value Nullable(Float64), is_in_top_1_percent Nullable(Bool), is_in_top_10_percent Nullable(Bool)) |
| 36 | cited_by_percentile_year | Tuple(min Nullable(Int32), max Nullable(Int32)) |
| 37 | mesh | Array(Tuple(descriptor_ui Nullable(String), descriptor_name Nullable(String), qualifier_ui Nullable(String), qualifier_name Nullable(String), is_major_topic Nullable(Bool))) |
| 38 | has_content | Tuple(pdf Nullable(Bool), grobid_xml Nullable(Bool)) |
| 39 | has_fulltext | Nullable(Bool) |
| 40 | created_date | Nullable(DateTime64(6, \'UTC\')) |

## lit_papers  (174,194,577행, 113열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | wid | UInt64 |
| 2 | doi | String |
| 3 | pmid | UInt64 |
| 4 | pmcid | String |
| 5 | title | String |
| 6 | abstract | String |
| 7 | has_abstract | UInt8 |
| 8 | abstract_len | UInt32 |
| 9 | year | UInt16 |
| 10 | type | LowCardinality(String) |
| 11 | lang | LowCardinality(String) |
| 12 | lang_src | LowCardinality(String) |
| 13 | ko_ratio | Float32 |
| 14 | cited | UInt32 |
| 15 | n_refs | UInt16 |
| 16 | fwci | Float32 |
| 17 | cite_pct | UInt8 |
| 18 | is_citable | UInt8 |
| 19 | is_oa | UInt8 |
| 20 | oa_license | LowCardinality(String) |
| 21 | pdf_url | String |
| 22 | landing_url | String |
| 23 | domain | LowCardinality(String) |
| 24 | field | LowCardinality(String) |
| 25 | subfield | LowCardinality(String) |
| 26 | topic | String |
| 27 | topic_score | Float32 |
| 28 | area | LowCardinality(String) |
| 29 | keywords | Array(String) |
| 30 | journal | String |
| 31 | journal_id | UInt64 |
| 32 | issn_l | String |
| 33 | publisher | String |
| 34 | source_type | LowCardinality(String) |
| 35 | in_scie | UInt8 |
| 36 | in_ssci | UInt8 |
| 37 | in_ahci | UInt8 |
| 38 | in_esci | UInt8 |
| 39 | in_scopus | UInt8 |
| 40 | in_kci | UInt8 |
| 41 | in_doaj | UInt8 |
| 42 | jif | Float32 |
| 43 | jif_q | LowCardinality(String) |
| 44 | jif_est | Float32 |
| 45 | j_h | UInt32 |
| 46 | first_author | String |
| 47 | author_names | Array(String) |
| 48 | author_ids | Array(UInt64) |
| 49 | n_authors | UInt16 |
| 50 | countries | Array(LowCardinality(String)) |
| 51 | is_kr | UInt8 |
| 52 | tier | UInt8 |
| 53 | ingested_at | DateTime |
| 54 | meta_conflict | UInt8 |
| 55 | jif_5y | Float32 |
| 56 | jif_wo_self | Float32 |
| 57 | jif_below_0_1 | UInt8 |
| 58 | jci | Float32 |
| 59 | jci_q | LowCardinality(String) |
| 60 | jci_pct | Float32 |
| 61 | jif_pct | Float32 |
| 62 | jif_rank | String |
| 63 | immediacy | Float32 |
| 64 | eigenfactor | Float64 |
| 65 | norm_eigenfactor | Float64 |
| 66 | ais | Float32 |
| 67 | ais_q | LowCardinality(String) |
| 68 | cited_half_life | Float32 |
| 69 | citing_half_life | Float32 |
| 70 | jcr_total_cites | UInt64 |
| 71 | jcr_citable_items | UInt32 |
| 72 | jcr_pct_oa_gold | Float32 |
| 73 | jcr_categories | String |
| 74 | jcr_editions | LowCardinality(String) |
| 75 | jcr_category_json | String |
| 76 | has_jcr | UInt8 |
| 77 | is_core | UInt8 |
| 78 | pub_date | Date |
| 79 | fwci_oa | Float32 |
| 80 | fwci_oa_known | UInt8 |
| 81 | cite_norm_pct | Float32 |
| 82 | top1pct | UInt8 |
| 83 | top10pct | UInt8 |
| 84 | mesh_terms | Array(String) |
| 85 | mesh_major | Array(String) |
| 86 | sdgs | Array(String) |
| 87 | funders | Array(String) |
| 88 | n_funders | UInt16 |
| 89 | n_awards | UInt16 |
| 90 | inst_names | Array(String) |
| 91 | inst_rors | Array(String) |
| 92 | inst_countries | Array(LowCardinality(String)) |
| 93 | inst_types | Array(LowCardinality(String)) |
| 94 | n_institutions | UInt16 |
| 95 | concepts | Array(String) |
| 96 | oa_status | LowCardinality(String) |
| 97 | any_repo_fulltext | UInt8 |
| 98 | apc_usd | Int32 |
| 99 | is_retracted | UInt8 |
| 100 | is_paratext | UInt8 |
| 101 | has_fulltext | UInt8 |
| 102 | has_pdf_content | UInt8 |
| 103 | locations_n | UInt16 |
| 104 | n_refs_full | UInt32 |
| 105 | related_n | UInt16 |
| 106 | biblio_volume | String |
| 107 | biblio_issue | String |
| 108 | biblio_first_page | String |
| 109 | biblio_last_page | String |
| 110 | counts_by_year | String |
| 111 | indexed_in | Array(LowCardinality(String)) |
| 112 | corresponding_author_ids | Array(UInt64) |
| 113 | has_ext | UInt8 |

## oa_authors  (132,148,629행, 21열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | display_name_alternatives | Array(Nullable(String)) |
| 4 | raw_author_names | Array(Nullable(String)) |
| 5 | full_name | Nullable(String) |
| 6 | orcid | Nullable(String) |
| 7 | observed_orcids | Array(Nullable(String)) |
| 8 | works_count | Nullable(Int32) |
| 9 | cited_by_count | Nullable(Int32) |
| 10 | summary_stats | Tuple(`2yr_mean_citedness` Nullable(Float64), h_index Nullable(Int32), i10_index Nullable(Int32)) |
| 11 | ids | Tuple(openalex Nullable(String), orcid Nullable(String), observed_orcids Array(Nullable(String))) |
| 12 | affiliations | Array(Tuple(institution Tuple(id Nullable(String), ror Nullable(String), display_name Nullable(String), country_code Nullable(String), type Nullable(String), lineage Array(Nullable(String))), years Array(Nullable(Int32)))) |
| 13 | last_known_institutions | Array(Tuple(id Nullable(String), ror Nullable(String), display_name Nullable(String), country_code Nullable(String), type Nullable(String), lineage Array(Nullable(String)))) |
| 14 | topics | Array(Tuple(id Nullable(String), display_name Nullable(String), count Nullable(Int32), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String)))) |
| 15 | topic_share | Array(Tuple(id Nullable(String), display_name Nullable(String), value Nullable(Float64), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String)))) |
| 16 | x_concepts | Array(Tuple(id Nullable(String), wikidata Nullable(String), display_name Nullable(String), level Nullable(Int32), score Nullable(Float32), count Nullable(Int32))) |
| 17 | sources | Array(Tuple(id Nullable(String), display_name Nullable(String), issn_l Nullable(String), issn Array(Nullable(String)), is_oa Nullable(Bool), is_in_doaj Nullable(Bool), is_core Nullable(Bool), listed_in Array(Nullable(String)), host_organization Nullable(String), host_organization_name Nullable(String), host_organization_lineage Array(Nullable(String)), host_organization_lineage_names Array(Nullable(String)), type Nullable(String))) |
| 18 | counts_by_year | Array(Tuple(year Nullable(Int32), works_count Nullable(Int32), oa_works_count Nullable(Int32), cited_by_count Nullable(Int32))) |
| 19 | works_api_url | Nullable(String) |
| 20 | updated_date | Nullable(DateTime64(6, \'UTC\')) |
| 21 | created_date | Nullable(DateTime64(6, \'UTC\')) |

## work_ids  (476,196,327행, 6열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | openalex_id | String |
| 2 | doi | String |
| 3 | pmid | String |
| 4 | pmcid | String |
| 5 | mag | String |
| 6 | updated_date | Date |

## oa_awards  (17,139,262행, 30열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | description | Nullable(String) |
| 4 | funder_award_id | Nullable(String) |
| 5 | amount | Nullable(Float64) |
| 6 | currency | Nullable(String) |
| 7 | funder | Tuple(id Nullable(String), display_name Nullable(String), ror_id Nullable(String), doi Nullable(String)) |
| 8 | funding_type | Nullable(String) |
| 9 | funder_scheme | Nullable(String) |
| 10 | provenance | Nullable(String) |
| 11 | start_date | Nullable(Date32) |
| 12 | end_date | Nullable(Date32) |
| 13 | start_year | Nullable(Int64) |
| 14 | end_year | Nullable(Int64) |
| 15 | lead_investigator | Tuple(given_name Nullable(String), family_name Nullable(String), orcid Nullable(String), role_start Nullable(Date32), affiliation Tuple(name Nullable(String), country Nullable(String), ids Array(Tuple(id Nullable(String), type Nullable(String), asserted_by Nullable(String))))) |
| 16 | co_lead_investigator | Tuple(given_name Nullable(String), family_name Nullable(String), orcid Nullable(String), role_start Nullable(Date32), affiliation Tuple(name Nullable(String), country Nullable(String), ids Array(Tuple(id Nullable(String), type Nullable(String), asserted_by Nullable(String))))) |
| 17 | investigators | Array(Tuple(given_name Nullable(String), family_name Nullable(String), orcid Nullable(String), role_start Nullable(Date32), affiliation Tuple(name Nullable(String), country Nullable(String), ids Array(Tuple(id Nullable(String), type Nullable(String), asserted_by Nullable(String)))))) |
| 18 | landing_page_url | Nullable(String) |
| 19 | doi | Nullable(String) |
| 20 | works_api_url | Nullable(String) |
| 21 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 22 | funded_outputs | Array(Nullable(String)) |
| 23 | funded_outputs_count | Nullable(Int64) |
| 24 | primary_topic | Tuple(id Nullable(String), display_name Nullable(String), score Nullable(Float32), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String))) |
| 25 | topics | Array(Tuple(id Nullable(String), display_name Nullable(String), score Nullable(Float32), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String)))) |
| 26 | institution_awarded | Array(Tuple(id Nullable(String), display_name Nullable(String), ror Nullable(String), country_code Nullable(String), type Nullable(String), lineage Array(Nullable(String)))) |
| 27 | institution_awarded_full | Array(Tuple(id Nullable(String), display_name Nullable(String), ror Nullable(String), country_code Nullable(String), type Nullable(String), lineage Array(Nullable(String)))) |
| 28 | primary_topic_full | Tuple(id Nullable(String), display_name Nullable(String), score Nullable(Float32), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String))) |
| 29 | topics_full | Array(Tuple(id Nullable(String), display_name Nullable(String), score Nullable(Float32), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String)))) |
| 30 | updated_date | Nullable(DateTime64(6, \'UTC\')) |

## oa_sources  (256,981행, 39열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | issn_l | Nullable(String) |
| 3 | issn | Array(Nullable(String)) |
| 4 | display_name | Nullable(String) |
| 5 | host_organization | Nullable(String) |
| 6 | host_organization_name | Nullable(String) |
| 7 | host_organization_lineage | Array(Nullable(String)) |
| 8 | works_count | Nullable(Int32) |
| 9 | oa_works_count | Nullable(Int32) |
| 10 | cited_by_count | Nullable(Int32) |
| 11 | summary_stats | Tuple(`2yr_mean_citedness` Nullable(Float64), h_index Nullable(Int32), i10_index Nullable(Int32)) |
| 12 | is_oa | Nullable(Bool) |
| 13 | is_in_doaj | Nullable(Bool) |
| 14 | is_in_doaj_since_year | Nullable(Int32) |
| 15 | is_high_oa_rate | Nullable(Bool) |
| 16 | is_high_oa_rate_since_year | Nullable(Int64) |
| 17 | is_in_scielo | Nullable(Bool) |
| 18 | is_ojs | Nullable(Bool) |
| 19 | is_core | Nullable(Bool) |
| 20 | listed_in | Array(Nullable(String)) |
| 21 | is_preprint_repository | Nullable(Bool) |
| 22 | oa_flip_year | Nullable(Int32) |
| 23 | first_publication_year | Nullable(Int32) |
| 24 | last_publication_year | Nullable(Int32) |
| 25 | ids | Tuple(openalex Nullable(String), issn_l Nullable(String), issn Array(Nullable(String)), mag Nullable(String), wikidata Nullable(String)) |
| 26 | homepage_url | Nullable(String) |
| 27 | apc_prices | Array(Tuple(price Nullable(Int32), currency Nullable(String))) |
| 28 | apc_usd | Nullable(Int32) |
| 29 | apc_usd_by_year | Array(Tuple(year Nullable(Int32), price Nullable(Int32))) |
| 30 | country_code | Nullable(String) |
| 31 | societies | Array(Tuple(url Nullable(String), organization Nullable(String))) |
| 32 | alternate_titles | Array(Nullable(String)) |
| 33 | type | Nullable(String) |
| 34 | topics | Array(Tuple(id Nullable(String), display_name Nullable(String), count Nullable(Int32), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String)))) |
| 35 | topic_share | Array(Tuple(id Nullable(String), display_name Nullable(String), value Nullable(Float64), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String)))) |
| 36 | counts_by_year | Array(Tuple(year Nullable(Int32), works_count Nullable(Int32), oa_works_count Nullable(Int32), cited_by_count Nullable(Int32))) |
| 37 | works_api_url | Nullable(String) |
| 38 | updated_date | Nullable(DateTime64(6, \'UTC\')) |
| 39 | created_date | Nullable(DateTime64(6, \'UTC\')) |

## oa_institutions  (136,136행, 28열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | ror | Nullable(String) |
| 3 | display_name | Nullable(String) |
| 4 | country_code | Nullable(String) |
| 5 | type | Nullable(String) |
| 6 | lineage | Array(Nullable(String)) |
| 7 | is_super_system | Nullable(Bool) |
| 8 | type_id | Nullable(String) |
| 9 | homepage_url | Nullable(String) |
| 10 | image_url | Nullable(String) |
| 11 | image_thumbnail_url | Nullable(String) |
| 12 | display_name_acronyms | Array(Nullable(String)) |
| 13 | display_name_alternatives | Array(Nullable(String)) |
| 14 | works_count | Nullable(Int32) |
| 15 | cited_by_count | Nullable(Int32) |
| 16 | ids | Tuple(openalex Nullable(String), ror Nullable(String), grid Nullable(String), wikipedia Nullable(String), wikidata Nullable(String)) |
| 17 | roles | Array(Tuple(role Nullable(String), id Nullable(String), works_count Nullable(Int32))) |
| 18 | repositories | Array(Tuple(id Nullable(String), display_name Nullable(String), host_organization Nullable(String), host_organization_name Nullable(String), host_organization_lineage Array(Nullable(String)))) |
| 19 | geo | Tuple(city Nullable(String), geonames_city_id Nullable(String), region Nullable(String), country_code Nullable(String), country Nullable(String), latitude Nullable(Float64), longitude Nullable(Float64)) |
| 20 | topics | Array(Tuple(id Nullable(String), display_name Nullable(String), count Nullable(Int32), score Nullable(Float32), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String)))) |
| 21 | topic_share | Array(Tuple(id Nullable(String), display_name Nullable(String), value Nullable(Float64), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String)))) |
| 22 | associated_institutions | Array(Tuple(id Nullable(String), ror Nullable(String), display_name Nullable(String), country_code Nullable(String), type Nullable(String), relationship Nullable(String))) |
| 23 | counts_by_year | Array(Tuple(year Nullable(Int32), works_count Nullable(Int32), oa_works_count Nullable(Int32), cited_by_count Nullable(Int32))) |
| 24 | summary_stats | Tuple(`2yr_mean_citedness` Nullable(Float64), h_index Nullable(Int32), i10_index Nullable(Int32)) |
| 25 | status | Nullable(String) |
| 26 | works_api_url | Nullable(String) |
| 27 | updated_date | Nullable(DateTime64(6, \'UTC\')) |
| 28 | created_date | Nullable(DateTime64(6, \'UTC\')) |

## papers_full_test  (184,917행, 54열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | doi | String |
| 3 | title | String |
| 4 | abstract | String |
| 5 | publication_year | UInt16 |
| 6 | type | LowCardinality(String) |
| 7 | cited_by_count | UInt32 |
| 8 | authorships_json | String |
| 9 | primary_location_json | String |
| 10 | topics_json | String |
| 11 | referenced_works | Array(String) |
| 12 | is_oa | UInt8 |
| 13 | pdf_url | String |
| 14 | language | LowCardinality(String) |
| 15 | updated_date | Date |
| 16 | pmid | String |
| 17 | pmcid | String |
| 18 | ids_json | String |
| 19 | tier | UInt8 |
| 20 | ingested_at | DateTime |
| 21 | indexed_in | Array(Nullable(String)) |
| 22 | publication_date | Nullable(Date32) |
| 23 | authors_count | Nullable(Int32) |
| 24 | corresponding_author_ids | Array(Nullable(String)) |
| 25 | corresponding_institution_ids | Array(Nullable(String)) |
| 26 | primary_topic | Tuple(id Nullable(String), display_name Nullable(String), score Nullable(Float32), subfield Tuple(id Nullable(String), display_name Nullable(String)), field Tuple(id Nullable(String), display_name Nullable(String)), domain Tuple(id Nullable(String), display_name Nullable(String))) |
| 27 | keywords | Array(Tuple(id Nullable(String), display_name Nullable(String), score Nullable(Float32))) |
| 28 | concepts | Array(Tuple(id Nullable(String), wikidata Nullable(String), display_name Nullable(String), level Nullable(Int32), score Nullable(Float32))) |
| 29 | locations | Array(Tuple(id Nullable(String), source Tuple(id Nullable(String), display_name Nullable(String), issn_l Nullable(String), issn Array(Nullable(String)), is_oa Nullable(Bool), is_in_doaj Nullable(Bool), is_core Nullable(Bool), listed_in Array(Nullable(String)), host_organization Nullable(String), host_organization_name Nullable(String), host_organization_lineage Array(Nullable(String)), host_organization_lineage_names Array(Nullable(String)), type Nullable(String)), is_oa Nullable(Bool), is_published Nullable(Bool), landing_page_url Nullable(String), pdf_url Nullable(String), raw_source_name Nullable(String), raw_type Nullable(String), provenance Nullable(String), license Nullable(String), license_id Nullable(String), version Nullable(String), is_accepted Nullable(Bool))) |
| 30 | locations_count | Nullable(Int32) |
| 31 | best_oa_location | Tuple(id Nullable(String), source Tuple(id Nullable(String), display_name Nullable(String), issn_l Nullable(String), issn Array(Nullable(String)), is_oa Nullable(Bool), is_in_doaj Nullable(Bool), is_core Nullable(Bool), listed_in Array(Nullable(String)), host_organization Nullable(String), host_organization_name Nullable(String), host_organization_lineage Array(Nullable(String)), host_organization_lineage_names Array(Nullable(String)), type Nullable(String)), is_oa Nullable(Bool), is_published Nullable(Bool), landing_page_url Nullable(String), pdf_url Nullable(String), raw_source_name Nullable(String), raw_type Nullable(String), provenance Nullable(String), license Nullable(String), license_id Nullable(String), version Nullable(String), is_accepted Nullable(Bool)) |
| 32 | sustainable_development_goals | Array(Tuple(id Nullable(String), display_name Nullable(String), score Nullable(Float64))) |
| 33 | awards | Array(Tuple(id Nullable(String), display_name Nullable(String), funder_award_id Nullable(String), funder_id Nullable(String), funder_display_name Nullable(String))) |
| 34 | funders | Array(Tuple(id Nullable(String), display_name Nullable(String), ror Nullable(String))) |
| 35 | institutions | Array(Tuple(id Nullable(String), display_name Nullable(String), ror Nullable(String), country_code Nullable(String), type Nullable(String), lineage Array(Nullable(String)))) |
| 36 | countries_distinct_count | Nullable(Int32) |
| 37 | institutions_distinct_count | Nullable(Int32) |
| 38 | open_access | Tuple(is_oa Nullable(Bool), oa_status Nullable(String), any_repository_has_fulltext Nullable(Bool), oa_url Nullable(String)) |
| 39 | is_paratext | Nullable(Bool) |
| 40 | is_retracted | Nullable(Bool) |
| 41 | is_xpac | Nullable(Bool) |
| 42 | biblio | Tuple(volume Nullable(String), issue Nullable(String), first_page Nullable(String), last_page Nullable(String)) |
| 43 | referenced_works_count | Nullable(Int32) |
| 44 | related_works | Array(Nullable(String)) |
| 45 | counts_by_year | Array(Tuple(year Nullable(Int32), cited_by_count Nullable(Int32))) |
| 46 | apc_list | Tuple(value Nullable(Int32), currency Nullable(String), value_usd Nullable(Int32)) |
| 47 | apc_paid | Tuple(value Nullable(Float64), currency Nullable(String), value_usd Nullable(Float64)) |
| 48 | fwci | Nullable(Float64) |
| 49 | citation_normalized_percentile | Tuple(value Nullable(Float64), is_in_top_1_percent Nullable(Bool), is_in_top_10_percent Nullable(Bool)) |
| 50 | cited_by_percentile_year | Tuple(min Nullable(Int32), max Nullable(Int32)) |
| 51 | mesh | Array(Tuple(descriptor_ui Nullable(String), descriptor_name Nullable(String), qualifier_ui Nullable(String), qualifier_name Nullable(String), is_major_topic Nullable(Bool))) |
| 52 | has_content | Tuple(pdf Nullable(Bool), grobid_xml Nullable(Bool)) |
| 53 | has_fulltext | Nullable(Bool) |
| 54 | created_date | Nullable(DateTime64(6, \'UTC\')) |

## oa_source_issn  (420,589행, 5열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | source_num | Nullable(UInt64) |
| 2 | display_name | Nullable(String) |
| 3 | works_count | Nullable(Int32) |
| 4 | issn | Nullable(String) |
| 5 | kind | String |

## oa_authors_dupids  (1,690,884행, 1열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |

## oa_funders  (45,661행, 17열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | alternate_titles | Array(Nullable(String)) |
| 4 | country_code | Nullable(String) |
| 5 | description | Nullable(String) |
| 6 | homepage_url | Nullable(String) |
| 7 | image_url | Nullable(String) |
| 8 | image_thumbnail_url | Nullable(String) |
| 9 | ids | Tuple(openalex Nullable(String), ror Nullable(String), wikidata Nullable(String), crossref Nullable(Int64), doi Nullable(String)) |
| 10 | works_count | Nullable(Int32) |
| 11 | cited_by_count | Nullable(Int32) |
| 12 | awards_count | Nullable(Int64) |
| 13 | roles | Array(Tuple(role Nullable(String), id Nullable(String), works_count Nullable(Int32))) |
| 14 | counts_by_year | Array(Tuple(year Nullable(Int32), works_count Nullable(Int32), oa_works_count Nullable(Int32), cited_by_count Nullable(Int32))) |
| 15 | summary_stats | Tuple(`2yr_mean_citedness` Nullable(Float64), h_index Nullable(Int32), i10_index Nullable(Int32)) |
| 16 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 17 | updated_date | Nullable(DateTime64(6, \'UTC\')) |

## lit_journal2  (256,981행, 35열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | source_num | UInt64 |
| 2 | in_scie | UInt8 |
| 3 | in_ssci | UInt8 |
| 4 | in_ahci | UInt8 |
| 5 | in_esci | UInt8 |
| 6 | in_scopus | UInt8 |
| 7 | in_kci | UInt8 |
| 8 | in_doaj | UInt8 |
| 9 | jif | Float32 |
| 10 | jif_q | Nullable(String) |
| 11 | jif_est | Float32 |
| 12 | j_h | UInt32 |
| 13 | jif_5y | Float32 |
| 14 | jif_wo_self | Float32 |
| 15 | jif_below_0_1 | UInt8 |
| 16 | jci | Float32 |
| 17 | jci_q | String |
| 18 | jci_pct | Float32 |
| 19 | jif_pct | Float32 |
| 20 | jif_rank | String |
| 21 | immediacy | Float32 |
| 22 | eigenfactor | Float64 |
| 23 | norm_eigenfactor | Float64 |
| 24 | ais | Float32 |
| 25 | ais_q | String |
| 26 | cited_half_life | Float32 |
| 27 | citing_half_life | Float32 |
| 28 | jcr_total_cites | UInt64 |
| 29 | jcr_citable_items | UInt32 |
| 30 | jcr_pct_oa_gold | Float32 |
| 31 | jcr_categories | String |
| 32 | jcr_editions | String |
| 33 | jcr_category_json | String |
| 34 | has_jcr | UInt8 |
| 35 | is_core | UInt8 |

## jcr_by_source  (22,338행, 40열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | source_num | UInt64 |
| 2 | jcr_rank | Nullable(Float64) |
| 3 | jcr_journal_name | Nullable(String) |
| 4 | jcr_abbrev | Nullable(String) |
| 5 | jcr_publisher | Nullable(String) |
| 6 | jcr_issn | Nullable(String) |
| 7 | jcr_eissn | Nullable(String) |
| 8 | jcr_categories | Nullable(String) |
| 9 | jcr_editions | Nullable(String) |
| 10 | jcr_year | Nullable(Float64) |
| 11 | jif | Nullable(Float64) |
| 12 | jif_below_0_1 | Nullable(UInt8) |
| 13 | jif_5y | Nullable(Float64) |
| 14 | jif_5y_below_0_1 | Nullable(UInt8) |
| 15 | jif_wo_self | Nullable(Float64) |
| 16 | jif_wo_self_below_0_1 | Nullable(UInt8) |
| 17 | jif_quartile | Nullable(String) |
| 18 | jif_percentile | Nullable(Float64) |
| 19 | jif_rank | Nullable(String) |
| 20 | jci | Nullable(Float64) |
| 21 | jci_quartile | Nullable(String) |
| 22 | jci_percentile | Nullable(Float64) |
| 23 | jci_rank | Nullable(String) |
| 24 | total_citations | Nullable(Float64) |
| 25 | total_articles | Nullable(Float64) |
| 26 | citable_items | Nullable(Float64) |
| 27 | pct_articles_in_citable_items | Nullable(Float64) |
| 28 | pct_oa_gold | Nullable(Float64) |
| 29 | immediacy_index | Nullable(Float64) |
| 30 | immediacy_below_0_1 | Nullable(UInt8) |
| 31 | eigenfactor | Nullable(Float64) |
| 32 | normalized_eigenfactor | Nullable(Float64) |
| 33 | article_influence_score | Nullable(Float64) |
| 34 | ais_quartile | Nullable(String) |
| 35 | ais_rank | Nullable(String) |
| 36 | cited_half_life | Nullable(Float64) |
| 37 | citing_half_life | Nullable(Float64) |
| 38 | category_quartiles_json | Nullable(String) |
| 39 | jcr_rows_for_source | UInt64 |
| 40 | matched_by | Nullable(String) |

## oa_concepts  (65,026행, 18열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | level | Nullable(Int32) |
| 4 | description | Nullable(String) |
| 5 | wikidata | Nullable(String) |
| 6 | image_url | Nullable(String) |
| 7 | image_thumbnail_url | Nullable(String) |
| 8 | works_count | Nullable(Int32) |
| 9 | cited_by_count | Nullable(Int32) |
| 10 | ids | Tuple(openalex Nullable(String), wikidata Nullable(String), wikipedia Nullable(String), umls_aui Array(Nullable(String)), umls_cui Array(Nullable(String)), mag Nullable(String)) |
| 11 | works_api_url | Nullable(String) |
| 12 | summary_stats | Tuple(`2yr_mean_citedness` Nullable(Float64), h_index Nullable(Int32), i10_index Nullable(Int32)) |
| 13 | international | Map(String, Nullable(String)) |
| 14 | ancestors | Array(Nullable(String)) |
| 15 | related_concepts | Array(Nullable(String)) |
| 16 | counts_by_year | Array(Nullable(String)) |
| 17 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 18 | updated_date | Nullable(DateTime64(6, \'UTC\')) |

## jcr_journals  (22,643행, 33열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | rank | Nullable(Float64) |
| 2 | journal_name | String |
| 3 | abbreviated_journal | String |
| 4 | publisher | String |
| 5 | issn | String |
| 6 | eissn | String |
| 7 | categories | String |
| 8 | editions | String |
| 9 | jcr_year | Nullable(Float64) |
| 10 | c_2025_jif | String |
| 11 | c_5_year_jif | String |
| 12 | jif_without_self_cites | String |
| 13 | jif_quartile | String |
| 14 | jif_percentile | Nullable(Float64) |
| 15 | jif_rank | String |
| 16 | jci | Nullable(Float64) |
| 17 | jci_quartile | String |
| 18 | jci_percentile | Nullable(Float64) |
| 19 | jci_rank | String |
| 20 | total_citations | Nullable(Float64) |
| 21 | total_articles | Nullable(Float64) |
| 22 | citable_items | Nullable(Float64) |
| 23 | pct_articles_in_citable_items | Nullable(Float64) |
| 24 | pct_oa_gold | Nullable(Float64) |
| 25 | immediacy_index | String |
| 26 | eigenfactor | Nullable(Float64) |
| 27 | normalized_eigenfactor | Nullable(Float64) |
| 28 | article_influence_score | Nullable(Float64) |
| 29 | ais_quartile | String |
| 30 | ais_rank | String |
| 31 | cited_half_life | Nullable(Float64) |
| 32 | citing_half_life | Nullable(Float64) |
| 33 | category_quartiles_json | String |

## jcr_category  (32,215행, 18열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | rank | Nullable(Float64) |
| 2 | journal_name | String |
| 3 | issn | String |
| 4 | eissn | String |
| 5 | category | String |
| 6 | edition | String |
| 7 | jif_quartile | String |
| 8 | jif_percentile | Nullable(Float64) |
| 9 | jif_rank | String |
| 10 | jci_quartile | String |
| 11 | jci_percentile | Nullable(Float64) |
| 12 | jci_rank | String |
| 13 | ais_quartile | String |
| 14 | ais_rank | String |
| 15 | c_5_year_jif_quartile | String |
| 16 | c_2025_jif | String |
| 17 | c_5_year_jif | String |
| 18 | jci | Nullable(Float64) |

## lit_doi_dupe  (243,068행, 1열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | doi | String |

## lit_journal_carried  (203,498행, 12열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | source_num | UInt64 |
| 2 | in_scie | UInt8 |
| 3 | in_ssci | UInt8 |
| 4 | in_ahci | UInt8 |
| 5 | in_esci | UInt8 |
| 6 | in_scopus | UInt8 |
| 7 | in_kci | UInt8 |
| 8 | in_doaj | UInt8 |
| 9 | jif | Float32 |
| 10 | jif_q | String |
| 11 | jif_est | Float32 |
| 12 | j_h | UInt32 |

## lit_topic_year  (191,197행, 7열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | field | LowCardinality(String) |
| 2 | subfield | LowCardinality(String) |
| 3 | topic | String |
| 4 | year | UInt16 |
| 5 | n | UInt64 |
| 6 | n_kr | UInt64 |
| 7 | cited_sum | UInt64 |

## oa_keywords  (65,004행, 7열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | works_count | Nullable(Int32) |
| 4 | cited_by_count | Nullable(Int32) |
| 5 | works_api_url | Nullable(String) |
| 6 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 7 | updated_date | Nullable(DateTime64(6, \'UTC\')) |

## oa_topics  (4,516행, 14열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | description | Nullable(String) |
| 4 | keywords | Array(Nullable(String)) |
| 5 | ids | Tuple(openalex Nullable(String), wikipedia Nullable(String)) |
| 6 | subfield | Tuple(id Nullable(String), display_name Nullable(String)) |
| 7 | field | Tuple(id Nullable(String), display_name Nullable(String)) |
| 8 | domain | Tuple(id Nullable(String), display_name Nullable(String)) |
| 9 | siblings | Array(Tuple(id Nullable(String), display_name Nullable(String))) |
| 10 | works_count | Nullable(Int32) |
| 11 | cited_by_count | Nullable(Int32) |
| 12 | works_api_url | Nullable(String) |
| 13 | updated_date | Nullable(DateTime64(6, \'UTC\')) |
| 14 | created_date | Nullable(DateTime64(6, \'UTC\')) |

## jcr_source_map  (22,352행, 8열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | jcr_rank | Nullable(Float64) |
| 2 | journal_name | String |
| 3 | issn | String |
| 4 | eissn | String |
| 5 | source_num | Nullable(UInt64) |
| 6 | oa_name | Nullable(String) |
| 7 | matched_by | Nullable(String) |
| 8 | n_candidates | UInt64 |

## oa_publishers  (10,707행, 21열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | lineage | Array(Nullable(String)) |
| 3 | display_name | Nullable(String) |
| 4 | alternate_titles | Array(Nullable(String)) |
| 5 | country_codes | Array(Nullable(String)) |
| 6 | hierarchy_level | Nullable(Int32) |
| 7 | parent_publisher | Tuple(id Nullable(String), display_name Nullable(String)) |
| 8 | ids | Tuple(openalex Nullable(String), ror Nullable(String), wikidata Nullable(String)) |
| 9 | ror_id | Nullable(String) |
| 10 | image_url | Nullable(String) |
| 11 | image_thumbnail_url | Nullable(String) |
| 12 | wikidata_id | Nullable(String) |
| 13 | homepage_url | Nullable(String) |
| 14 | works_count | Nullable(Int64) |
| 15 | cited_by_count | Nullable(Int64) |
| 16 | summary_stats | Tuple(`2yr_mean_citedness` Nullable(Float64), h_index Nullable(Int32), i10_index Nullable(Int32)) |
| 17 | roles | Array(Tuple(role Nullable(String), id Nullable(String), works_count Nullable(Int32))) |
| 18 | counts_by_year | Array(Tuple(year Nullable(Int32), works_count Nullable(Int64), cited_by_count Nullable(Int64))) |
| 19 | sources_api_url | Nullable(String) |
| 20 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 21 | updated_date | Nullable(DateTime64(6, \'UTC\')) |

## lit_year_facet  (44,498행, 10열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | year | UInt16 |
| 2 | area | LowCardinality(String) |
| 3 | type | LowCardinality(String) |
| 4 | lang | LowCardinality(String) |
| 5 | n | UInt64 |
| 6 | n_citable | UInt64 |
| 7 | n_oa | UInt64 |
| 8 | n_abs | UInt64 |
| 9 | n_kr | UInt64 |
| 10 | cited_sum | UInt64 |

## oa_subfields  (252행, 14열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | description | Nullable(String) |
| 4 | ids | Tuple(openalex Nullable(String), wikidata Nullable(String), wikipedia Nullable(String)) |
| 5 | display_name_alternatives | Array(Nullable(String)) |
| 6 | field | Tuple(id Nullable(String), display_name Nullable(String)) |
| 7 | domain | Tuple(id Nullable(String), display_name Nullable(String)) |
| 8 | topics | Array(Tuple(id Nullable(String), display_name Nullable(String))) |
| 9 | siblings | Array(Tuple(id Nullable(String), display_name Nullable(String))) |
| 10 | works_count | Nullable(Int32) |
| 11 | cited_by_count | Nullable(Int32) |
| 12 | works_api_url | Nullable(String) |
| 13 | updated_date | Nullable(DateTime64(6, \'UTC\')) |
| 14 | created_date | Nullable(DateTime64(6, \'UTC\')) |

## lit_cohort  (742행, 6열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | field | LowCardinality(String) |
| 2 | year | UInt16 |
| 3 | type | LowCardinality(String) |
| 4 | n | UInt64 |
| 5 | mean | Float64 |
| 6 | qs | Array(Float64) |

## lit_journal_field  (8,904행, 2열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | journal_id | UInt64 |
| 2 | top_field | String |

## oa_countries  (247행, 21열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | country_code | Nullable(String) |
| 3 | display_name | Nullable(String) |
| 4 | continent_id | Nullable(Int32) |
| 5 | is_global_south | Nullable(Bool) |
| 6 | wikidata_url | Nullable(String) |
| 7 | wikipedia_url | Nullable(String) |
| 8 | display_name_alternatives | Array(Nullable(String)) |
| 9 | description | Nullable(String) |
| 10 | alpha_3 | Nullable(String) |
| 11 | numeric | Nullable(Int32) |
| 12 | full_name | Nullable(String) |
| 13 | works_count | Nullable(Int64) |
| 14 | cited_by_count | Nullable(Int64) |
| 15 | authors_api_url | Nullable(String) |
| 16 | institutions_api_url | Nullable(String) |
| 17 | works_api_url | Nullable(String) |
| 18 | ids | Tuple(openalex Nullable(String), iso Nullable(String), wikidata Nullable(String), wikipedia Nullable(String)) |
| 19 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 20 | updated_date | Nullable(DateTime64(6, \'UTC\')) |
| 21 | continent | Tuple(id Nullable(String), display_name Nullable(String)) |

## oa_fields  (26행, 13열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | description | Nullable(String) |
| 4 | ids | Tuple(openalex Nullable(String), wikidata Nullable(String), wikipedia Nullable(String)) |
| 5 | display_name_alternatives | Array(Nullable(String)) |
| 6 | domain | Tuple(id Nullable(String), display_name Nullable(String)) |
| 7 | subfields | Array(Tuple(id Nullable(String), display_name Nullable(String))) |
| 8 | siblings | Array(Tuple(id Nullable(String), display_name Nullable(String))) |
| 9 | works_count | Nullable(Int32) |
| 10 | cited_by_count | Nullable(Int32) |
| 11 | works_api_url | Nullable(String) |
| 12 | updated_date | Nullable(DateTime64(6, \'UTC\')) |
| 13 | created_date | Nullable(DateTime64(6, \'UTC\')) |

## oa_languages  (181행, 7열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | works_api_url | Nullable(String) |
| 3 | display_name | Nullable(String) |
| 4 | works_count | Nullable(Int64) |
| 5 | cited_by_count | Nullable(Int64) |
| 6 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 7 | updated_date | Nullable(DateTime64(6, \'UTC\')) |

## jcr_category_summary  (254행, 2열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | category | String |
| 2 | journal_category_records | Nullable(Float64) |

## oa_sdgs  (17행, 11열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | ids | Tuple(openalex Nullable(String), un Nullable(String), wikidata Nullable(String)) |
| 3 | display_name | Nullable(String) |
| 4 | description | Nullable(String) |
| 5 | works_count | Nullable(Int64) |
| 6 | cited_by_count | Nullable(Int64) |
| 7 | image_url | Nullable(String) |
| 8 | image_thumbnail_url | Nullable(String) |
| 9 | works_api_url | Nullable(String) |
| 10 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 11 | updated_date | Nullable(DateTime64(6, \'UTC\')) |

## oa_continents  (7행, 11열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | wikidata_id | Nullable(String) |
| 4 | wikidata_url | Nullable(String) |
| 5 | wikipedia_url | Nullable(String) |
| 6 | display_name_alternatives | Array(Nullable(String)) |
| 7 | description | Nullable(String) |
| 8 | ids | Tuple(openalex Nullable(String), wikidata Nullable(String)) |
| 9 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 10 | updated_date | Nullable(DateTime64(6, \'UTC\')) |
| 11 | countries | Array(Tuple(id Nullable(String), display_name Nullable(String))) |

## oa_domains  (4행, 12열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | description | Nullable(String) |
| 4 | ids | Tuple(openalex Nullable(String), wikidata Nullable(String), wikipedia Nullable(String)) |
| 5 | display_name_alternatives | Array(Nullable(String)) |
| 6 | fields | Array(Tuple(id Nullable(String), display_name Nullable(String))) |
| 7 | siblings | Array(Tuple(id Nullable(String), display_name Nullable(String))) |
| 8 | works_count | Nullable(Int32) |
| 9 | cited_by_count | Nullable(Int32) |
| 10 | works_api_url | Nullable(String) |
| 11 | updated_date | Nullable(DateTime64(6, \'UTC\')) |
| 12 | created_date | Nullable(DateTime64(6, \'UTC\')) |

## oa_licenses  (10행, 9열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | works_count | Nullable(Int64) |
| 4 | cited_by_count | Nullable(Int64) |
| 5 | url | Nullable(String) |
| 6 | description | Nullable(String) |
| 7 | works_api_url | Nullable(String) |
| 8 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 9 | updated_date | Nullable(DateTime64(6, \'UTC\')) |

## oa_institution_types  (8행, 7열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | works_api_url | Nullable(String) |
| 4 | works_count | Nullable(Int64) |
| 5 | cited_by_count | Nullable(Int64) |
| 6 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 7 | updated_date | Nullable(DateTime64(6, \'UTC\')) |

## oa_source_types  (6행, 7열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | id | String |
| 2 | display_name | Nullable(String) |
| 3 | works_api_url | Nullable(String) |
| 4 | works_count | Nullable(Int64) |
| 5 | cited_by_count | Nullable(Int64) |
| 6 | created_date | Nullable(DateTime64(6, \'UTC\')) |
| 7 | updated_date | Nullable(DateTime64(6, \'UTC\')) |

## lit_meta  (1행, 4열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | key | String |
| 2 | value | UInt64 |
| 3 | note | String |
| 4 | updated_at | DateTime |

## ingest_batches  (0행, 6열)

| # | 열 | 타입 |
|---:|---|---|
| 1 | batch_id | String |
| 2 | source_path | String |
| 3 | started_at | DateTime |
| 4 | finished_at | Nullable(DateTime) |
| 5 | rows_inserted | UInt64 |
| 6 | notes | String |