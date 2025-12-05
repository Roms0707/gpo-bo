/*
  # Populate bigfloetoli Table with Initial Test Data

  1. Data Insertion
    - Inserts initial test record into `bigfloetoli` table
    - bigflo: "Kickoff Glitch - FIFA"
    - oli: M3U8 video stream URL from Galaxy API
  
  2. Notes
    - This is test data for the Jul page
    - Uses ON CONFLICT to prevent duplicate inserts
*/

INSERT INTO bigfloetoli (bigflo, oli)
VALUES (
  'Kickoff Glitch - FIFA',
  'https://galaxy-api.galaxydve.com/publishing-proxy/1533916.m3u8?hash=eNpNkduOmzAQhp-oKwMh2lwmGyB2YyMIB8c3FeYQbDBNuyxgnr6m21a9sWRp_sM3U2sEanoUoUBfMysS1zfU8qDc_jBdoUUEOrzUGsnqEjdFHolQehZesYuT-ztU_lxkh5-MdpugL53TVA5xUwYLoA7RlYBmhoD6BvewYzcoZsEDd4Dyu2AD3MIkp6c_vhEgq2fm454Hvc0ocqltTSxIRahciwfzOxziqbCzj01PVLrgxO-JHc1hAB2WIMlkpLFiEq9ZZ94FKyJw0m05qqBoZNnhyd7gHifHzevJ8-wvk0NktCNJt-Cz6TAws4S-MzmL0T75QBoW-IBtHBLOWKYjTuCIz9EDJ9Eer489lt4nj-0ClruA2v9z_PbSRB4tIr3ZzHXcqT6ok2lu-kDVgupyWkPxOpW21Zod2kVu9NrqWL48K-V2V1WZTv6uzmOb3VyTAyaWW_K6_rvHVDqxZrk_XhVYq-Sx9dFVjj4ZBTRsKSCyE030os9jVqBp5bjvv-3q4DDN96aPL34bv35RnO-Q94PeWmeZ778AcFC6UA'
)
ON CONFLICT (id) DO NOTHING;