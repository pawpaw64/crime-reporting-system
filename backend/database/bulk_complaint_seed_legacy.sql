USE `securevoice`;

-- Bulk-generate synthetic complaints across existing locations (MySQL 5.7+ friendly)
-- Adjust the LIMIT at the bottom to control total rows (e.g., 1500).
-- Assumes users.username='aitanzil' and admins.username='admin'.
-- Requires existing locations with latitude/longitude.

-- Build an in-memory numbers set (~10k rows) without recursive CTE
WITH nums AS (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL
    SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
), seq AS (
    SELECT (a.n*1000 + b.n*100 + c.n*10 + d.n) + 1 AS n
    FROM nums a CROSS JOIN nums b CROSS JOIN nums c CROSS JOIN nums d
)
INSERT INTO complaint (
    description,
    created_at,
    status,
    username,
    admin_username,
    location_id,
    complaint_type,
    location_address,
    latitude,
    longitude,
    location_accuracy_radius,
    category_id
)
SELECT
    CONCAT('Synthetic complaint #', s.n, ' at ', l.location_name),
    NOW() - INTERVAL (s.n % 30) DAY,
    CASE 
        WHEN s.n % 4 = 0 THEN 'pending'
        WHEN s.n % 4 = 1 THEN 'investigating'
        WHEN s.n % 4 = 2 THEN 'resolved'
        ELSE 'verifying'
    END AS status,
    'aitanzil' AS username,
    'admin' AS admin_username,
    l.location_id,
    CASE 
        WHEN s.n % 6 = 0 THEN 'Robbery'
        WHEN s.n % 6 = 1 THEN 'Harassment'
        WHEN s.n % 6 = 2 THEN 'Threat'
        WHEN s.n % 6 = 3 THEN 'Assault'
        WHEN s.n % 6 = 4 THEN 'Fraud'
        ELSE 'Other'
    END AS complaint_type,
    l.location_name AS location_address,
    l.latitude  + (RAND(s.n)  - 0.5) / 200 AS latitude,
    l.longitude + (RAND(s.n*7) - 0.5) / 200 AS longitude,
    75 AS location_accuracy_radius,
    CASE 
        WHEN s.n % 6 = 0 THEN 7  -- Theft/Robbery
        WHEN s.n % 6 = 1 THEN 8  -- Harassment
        WHEN s.n % 6 = 2 THEN 9  -- Threat
        WHEN s.n % 6 = 3 THEN 10 -- Assault
        WHEN s.n % 6 = 4 THEN 11 -- Fraud
        ELSE 12                  -- Other
    END AS category_id
FROM (
    SELECT n FROM seq ORDER BY n LIMIT 1500  -- change this limit for more/less
) s
JOIN (
    SELECT 
        location_id,
        location_name,
        latitude,
        longitude,
        COUNT(*) OVER () AS total_count,
        ROW_NUMBER() OVER (ORDER BY location_id) AS rn
    FROM location
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
) l
  ON l.rn = ((s.n - 1) % l.total_count) + 1;

-- Verify insertion count
SELECT COUNT(*) AS total_bulk_inserted
FROM complaint
WHERE description LIKE 'Synthetic complaint #%';
