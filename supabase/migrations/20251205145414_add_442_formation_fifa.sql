/*
  # Add 442 Formation FIFA Record to bigfloetoli

  1. Data Insertion
    - Inserts new record into `bigfloetoli` table
    - bigflo: "442 Formation - FIFA"
    - oli: M3U8 video stream URL from Galaxy API (video ID: 3123756)
  
  2. Notes
    - Uses ON CONFLICT to prevent duplicate inserts if migration runs multiple times
    - This is additional content data for the Jul page
*/

INSERT INTO bigfloetoli (bigflo, oli)
VALUES (
  '442 Formation - FIFA',
  'https://galaxy-api.galaxydve.com/publishing-proxy/3123756.m3u8?hash=eNpNUd1yqjAQfqNOAGH0UkUxqQkHBIK56QBBSCLUqRYhT39C2-n0cne-3916QqDO1yIU6DWzInHcorYMqnmGqYYWEWj1Uk9I8kN8KWgkQolHLLFDkvMddvtnka0-WK5mwrVyNkPVx5cqGEHukIkLaDAE1CfoQcVOUDxFGbg9lO-C9XA2k2W--dGNANE7g4-vZXC1WY7c3LYGFqQi7FyrDJ532MdDYWefX3yfdSwhLZNZS3wkMD3bpCPK7FtCoYt1arMgWjD_PPt0RY4eLFvd2BZ6OFnPWreSZj_eO4fIaEESNWLfZOiZOcJVGZ_RcG9lTy4s2AM295DwiWX6wAl8YD9qcBJ5WDcelrvvPrYLGHVBbv_t8aWlcdJorBUwOFU6_DN3sqk0eWDXAn7Y6FAsh8q2WnNDu6CGP1mK0fHGO1cdO24y7Rc1jW12co0PGBi15FH__mOonHhidP84dkDzpJnzTJyi744Cmm4pIFKJS_TCl9GSD2CNQJ68fdwP290deSqJLOtfaLXIQaRW9WvavO3wf6oquGE'
)
ON CONFLICT (id) DO NOTHING;