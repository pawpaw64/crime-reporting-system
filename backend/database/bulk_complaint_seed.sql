USE `securevoice`;

-- Bulk-generate synthetic complaints across existing locations
-- Requires MySQL 8+ (uses recursive CTE and window functions)
-- Assumes users.username='aitanzil' and admins.username='admin'

WITH RECURSIVE seq AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM seq WHERE n < 250  -- adjust to generate more/less rows
),
locs AS (
    SELECT 
        location_id,
        location_name,
        district_name,
        latitude,
        longitude,        mysql -u root -p securevoice < backend/database/bulk_complaint_seed_legacy.sql
        ROW_NUMBER() OVER (ORDER BY location_id) AS rn,
        COUNT(*) OVER () AS total_count
    FROM location
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
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
    -- small jitter around the base location to spread points
    l.latitude  + (RAND(s.n)  - 0.5) / 150 AS latitude,
    l.longitude + (RAND(s.n*7) - 0.5) / 150 AS longitude,
    75 AS location_accuracy_radius,
    CASE 
        WHEN s.n % 6 = 0 THEN 7  -- Theft/Robbery
        WHEN s.n % 6 = 1 THEN 8  -- Harassment
        WHEN s.n % 6 = 2 THEN 9  -- Threat
        WHEN s.n % 6 = 3 THEN 10 -- Assault
        WHEN s.n % 6 = 4 THEN 11 -- Fraud
        ELSE 12                  -- Other
    END AS category_id
FROM seq s
JOIN locs l
  ON l.rn = ((s.n - 1) % l.total_count) + 1;

-- Verify insertion count
SELECT COUNT(*) AS total_bulk_inserted
FROM complaint
WHERE description LIKE 'Synthetic complaint #%';
