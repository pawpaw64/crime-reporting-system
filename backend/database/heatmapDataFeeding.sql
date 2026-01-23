USE securevoice;

-- Locations under Dhaka (matches existing district)
INSERT INTO location (location_name, district_name, latitude, longitude, accuracy_radius)
VALUES
  ('Dhanmondi, Dhaka', 'Dhaka', 23.746466, 90.376015, 50),
  ('Gulshan, Dhaka',   'Dhaka', 23.792500, 90.407806, 50),
  ('Mirpur, Dhaka',    'Dhaka', 23.815100, 90.366700, 60)
ON DUPLICATE KEY UPDATE
  latitude = VALUES(latitude),
  longitude = VALUES(longitude),
  accuracy_radius = VALUES(accuracy_radius);

-- Locations across other seeded districts
INSERT INTO location (location_name, district_name, latitude, longitude, accuracy_radius)
VALUES
  ('Barishal Sadar, Barishal', 'Barishal', 22.701000, 90.353500, 70),
  ('Khulna Sadar, Khulna', 'Khulna', 22.845600, 89.540300, 70),
  ('Rajshahi City, Rajshahi', 'Rajshahi', 24.363600, 88.624100, 70),
  ('Sylhet City, Sylhet', 'Sylhet', 24.894900, 91.868700, 70),
  ('Cumilla Sadar, Cumilla', 'Cumilla', 23.460700, 91.180900, 70),
  ('Noakhali Sadar, Noakhali', 'Noakhali', 22.869600, 91.099500, 70),
  ('Rangpur City, Rangpur', 'Rangpur', 25.743900, 89.275200, 70),
  ('Mymensingh City, Mymensingh', 'Mymensingh', 24.747100, 90.420300, 70),
  ('Jashore Sadar, Jashore', 'Jashore', 23.177800, 89.180500, 70),
  ('Cox''s Bazar Town, Cox''s Bazar', 'Cox''s Bazar', 21.427200, 92.005800, 70),
  ('Bogura Sadar, Bogura', 'Bogura', 24.846500, 89.377300, 70),
  ('Narayanganj City, Narayanganj', 'Narayanganj', 23.623800, 90.500000, 70),
  ('Gazipur Sadar, Gazipur', 'Gazipur', 23.999900, 90.420300, 70),
  ('Tangail Sadar, Tangail', 'Tangail', 24.251300, 89.916700, 70),
  ('Kushtia Sadar, Kushtia', 'Kushtia', 23.901300, 89.120500, 70),
  ('Pabna Sadar, Pabna', 'Pabna', 24.000000, 89.250000, 70)
ON DUPLICATE KEY UPDATE
  latitude = VALUES(latitude),
  longitude = VALUES(longitude),
  accuracy_radius = VALUES(accuracy_radius);

-- Complaints seeded for heatmap
INSERT INTO complaint (
  description, created_at, status, username, admin_username,
  location_id, complaint_type, location_address,
  latitude, longitude, location_accuracy_radius, category_id
)
VALUES
  ('Street robbery near Dhanmondi 27', NOW() - INTERVAL 3 DAY, 'pending', 'aitanzil', 'admin',
   (SELECT location_id FROM location WHERE location_name = 'Dhanmondi, Dhaka' LIMIT 1),
   'Robbery', 'Dhanmondi, Dhaka', 23.746466, 90.376015, 40, 7),

  ('Harassment reported at Gulshan park', NOW() - INTERVAL 2 DAY, 'investigating', 'aitanzil', 'admin',
   (SELECT location_id FROM location WHERE location_name = 'Gulshan, Dhaka' LIMIT 1),
    'Harassment', 'Gulshan, Dhaka', NULL, NULL, NULL, 8),  -- uses location fallback

  ('Assault incident in Gulshan 2', NOW() - INTERVAL 1 DAY, 'resolved', 'aitanzil', 'admin',
   (SELECT location_id FROM location WHERE location_name = 'Gulshan, Dhaka' LIMIT 1),
    'Assault', 'Gulshan, Dhaka', 23.792700, 90.407900, 30, 10),

    ('Bike theft near Mirpur 10', NOW() - INTERVAL 4 DAY, 'pending', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Mirpur, Dhaka' LIMIT 1),
    'Theft', 'Mirpur, Dhaka', 23.815300, 90.366900, 60, 7),

    ('Fraudulent mobile payment, Barishal Sadar', NOW() - INTERVAL 5 DAY, 'investigating', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Barishal Sadar, Barishal' LIMIT 1),
    'Fraud', 'Barishal Sadar, Barishal', NULL, NULL, NULL, 11),

    ('Extortion threat, Khulna Sadar', NOW() - INTERVAL 6 DAY, 'pending', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Khulna Sadar, Khulna' LIMIT 1),
    'Threat', 'Khulna Sadar, Khulna', 22.845700, 89.540500, 80, 9),

    ('Street harassment near Rajshahi City center', NOW() - INTERVAL 7 DAY, 'investigating', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Rajshahi City, Rajshahi' LIMIT 1),
    'Harassment', 'Rajshahi City, Rajshahi', NULL, NULL, NULL, 8),

    ('Group assault reported in Sylhet City', NOW() - INTERVAL 8 DAY, 'resolved', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Sylhet City, Sylhet' LIMIT 1),
    'Assault', 'Sylhet City, Sylhet', 24.895100, 91.868500, 50, 10),

    ('Identity fraud at Cumilla Sadar', NOW() - INTERVAL 4 DAY, 'pending', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Cumilla Sadar, Cumilla' LIMIT 1),
    'Fraud', 'Cumilla Sadar, Cumilla', NULL, NULL, NULL, 11),

    ('Armed mugging in Noakhali Sadar bazar', NOW() - INTERVAL 3 DAY, 'pending', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Noakhali Sadar, Noakhali' LIMIT 1),
    'Robbery', 'Noakhali Sadar, Noakhali', 22.869800, 91.099700, 60, 7),

    ('Political threat complaint, Rangpur City', NOW() - INTERVAL 6 DAY, 'investigating', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Rangpur City, Rangpur' LIMIT 1),
    'Threat', 'Rangpur City, Rangpur', NULL, NULL, NULL, 9),

    ('Bus stand harassment, Mymensingh City', NOW() - INTERVAL 5 DAY, 'pending', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Mymensingh City, Mymensingh' LIMIT 1),
    'Harassment', 'Mymensingh City, Mymensingh', 24.747300, 90.420500, 40, 8),

    ('Extortion call, Jashore Sadar', NOW() - INTERVAL 9 DAY, 'investigating', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Jashore Sadar, Jashore' LIMIT 1),
    'Threat', 'Jashore Sadar, Jashore', NULL, NULL, NULL, 9),

    ('Human trafficking tip, Cox''s Bazar Town', NOW() - INTERVAL 12 DAY, 'pending', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Cox''s Bazar Town, Cox''s Bazar' LIMIT 1),
    'Other', 'Cox''s Bazar Town, Cox''s Bazar', 21.427400, 92.006000, 100, 12),

    ('Bank card skimming, Bogura Sadar ATM', NOW() - INTERVAL 2 DAY, 'resolved', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Bogura Sadar, Bogura' LIMIT 1),
    'Fraud', 'Bogura Sadar, Bogura', NULL, NULL, NULL, 11),

    ('Warehouse theft, Narayanganj City', NOW() - INTERVAL 10 DAY, 'investigating', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Narayanganj City, Narayanganj' LIMIT 1),
    'Theft', 'Narayanganj City, Narayanganj', 23.624000, 90.500200, 80, 7),

    ('Industrial assault, Gazipur Sadar', NOW() - INTERVAL 11 DAY, 'pending', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Gazipur Sadar, Gazipur' LIMIT 1),
    'Assault', 'Gazipur Sadar, Gazipur', NULL, NULL, NULL, 10),

    ('Highway robbery, Tangail Sadar', NOW() - INTERVAL 14 DAY, 'pending', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Tangail Sadar, Tangail' LIMIT 1),
    'Robbery', 'Tangail Sadar, Tangail', 24.251500, 89.916900, 90, 7),

    ('Land dispute violence, Kushtia Sadar', NOW() - INTERVAL 13 DAY, 'resolved', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Kushtia Sadar, Kushtia' LIMIT 1),
    'Assault', 'Kushtia Sadar, Kushtia', NULL, NULL, NULL, 10),

    ('Cheque fraud complaint, Pabna Sadar', NOW() - INTERVAL 15 DAY, 'investigating', 'aitanzil', 'admin',
    (SELECT location_id FROM location WHERE location_name = 'Pabna Sadar, Pabna' LIMIT 1),
    'Fraud', 'Pabna Sadar, Pabna', 24.000200, 89.250200, 70, 11);

-- Verify what will appear on the heatmap
SELECT 
  c.complaint_id,
  c.complaint_type,
  COALESCE(c.latitude, l.latitude) AS lat,
  COALESCE(c.longitude, l.longitude) AS lng,
  l.location_name,
  c.status,
  c.category_id
FROM complaint c
LEFT JOIN location l ON c.location_id = l.location_id
WHERE COALESCE(c.latitude, l.latitude) IS NOT NULL;