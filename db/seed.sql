-- ============================================================
-- UPI Fraud Detection Platform — Seed Data
-- ============================================================

-- ─── ADMIN USERS (passwords are bcrypt of 'Admin@1234') ──────────
INSERT INTO admin_users (id, username, hashed_password, role, last_login) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'superadmin',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8QQLalVT2.',
   'ROLE_SUPERADMIN', NOW() - INTERVAL '1 hour'),
  ('a1000000-0000-0000-0000-000000000002', 'analyst_priya',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8QQLalVT2.',
   'ROLE_ANALYST', NOW() - INTERVAL '3 hours'),
  ('a1000000-0000-0000-0000-000000000003', 'analyst_rahul',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8QQLalVT2.',
   'ROLE_ANALYST', NOW() - INTERVAL '2 days');

-- ─── USERS ───────────────────────────────────────────────────────
INSERT INTO users (upi_handle, phone_masked, email_masked, account_created, risk_tier) VALUES
  ('rahul.sharma@okaxis',    '+91-XXXXX-43210', 'r***l@gmail.com',     NOW() - INTERVAL '2 years',  'LOW'),
  ('priya.nair@oksbi',       '+91-XXXXX-98765', 'p***a@yahoo.com',     NOW() - INTERVAL '18 months', 'MEDIUM'),
  ('amit.gupta@paytm',       '+91-XXXXX-11223', 'a***t@hotmail.com',   NOW() - INTERVAL '3 years',  'HIGH'),
  ('sunita.rao@ybl',         '+91-XXXXX-55467', 's***a@gmail.com',     NOW() - INTERVAL '1 year',   'LOW'),
  ('vikram.mehta@okicici',   '+91-XXXXX-77890', 'v***m@corp.com',      NOW() - INTERVAL '6 months', 'CRITICAL'),
  ('deepika.joshi@oksbi',    '+91-XXXXX-22334', 'd***a@gmail.com',     NOW() - INTERVAL '4 months', 'HIGH'),
  ('rajesh.kumar@paytm',     '+91-XXXXX-66778', 'r***h@rediff.com',    NOW() - INTERVAL '2 years',  'LOW'),
  ('ananya.singh@okaxis',    '+91-XXXXX-99001', 'a***a@gmail.com',     NOW() - INTERVAL '8 months', 'MEDIUM'),
  ('kiran.reddy@ybl',        '+91-XXXXX-44321', 'k***n@gmail.com',     NOW() - INTERVAL '14 months','LOW'),
  ('mohan.das@okhdfc',       '+91-XXXXX-12345', 'm***n@mail.com',      NOW() - INTERVAL '1 month',  'CRITICAL');

-- ─── FRAUD RINGS ─────────────────────────────────────────────────
INSERT INTO fraud_rings (ring_id, ring_name, member_handles, total_amount, transaction_count,
                          fraud_type, geographic_spread, first_seen, last_seen,
                          is_active, estimated_stolen, graph_data) VALUES
  ('f0000000-0000-0000-0000-000000000001',
   'SIM Swap Gang Alpha',
   ARRAY['amit.gupta@paytm','vikram.mehta@okicici','mule01@paytm','mule02@oksbi'],
   485000.00, 23, 'SIM_SWAP',
   ARRAY['Mumbai','Pune','Nagpur'],
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '2 days', TRUE, 320000.00,
   '{"nodes":[{"id":"amit.gupta@paytm","label":"Originator","risk":0.97},{"id":"vikram.mehta@okicici","label":"Hub","risk":0.94},{"id":"mule01@paytm","label":"Mule","risk":0.88},{"id":"mule02@oksbi","label":"Mule","risk":0.85}],"edges":[{"source":"amit.gupta@paytm","target":"vikram.mehta@okicici","amount":210000},{"source":"vikram.mehta@okicici","target":"mule01@paytm","amount":120000},{"source":"vikram.mehta@okicici","target":"mule02@oksbi","amount":90000}]}'
   ),
  ('f0000000-0000-0000-0000-000000000002',
   'Delhi Phishing Ring',
   ARRAY['deepika.joshi@oksbi','phish01@ybl','phish02@okaxis'],
   198500.00, 12, 'PHISHING',
   ARRAY['Delhi','Gurgaon','Noida'],
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day', TRUE, 140000.00,
   '{"nodes":[{"id":"deepika.joshi@oksbi","label":"Controller","risk":0.91},{"id":"phish01@ybl","label":"Mule","risk":0.87},{"id":"phish02@okaxis","label":"Mule","risk":0.82}],"edges":[{"source":"deepika.joshi@oksbi","target":"phish01@ybl","amount":98500},{"source":"deepika.joshi@oksbi","target":"phish02@okaxis","amount":100000}]}'
   ),
  ('f0000000-0000-0000-0000-000000000003',
   'Velocity Abusers South',
   ARRAY['kiran.reddy@ybl','vel01@paytm','vel02@oksbi','vel03@okicici'],
   75200.00, 87, 'VELOCITY_ABUSE',
   ARRAY['Hyderabad','Chennai','Bangalore'],
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '3 hours', TRUE, 62000.00,
   '{"nodes":[{"id":"kiran.reddy@ybl","label":"Originator","risk":0.79},{"id":"vel01@paytm","label":"Receiver","risk":0.72},{"id":"vel02@oksbi","label":"Receiver","risk":0.70},{"id":"vel03@okicici","label":"Receiver","risk":0.68}],"edges":[{"source":"kiran.reddy@ybl","target":"vel01@paytm","amount":25200},{"source":"kiran.reddy@ybl","target":"vel02@oksbi","amount":28000},{"source":"kiran.reddy@ybl","target":"vel03@okicici","amount":22000}]}'
   ),
  ('f0000000-0000-0000-0000-000000000004',
   'Geo-Jump Fraudsters',
   ARRAY['mohan.das@okhdfc','geo01@paytm'],
   320000.00, 8, 'GEO_IMPOSSIBLE',
   ARRAY['Kolkata','Dubai','Singapore'],
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '12 hours', TRUE, 280000.00,
   '{"nodes":[{"id":"mohan.das@okhdfc","label":"Originator","risk":0.96},{"id":"geo01@paytm","label":"Receiver","risk":0.90}],"edges":[{"source":"mohan.das@okhdfc","target":"geo01@paytm","amount":320000}]}'
   ),
  ('f0000000-0000-0000-0000-000000000005',
   'Night-Device Combo Ring',
   ARRAY['priya.nair@oksbi','ananya.singh@okaxis','night01@ybl'],
   52000.00, 19, 'NIGHT_NEW_DEVICE',
   ARRAY['Bangalore','Mysore'],
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '6 hours', FALSE, 43000.00,
   '{"nodes":[{"id":"priya.nair@oksbi","label":"Originator","risk":0.75},{"id":"ananya.singh@okaxis","label":"Co-conspirator","risk":0.68},{"id":"night01@ybl","label":"Mule","risk":0.81}],"edges":[{"source":"priya.nair@oksbi","target":"night01@ybl","amount":28000},{"source":"ananya.singh@okaxis","target":"night01@ybl","amount":24000}]}'
   );

-- ─── TRANSACTIONS ─────────────────────────────────────────────────
INSERT INTO transactions (upi_handle, merchant, merchant_category, amount, timestamp,
                           risk_score, decision, fraud_type, status,
                           device_id, device_age_days, location_city, location_country,
                           shap_explanation, fraud_ring_id) VALUES
-- Legitimate transactions
('rahul.sharma@okaxis',  'Swiggy',        'FOOD',        340.00,  NOW()-INTERVAL '5 days',   0.04, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-ra-001', 730, 'Mumbai',    'IN', '{"top_features":[{"feature":"device_age_days","value":730,"contribution":-0.8},{"feature":"txn_velocity_1h","value":1,"contribution":-0.3}]}', NULL),
('rahul.sharma@okaxis',  'Amazon',        'ECOMMERCE',   1299.00, NOW()-INTERVAL '4 days',   0.06, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-ra-001', 730, 'Mumbai',    'IN', '{"top_features":[{"feature":"merchant_trust_score","value":0.95,"contribution":-0.9}]}', NULL),
('sunita.rao@ybl',       'Ola Cabs',      'TRANSPORT',   245.00,  NOW()-INTERVAL '3 days',   0.03, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-su-001', 365, 'Delhi',     'IN', '{"top_features":[{"feature":"amount_percentile","value":0.2,"contribution":-0.6}]}', NULL),
('rajesh.kumar@paytm',   'BigBasket',     'GROCERY',     876.50,  NOW()-INTERVAL '2 days',   0.07, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-rk-001', 900, 'Chennai',   'IN', '{"top_features":[{"feature":"upi_handle_age_days","value":900,"contribution":-0.85}]}', NULL),
('ananya.singh@okaxis',  'Zomato',        'FOOD',        520.00,  NOW()-INTERVAL '1 day',    0.12, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-an-001', 240, 'Bangalore', 'IN', '{"top_features":[{"feature":"txn_velocity_24h","value":3,"contribution":-0.4}]}', NULL),
-- SIM Swap fraud
('amit.gupta@paytm',     'UPI Transfer',  'P2P',        50000.00, NOW()-INTERVAL '40 days',  0.97, 'BLOCK', 'SIM_SWAP',   'CONFIRMED_FRAUD', 'dev-ag-new', 1, 'Mumbai', 'IN', '{"top_features":[{"feature":"device_age_days","value":1,"contribution":0.95},{"feature":"txn_velocity_1h","value":12,"contribution":0.88},{"feature":"biometric_delta","value":0.92,"contribution":0.75}]}', 'f0000000-0000-0000-0000-000000000001'),
('vikram.mehta@okicici', 'UPI Transfer',  'P2P',        75000.00, NOW()-INTERVAL '38 days',  0.94, 'BLOCK', 'SIM_SWAP',   'CONFIRMED_FRAUD', 'dev-vm-new', 2, 'Pune',   'IN', '{"top_features":[{"feature":"sim_change_flag","value":1,"contribution":0.98},{"feature":"amount_percentile","value":0.98,"contribution":0.82}]}', 'f0000000-0000-0000-0000-000000000001'),
('amit.gupta@paytm',     'CryptoExch',    'CRYPTO',     120000.00,NOW()-INTERVAL '35 days',  0.98, 'BLOCK', 'SIM_SWAP',   'CONFIRMED_FRAUD', 'dev-ag-new', 4, 'Nagpur', 'IN', '{"top_features":[{"feature":"merchant_category","value":"CRYPTO","contribution":0.91},{"feature":"graph_centrality","value":0.87,"contribution":0.79}]}', 'f0000000-0000-0000-0000-000000000001'),
-- Phishing
('deepika.joshi@oksbi',  'UPI Transfer',  'P2P',        45000.00, NOW()-INTERVAL '28 days',  0.91, 'BLOCK', 'PHISHING',   'CONFIRMED_FRAUD', 'dev-dj-002', 120, 'Delhi',  'IN', '{"top_features":[{"feature":"beneficiary_new","value":1,"contribution":0.89},{"feature":"txn_velocity_1h","value":8,"contribution":0.76}]}', 'f0000000-0000-0000-0000-000000000002'),
('deepika.joshi@oksbi',  'Online Wallet', 'WALLET',     38000.00, NOW()-INTERVAL '25 days',  0.88, 'BLOCK', 'PHISHING',   'CONFIRMED_FRAUD', 'dev-dj-002', 120, 'Gurgaon','IN', '{"top_features":[{"feature":"beneficiary_new","value":1,"contribution":0.85}]}', 'f0000000-0000-0000-0000-000000000002'),
-- Velocity abuse
('kiran.reddy@ybl',      'UPI Transfer',  'P2P',          500.00, NOW()-INTERVAL '14 days',  0.79, 'FLAG',  'VELOCITY_ABUSE','REVIEWED', 'dev-kr-001', 420, 'Hyderabad','IN', '{"top_features":[{"feature":"txn_velocity_1h","value":24,"contribution":0.92},{"feature":"amount_percentile","value":0.4,"contribution":0.1}]}', 'f0000000-0000-0000-0000-000000000003'),
('kiran.reddy@ybl',      'UPI Transfer',  'P2P',          500.00, NOW()-INTERVAL '14 days'+INTERVAL '1 minute',  0.81, 'BLOCK',  'VELOCITY_ABUSE','CONFIRMED_FRAUD', 'dev-kr-001', 420, 'Hyderabad','IN', '{"top_features":[{"feature":"txn_velocity_1h","value":25,"contribution":0.93}]}', 'f0000000-0000-0000-0000-000000000003'),
-- Geo impossible
('mohan.das@okhdfc',     'Dubai Shop',    'ECOMMERCE',  95000.00, NOW()-INTERVAL '6 days',   0.96, 'BLOCK', 'GEO_IMPOSSIBLE','CONFIRMED_FRAUD','dev-md-new', 5, 'Dubai', 'AE', '{"top_features":[{"feature":"location_delta_km","value":5200,"contribution":0.97},{"feature":"time_since_last_txn_mins","value":45,"contribution":0.88}]}', 'f0000000-0000-0000-0000-000000000004'),
-- Night + new device
('priya.nair@oksbi',     'UPI Transfer',  'P2P',        14000.00, NOW()-INTERVAL '18 days',  0.75, 'FLAG',  'NIGHT_NEW_DEVICE','REVIEWED', 'dev-pn-new', 3, 'Bangalore','IN', '{"top_features":[{"feature":"hour_of_day","value":3,"contribution":0.82},{"feature":"device_age_days","value":3,"contribution":0.71}]}', 'f0000000-0000-0000-0000-000000000005'),
('ananya.singh@okaxis',  'UPI Transfer',  'P2P',        11000.00, NOW()-INTERVAL '16 days',  0.68, 'FLAG',  'NIGHT_NEW_DEVICE','FALSE_POSITIVE', 'dev-an-new', 2, 'Mysore', 'IN', '{"top_features":[{"feature":"hour_of_day","value":2,"contribution":0.78}]}', 'f0000000-0000-0000-0000-000000000005'),
-- More legitimate
('rahul.sharma@okaxis',  'Flipkart',      'ECOMMERCE',  3499.00,  NOW()-INTERVAL '10 days',  0.08, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-ra-001', 730, 'Mumbai',    'IN', '{"top_features":[{"feature":"merchant_trust_score","value":0.93,"contribution":-0.88}]}', NULL),
('sunita.rao@ybl',       'IRCTC',         'TRAVEL',     1850.00,  NOW()-INTERVAL '9 days',   0.05, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-su-001', 365, 'Delhi',     'IN', '{"top_features":[{"feature":"upi_handle_age_days","value":365,"contribution":-0.7}]}', NULL),
('rajesh.kumar@paytm',   'Electricity',   'UTILITY',    2340.00,  NOW()-INTERVAL '8 days',   0.04, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-rk-001', 900, 'Chennai',   'IN', '{"top_features":[{"feature":"merchant_category","value":"UTILITY","contribution":-0.9}]}', NULL),
('rahul.sharma@okaxis',  'Netflix',       'ENTERTAINMENT',649.00, NOW()-INTERVAL '7 days',   0.03, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-ra-001', 730, 'Mumbai',    'IN', '{"top_features":[{"feature":"txn_velocity_24h","value":2,"contribution":-0.5}]}', NULL),
('sunita.rao@ybl',       'PharmEasy',     'PHARMACY',   856.00,   NOW()-INTERVAL '6 days',   0.06, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-su-001', 365, 'Delhi',     'IN', '{"top_features":[{"feature":"amount_percentile","value":0.35,"contribution":-0.55}]}', NULL),
-- Device spoofing
('mohan.das@okhdfc',     'e-Wallet',      'WALLET',     22000.00, NOW()-INTERVAL '5 days',   0.89, 'BLOCK', 'DEVICE_SPOOFING','CONFIRMED_FRAUD','dev-emulator-x', 0, 'Unknown','IN', '{"top_features":[{"feature":"is_emulator","value":1,"contribution":0.99},{"feature":"device_age_days","value":0,"contribution":0.93}]}', NULL),
-- Additional legitimate
('kiran.reddy@ybl',      'D-Mart',        'GROCERY',    1245.00,  NOW()-INTERVAL '21 days',  0.05, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-kr-001', 420, 'Hyderabad', 'IN', '{"top_features":[{"feature":"merchant_trust_score","value":0.92,"contribution":-0.86}]}', NULL),
('ananya.singh@okaxis',  'Book My Show',  'ENTERTAINMENT',850.00, NOW()-INTERVAL '20 days',  0.09, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-an-001', 240, 'Bangalore', 'IN', '{"top_features":[{"feature":"txn_velocity_1h","value":1,"contribution":-0.6}]}', NULL),
('rajesh.kumar@paytm',   'Myntra',        'ECOMMERCE',  2100.00,  NOW()-INTERVAL '19 days',  0.08, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-rk-001', 900, 'Chennai',   'IN', '{"top_features":[{"feature":"upi_handle_age_days","value":900,"contribution":-0.84}]}', NULL),
('rahul.sharma@okaxis',  'Petrol Pump',   'FUEL',       3500.00,  NOW()-INTERVAL '18 days',  0.04, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-ra-001', 730, 'Mumbai',    'IN', '{"top_features":[{"feature":"location_city","value":"Mumbai","contribution":-0.4}]}', NULL),
-- More flagged
('priya.nair@oksbi',     'UPI Transfer',  'P2P',        8500.00,  NOW()-INTERVAL '17 days',  0.62, 'FLAG',  'NIGHT_NEW_DEVICE','REVIEWED', 'dev-pn-new', 3, 'Bangalore','IN', '{"top_features":[{"feature":"hour_of_day","value":1,"contribution":0.75}]}', 'f0000000-0000-0000-0000-000000000005'),
('vikram.mehta@okicici', 'Cash Withdraw', 'ATM',        40000.00, NOW()-INTERVAL '16 days',  0.93, 'BLOCK', 'SIM_SWAP',   'CONFIRMED_FRAUD','dev-vm-new', 2, 'Pune',   'IN', '{"top_features":[{"feature":"sim_change_flag","value":1,"contribution":0.97}]}', 'f0000000-0000-0000-0000-000000000001'),
('amit.gupta@paytm',     'UPI Transfer',  'P2P',        85000.00, NOW()-INTERVAL '15 days',  0.96, 'BLOCK', 'MULE_NETWORK','CONFIRMED_FRAUD','dev-ag-new', 4, 'Mumbai', 'IN', '{"top_features":[{"feature":"graph_centrality","value":0.91,"contribution":0.94},{"feature":"txn_velocity_24h","value":18,"contribution":0.85}]}', 'f0000000-0000-0000-0000-000000000001'),
-- More legitimate low-risk
('sunita.rao@ybl',       'Uber',          'TRANSPORT',  380.00,   NOW()-INTERVAL '12 days',  0.04, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-su-001', 365, 'Delhi',     'IN', '{"top_features":[{"feature":"merchant_trust_score","value":0.95,"contribution":-0.9}]}', NULL),
('rajesh.kumar@paytm',   'Pizza Hut',     'FOOD',       640.00,   NOW()-INTERVAL '11 days',  0.06, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-rk-001', 900, 'Chennai',   'IN', '{"top_features":[{"feature":"txn_velocity_1h","value":1,"contribution":-0.55}]}', NULL),
('ananya.singh@okaxis',  'Jio Recharge',  'TELECOM',    299.00,   NOW()-INTERVAL '10 days',  0.03, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-an-001', 240, 'Bangalore', 'IN', '{"top_features":[{"feature":"merchant_category","value":"TELECOM","contribution":-0.8}]}', NULL),
('kiran.reddy@ybl',      'Apollo Pharm',  'PHARMACY',   1120.00,  NOW()-INTERVAL '9 days',   0.05, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-kr-001', 420, 'Hyderabad', 'IN', '{"top_features":[{"feature":"amount_percentile","value":0.45,"contribution":-0.5}]}', NULL),
('rahul.sharma@okaxis',  'Zepto',         'GROCERY',    560.00,   NOW()-INTERVAL '8 days',   0.05, 'ALLOW', 'LEGITIMATE', 'PROCESSED', 'dev-ra-001', 730, 'Mumbai',    'IN', '{"top_features":[{"feature":"upi_handle_age_days","value":730,"contribution":-0.78}]}', NULL),
-- High risk flagged (today)
('mohan.das@okhdfc',     'FX Exchange',   'FOREX',      150000.00, NOW()-INTERVAL '2 hours', 0.95, 'BLOCK', 'GEO_IMPOSSIBLE','PENDING', 'dev-md-new', 5, 'Singapore','SG', '{"top_features":[{"feature":"location_delta_km","value":6000,"contribution":0.98}]}', 'f0000000-0000-0000-0000-000000000004'),
('deepika.joshi@oksbi',  'UPI Transfer',  'P2P',        25000.00, NOW()-INTERVAL '4 hours',  0.87, 'BLOCK', 'PHISHING',   'PENDING',   'dev-dj-002', 120, 'Noida',   'IN', '{"top_features":[{"feature":"beneficiary_new","value":1,"contribution":0.88}]}', 'f0000000-0000-0000-0000-000000000002'),
('vikram.mehta@okicici', 'Loan App',      'FINTECH',    200000.00, NOW()-INTERVAL '3 hours', 0.94, 'BLOCK', 'SIM_SWAP',   'PENDING',   'dev-vm-new', 2, 'Mumbai',   'IN', '{"top_features":[{"feature":"sim_change_flag","value":1,"contribution":0.96}]}', 'f0000000-0000-0000-0000-000000000001'),
-- Medium risk today
('priya.nair@oksbi',     'Snapdeal',      'ECOMMERCE',  4500.00,  NOW()-INTERVAL '1 hour',   0.45, 'FLAG',  'LEGITIMATE', 'PENDING',   'dev-pn-001', 545, 'Bangalore','IN', '{"top_features":[{"feature":"device_age_days","value":545,"contribution":-0.4},{"feature":"txn_velocity_24h","value":6,"contribution":0.3}]}', NULL),
('ananya.singh@okaxis',  'Groww App',     'INVESTMENTS',10000.00, NOW()-INTERVAL '30 minutes',0.38,'FLAG',  'LEGITIMATE', 'PENDING',   'dev-an-001', 240, 'Bangalore','IN', '{"top_features":[{"feature":"amount_percentile","value":0.72,"contribution":0.35}]}', NULL),
-- Very recent
('rahul.sharma@okaxis',  'Blinkit',       'GROCERY',    675.00,   NOW()-INTERVAL '5 minutes', 0.05,'ALLOW','LEGITIMATE', 'PROCESSED', 'dev-ra-001', 730, 'Mumbai',    'IN', '{"top_features":[{"feature":"merchant_trust_score","value":0.94,"contribution":-0.87}]}', NULL),
('sunita.rao@ybl',       'Meesho',        'ECOMMERCE',  1200.00,  NOW()-INTERVAL '10 minutes',0.07,'ALLOW','LEGITIMATE', 'PROCESSED', 'dev-su-001', 365, 'Delhi',     'IN', '{"top_features":[{"feature":"upi_handle_age_days","value":365,"contribution":-0.72}]}', NULL),
('rajesh.kumar@paytm',   'Tata Neu',      'ECOMMERCE',  2800.00,  NOW()-INTERVAL '15 minutes',0.06,'ALLOW','LEGITIMATE', 'PROCESSED', 'dev-rk-001', 900, 'Chennai',   'IN', '{"top_features":[{"feature":"txn_velocity_1h","value":1,"contribution":-0.6}]}', NULL),
-- Critical block now
('kiran.reddy@ybl',      'UPI Transfer',  'P2P',          499.00, NOW()-INTERVAL '2 minutes', 0.82,'BLOCK','VELOCITY_ABUSE','PENDING', 'dev-kr-001', 420, 'Hyderabad', 'IN', '{"top_features":[{"feature":"txn_velocity_1h","value":31,"contribution":0.94}]}', 'f0000000-0000-0000-0000-000000000003'),
('deepika.joshi@oksbi',  'Pay Link',      'P2P',        18000.00, NOW()-INTERVAL '8 minutes', 0.89,'BLOCK','PHISHING',   'PENDING',   'dev-dj-003', 0, 'Delhi',     'IN', '{"top_features":[{"feature":"beneficiary_new","value":1,"contribution":0.9},{"feature":"device_age_days","value":0,"contribution":0.85}]}', 'f0000000-0000-0000-0000-000000000002'),
-- Additional legitimate misc
('sunita.rao@ybl',       'Health Ins',    'INSURANCE',  5400.00,  NOW()-INTERVAL '22 days',   0.04,'ALLOW','LEGITIMATE', 'PROCESSED', 'dev-su-001', 365, 'Delhi',     'IN', '{"top_features":[{"feature":"merchant_category","value":"INSURANCE","contribution":-0.85}]}', NULL),
('rahul.sharma@okaxis',  'Eye Hospital',  'HEALTHCARE', 8500.00,  NOW()-INTERVAL '23 days',   0.07,'ALLOW','LEGITIMATE', 'PROCESSED', 'dev-ra-001', 730, 'Mumbai',    'IN', '{"top_features":[{"feature":"merchant_trust_score","value":0.88,"contribution":-0.75}]}', NULL),
('kiran.reddy@ybl',      'LIC Premium',   'INSURANCE',  12000.00, NOW()-INTERVAL '25 days',   0.03,'ALLOW','LEGITIMATE', 'PROCESSED', 'dev-kr-001', 420, 'Hyderabad', 'IN', '{"top_features":[{"feature":"upi_handle_age_days","value":420,"contribution":-0.8}]}', NULL),
('rajesh.kumar@paytm',   'School Fee',    'EDUCATION',  15000.00, NOW()-INTERVAL '27 days',   0.04,'ALLOW','LEGITIMATE', 'PROCESSED', 'dev-rk-001', 900, 'Chennai',   'IN', '{"top_features":[{"feature":"merchant_category","value":"EDUCATION","contribution":-0.9}]}', NULL),
('ananya.singh@okaxis',  'Zerodha',       'INVESTMENTS',25000.00, NOW()-INTERVAL '28 days',   0.09,'ALLOW','LEGITIMATE', 'PROCESSED', 'dev-an-001', 240, 'Bangalore', 'IN', '{"top_features":[{"feature":"account_created_days","value":240,"contribution":-0.5}]}', NULL);

-- ─── MODEL RUN (active) ───────────────────────────────────────────
INSERT INTO model_runs (version, accuracy, f1_score, precision_score, recall_score,
                         auc_roc, false_positive_rate, confusion_matrix, feature_importance,
                         training_samples, is_active, trained_at, deployed_at, notes) VALUES
  ('v2.4.1', 0.9847, 0.9712, 0.9788, 0.9638, 0.9923, 0.0212,
   '{"tp":4219,"fp":91,"tn":42109,"fn":162}',
   '[{"feature":"txn_velocity_1h","importance":0.187},{"feature":"device_age_days","importance":0.162},{"feature":"amount_percentile","importance":0.134},{"feature":"graph_centrality","importance":0.119},{"feature":"biometric_delta","importance":0.098},{"feature":"sim_change_flag","importance":0.087},{"feature":"location_delta_km","importance":0.074},{"feature":"hour_of_day","importance":0.061},{"feature":"merchant_trust_score","importance":0.048},{"feature":"beneficiary_new","importance":0.030}]',
   46581, TRUE, NOW()-INTERVAL '7 days', NOW()-INTERVAL '6 days',
   'XGBoost v2 + LSTM sequence model. Trained on Q1 2024 data. Improved SIM-swap recall by 4.2%.'),
  ('v2.3.0', 0.9791, 0.9654, 0.9723, 0.9587, 0.9889, 0.0277,
   '{"tp":4174,"fp":119,"tn":42081,"fn":207}',
   '[{"feature":"txn_velocity_1h","importance":0.192},{"feature":"device_age_days","importance":0.155}]',
   44200, FALSE, NOW()-INTERVAL '35 days', NOW()-INTERVAL '34 days',
   'Baseline XGBoost model. Replaced by v2.4.1.');
