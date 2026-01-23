# Crime Reporting System Test Cases

## Authentication Tests

### 1. Test Case ID: TC_Auth_01
**Title:** User Login with Valid Credentials  
**Precondition:** User account exists in the database with valid username and hashed password.  
**Steps:**
- Navigate to the login page
- Enter valid username in the username field
- Enter valid password in the password field
- Click 'Login' button

**Test Data:**
- Username: `testuser`
- Password: `Test@123`

**Expected Result:** 
- User is successfully authenticated
- Session is created with userId, username, and email
- Returns status 200 with success message
- User is redirected to `/profile` page

---

### 2. Test Case ID: TC_Auth_02
**Title:** Login with Missing Username  
**Precondition:** Login endpoint is accessible.  
**Steps:**
- Navigate to the login page
- Leave username field empty
- Enter password in the password field
- Click 'Login' button

**Test Data:**
- Username: ` ` (empty)
- Password: `Test@123`

**Expected Result:** 
- Returns status 400
- Response contains error message: "Username and password are required"
- User is not authenticated
- No session is created

---

### 3. Test Case ID: TC_Auth_03
**Title:** Login with Missing Password  
**Precondition:** Login endpoint is accessible.  
**Steps:**
- Navigate to the login page
- Enter username in the username field
- Leave password field empty
- Click 'Login' button

**Test Data:**
- Username: `testuser`
- Password: ` ` (empty)

**Expected Result:** 
- Returns status 400
- Response contains error message: "Username and password are required"
- User is not authenticated
- No session is created

---

### 4. Test Case ID: TC_Auth_04
**Title:** Login with Empty String Username  
**Precondition:** Login endpoint is accessible.  
**Steps:**
- Navigate to the login page
- Enter empty string ("") in username field
- Enter valid password
- Click 'Login' button

**Test Data:**
- Username: `""` (empty string)
- Password: `Test@123`

**Expected Result:** 
- Returns status 400
- Response contains error message: "Username and password are required"
- User is not authenticated

---

### 5. Test Case ID: TC_Auth_05
**Title:** Login with Non-Existent Username  
**Precondition:** Username does not exist in the database.  
**Steps:**
- Navigate to the login page
- Enter non-existent username
- Enter any password
- Click 'Login' button

**Test Data:**
- Username: `nonexistentuser`
- Password: `Test@123`

**Expected Result:** 
- Returns status 401
- Response contains error message: "Invalid username or password"
- User is not authenticated
- No session is created

---

### 6. Test Case ID: TC_Auth_06
**Title:** Login with Incorrect Password  
**Precondition:** User account exists but password is incorrect.  
**Steps:**
- Navigate to the login page
- Enter valid username
- Enter incorrect password
- Click 'Login' button

**Test Data:**
- Username: `testuser`
- Password: `WrongPassword123`

**Expected Result:** 
- Returns status 401
- Response contains error message: "Invalid username or password"
- User is not authenticated
- No session is created

---

### 7. Test Case ID: TC_Auth_07
**Title:** Verify Session Creation on Successful Login  
**Precondition:** User account exists with valid credentials.  
**Steps:**
- Navigate to the login page
- Enter valid username and password
- Click 'Login' button
- Verify session data

**Test Data:**
- Username: `testuser`
- Password: `Test@123`

**Expected Result:** 
- User is successfully authenticated
- Session contains `userId` field
- Session contains `username` field
- Session contains `email` field
- All session data matches user record from database

---

### 8. Test Case ID: TC_Auth_08
**Title:** Database Connection Failure During Login  
**Precondition:** Database is unavailable or connection fails.  
**Steps:**
- Simulate database connection failure
- Navigate to the login page
- Enter valid credentials
- Click 'Login' button

**Test Data:**
- Username: `testuser`
- Password: `Test@123`

**Expected Result:** 
- Returns status 500
- Response contains error message: "Internal server error"
- User is not authenticated
- Error is logged to console

---

### 9. Test Case ID: TC_Auth_09
**Title:** Security - Same Error for Wrong Username and Wrong Password  
**Precondition:** Login endpoint is accessible.  
**Steps:**
- First attempt: Enter non-existent username with any password
- Second attempt: Enter valid username with wrong password
- Compare error messages

**Test Data:**
- Attempt 1: Username: `wronguser`, Password: `Test@123`
- Attempt 2: Username: `testuser`, Password: `WrongPass123`

**Expected Result:** 
- Both attempts return status 401
- Both attempts return identical error message: "Invalid username or password"
- No information is leaked about whether username exists or not

---

### 10. Test Case ID: TC_Auth_10
**Title:** Login with Special Characters in Username  
**Precondition:** User account exists with special characters in username.  
**Steps:**
- Navigate to the login page
- Enter username containing special characters
- Enter valid password
- Click 'Login' button

**Test Data:**
- Username: `test@user#123`
- Password: `Test@123`

**Expected Result:** 
- User is successfully authenticated
- Session is created properly
- Returns status 200 with success message

---

### 11. Test Case ID: TC_Auth_11
**Title:** Login with Unicode Characters in Username  
**Precondition:** User account exists with unicode characters.  
**Steps:**
- Navigate to the login page
- Enter username with unicode characters
- Enter valid password
- Click 'Login' button

**Test Data:**
- Username: `用户123` (Chinese characters)
- Password: `Test@123`

**Expected Result:** 
- User is successfully authenticated
- Unicode characters are handled correctly
- Returns status 200 with success message

---

## Complaint Submission Tests

### 12. Test Case ID: TC_Complaint_01
**Title:** Submit Complaint Without Authentication  
**Precondition:** User is not logged in (no session).  
**Steps:**
- Attempt to access complaint submission endpoint
- Try to submit a complaint without session

**Test Data:**
- Session: None
- Complaint Type: `Theft`
- Description: `Test complaint`

**Expected Result:** 
- Returns status 401
- Response contains error message: "User not authenticated"
- Complaint is not created
- User is redirected to login page

---

### 13. Test Case ID: TC_Complaint_02
**Title:** Submit Complaint with Valid Authentication  
**Precondition:** User is logged in with valid session.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Fill all required fields
- Click 'Submit' button

**Test Data:**
- Session: Valid (userId: 123)
- Complaint Type: `Theft`
- Description: `My bike was stolen`
- Incident Date: `2026-01-15`
- Location: `Downtown Area`
- District: `Central District`

**Expected Result:** 
- Returns status 200
- Complaint is successfully created
- Response contains success message
- Complaint ID is returned
- User receives confirmation

---

### 14. Test Case ID: TC_Complaint_03
**Title:** Submit Complaint with Missing Complaint Type  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Fill all fields except complaint type
- Click 'Submit' button

**Test Data:**
- Complaint Type: ` ` (empty)
- Description: `Test description`
- Incident Date: `2026-01-15`
- Location: `Downtown Area`

**Expected Result:** 
- Returns status 400
- Response contains error message: "Complaint type is required"
- Complaint is not created

---

### 15. Test Case ID: TC_Complaint_04
**Title:** Submit Complaint with Missing Description  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Fill all fields except description
- Click 'Submit' button

**Test Data:**
- Complaint Type: `Theft`
- Description: ` ` (empty)
- Incident Date: `2026-01-15`
- Location: `Downtown Area`

**Expected Result:** 
- Returns status 400
- Response contains error message: "Description is required"
- Complaint is not created

---

### 16. Test Case ID: TC_Complaint_05
**Title:** Submit Complaint with Missing Incident Date  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Fill all fields except incident date
- Click 'Submit' button

**Test Data:**
- Complaint Type: `Theft`
- Description: `Test description`
- Incident Date: ` ` (empty)
- Location: `Downtown Area`

**Expected Result:** 
- Returns status 400
- Response contains error message: "Incident date is required"
- Complaint is not created

---

### 17. Test Case ID: TC_Complaint_06
**Title:** Submit Complaint with Missing Location  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Fill all fields except location
- Click 'Submit' button

**Test Data:**
- Complaint Type: `Theft`
- Description: `Test description`
- Incident Date: `2026-01-15`
- Location: ` ` (empty)

**Expected Result:** 
- Returns status 400
- Response contains error message: "Location is required"
- Complaint is not created

---

### 18. Test Case ID: TC_Complaint_07
**Title:** Submit Complaint with All Required Fields Missing  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Leave all fields empty
- Click 'Submit' button

**Test Data:**
- All fields: ` ` (empty)

**Expected Result:** 
- Returns status 400
- Response contains appropriate error message for first missing required field
- Complaint is not created

---

### 19. Test Case ID: TC_Complaint_08
**Title:** Submit Complaint with Empty String Complaint Type  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Enter empty string in complaint type
- Fill other fields
- Click 'Submit' button

**Test Data:**
- Complaint Type: `""` (empty string)
- Description: `Test description`
- Incident Date: `2026-01-15`
- Location: `Downtown Area`

**Expected Result:** 
- Returns status 400
- Response contains error message
- Complaint is not created

---

### 20. Test Case ID: TC_Complaint_09
**Title:** Submit Complaint When No Admin Available for Location  
**Precondition:** User is authenticated; no admin assigned to the district.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Enter location with no assigned admin
- Fill all other fields
- Click 'Submit' button

**Test Data:**
- Location: `Remote Area`
- District: `No Admin District`
- Complaint Type: `Theft`
- Description: `Test complaint`

**Expected Result:** 
- Returns status 400
- Response contains error message: "No admin available for this location"
- Complaint is not created

---

### 21. Test Case ID: TC_Complaint_10
**Title:** Verify Admin Assignment Based on Location  
**Precondition:** User is authenticated; admin exists for the district.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Enter location with assigned admin
- Fill all fields
- Click 'Submit' button
- Verify admin assignment

**Test Data:**
- Location: `Downtown Area`
- District: `Central District`
- Admin Username: `admin_central`

**Expected Result:** 
- Returns status 200
- Complaint is created successfully
- Complaint is assigned to correct admin based on district
- Admin username matches district admin

---

### 22. Test Case ID: TC_Complaint_11
**Title:** Submit Complaint with Valid GPS Coordinates  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Fill all required fields
- Enter valid latitude and longitude
- Click 'Submit' button

**Test Data:**
- Latitude: `28.6139`
- Longitude: `77.2090`
- Complaint Type: `Theft`
- Description: `Test complaint`

**Expected Result:** 
- Returns status 200
- Complaint is created successfully
- GPS coordinates are stored correctly
- Location is mapped properly

---

### 23. Test Case ID: TC_Complaint_12
**Title:** Submit Complaint with Invalid Latitude (Too High)  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Enter latitude greater than 90
- Enter valid longitude
- Fill other fields
- Click 'Submit' button

**Test Data:**
- Latitude: `95.0000` (invalid)
- Longitude: `77.2090`

**Expected Result:** 
- Returns status 400
- Response contains error message: "Invalid latitude value"
- Complaint is not created

---

### 24. Test Case ID: TC_Complaint_13
**Title:** Submit Complaint with Invalid Latitude (Too Low)  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Enter latitude less than -90
- Enter valid longitude
- Fill other fields
- Click 'Submit' button

**Test Data:**
- Latitude: `-95.0000` (invalid)
- Longitude: `77.2090`

**Expected Result:** 
- Returns status 400
- Response contains error message: "Invalid latitude value"
- Complaint is not created

---

### 25. Test Case ID: TC_Complaint_14
**Title:** Submit Complaint with Invalid Longitude (Too High)  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Enter valid latitude
- Enter longitude greater than 180
- Fill other fields
- Click 'Submit' button

**Test Data:**
- Latitude: `28.6139`
- Longitude: `185.0000` (invalid)

**Expected Result:** 
- Returns status 400
- Response contains error message: "Invalid longitude value"
- Complaint is not created

---

### 26. Test Case ID: TC_Complaint_15
**Title:** Submit Complaint with Invalid Longitude (Too Low)  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Enter valid latitude
- Enter longitude less than -180
- Fill other fields
- Click 'Submit' button

**Test Data:**
- Latitude: `28.6139`
- Longitude: `-185.0000` (invalid)

**Expected Result:** 
- Returns status 400
- Response contains error message: "Invalid longitude value"
- Complaint is not created

---

### 27. Test Case ID: TC_Complaint_16
**Title:** Submit Complaint with Edge Case GPS Coordinates  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Enter edge case coordinates (90, 180)
- Fill other fields
- Click 'Submit' button

**Test Data:**
- Latitude: `90.0000` (North Pole)
- Longitude: `180.0000` (Date Line)

**Expected Result:** 
- Returns status 200
- Complaint is created successfully
- Edge case coordinates are accepted and stored

---

### 28. Test Case ID: TC_Complaint_17
**Title:** Submit Complaint with Valid Accuracy Radius  
**Precondition:** User is authenticated; GPS location provided.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Enter GPS coordinates
- Enter valid accuracy radius
- Fill other fields
- Click 'Submit' button

**Test Data:**
- Latitude: `28.6139`
- Longitude: `77.2090`
- Accuracy Radius: `50` (meters)

**Expected Result:** 
- Returns status 200
- Complaint is created successfully
- Accuracy radius is stored correctly

---

### 29. Test Case ID: TC_Complaint_18
**Title:** Submit Complaint with Zero Accuracy Radius  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Enter GPS coordinates
- Enter zero accuracy radius
- Fill other fields
- Click 'Submit' button

**Test Data:**
- Accuracy Radius: `0` (invalid)

**Expected Result:** 
- Returns status 400
- Response contains error message: "Accuracy radius must be positive"
- Complaint is not created

---

### 30. Test Case ID: TC_Complaint_19
**Title:** Submit Complaint with Negative Accuracy Radius  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Enter GPS coordinates
- Enter negative accuracy radius
- Fill other fields
- Click 'Submit' button

**Test Data:**
- Accuracy Radius: `-10` (invalid)

**Expected Result:** 
- Returns status 400
- Response contains error message: "Accuracy radius must be positive"
- Complaint is not created

---

### 31. Test Case ID: TC_Complaint_20
**Title:** Submit Complaint Without File Attachments  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Fill all required fields
- Do not attach any files
- Click 'Submit' button

**Test Data:**
- Files: None
- Complaint Type: `Theft`
- Description: `Test complaint without files`

**Expected Result:** 
- Returns status 200
- Complaint is created successfully
- No file attachments are associated
- Complaint submission works without files

---

### 32. Test Case ID: TC_Complaint_21
**Title:** Submit Complaint with Single Image File  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Fill all required fields
- Attach one image file
- Click 'Submit' button

**Test Data:**
- File: `evidence.jpg` (image/jpeg)
- Complaint Type: `Vandalism`
- Description: `Photo evidence attached`

**Expected Result:** 
- Returns status 200
- Complaint is created successfully
- Image file is uploaded and stored
- File path is associated with complaint

---

### 33. Test Case ID: TC_Complaint_22
**Title:** Submit Complaint with Multiple File Attachments  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Fill all required fields
- Attach multiple image files
- Click 'Submit' button

**Test Data:**
- Files: `evidence1.jpg`, `evidence2.jpg`, `evidence3.png`
- Complaint Type: `Assault`
- Description: `Multiple photos attached`

**Expected Result:** 
- Returns status 200
- Complaint is created successfully
- All files are uploaded and stored
- All file paths are associated with complaint

---

### 34. Test Case ID: TC_Complaint_23
**Title:** Verify Complaint ID is Returned on Success  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Fill all required fields
- Click 'Submit' button
- Check response for complaint ID

**Test Data:**
- Complaint Type: `Theft`
- Description: `Test complaint`

**Expected Result:** 
- Returns status 200
- Response contains complaint ID (numeric)
- Complaint ID is unique and valid
- Complaint ID can be used to track complaint

---

### 35. Test Case ID: TC_Complaint_24
**Title:** Verify Complaint Status is Set to Pending  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Submit a new complaint
- Verify complaint status in database

**Test Data:**
- Complaint Type: `Theft`
- Description: `Test complaint`

**Expected Result:** 
- Returns status 200
- Complaint is created successfully
- Initial status is set to "Pending"
- Status can be updated by admin later

---

### 36. Test Case ID: TC_Complaint_25
**Title:** Verify Success Message on Complaint Submission  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Submit a valid complaint
- Check response message

**Test Data:**
- Complaint Type: `Theft`
- Description: `Test complaint`

**Expected Result:** 
- Returns status 200
- Response contains success message: "Complaint submitted successfully"
- User receives confirmation of submission

---

### 37. Test Case ID: TC_Complaint_26
**Title:** Verify Complaint Details in Response  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Submit a valid complaint
- Verify response contains all complaint details

**Test Data:**
- Complaint Type: `Theft`
- Description: `My phone was stolen`
- Location: `Central Park`

**Expected Result:** 
- Returns status 200
- Response contains complaint ID
- Response contains complaint type
- Response contains description
- Response contains location
- Response contains submission timestamp

---

### 38. Test Case ID: TC_Complaint_27
**Title:** Submit Theft Type Complaint  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Select "Theft" as complaint type
- Fill other required fields
- Click 'Submit' button

**Test Data:**
- Complaint Type: `Theft`
- Description: `My wallet was stolen from the bus`

**Expected Result:** 
- Returns status 200
- Complaint is created with "Theft" category
- Category ID is correctly mapped

---

### 39. Test Case ID: TC_Complaint_28
**Title:** Submit Assault Type Complaint  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Select "Assault" as complaint type
- Fill other required fields
- Click 'Submit' button

**Test Data:**
- Complaint Type: `Assault`
- Description: `I was physically attacked near the subway`

**Expected Result:** 
- Returns status 200
- Complaint is created with "Assault" category
- Category ID is correctly mapped

---

### 40. Test Case ID: TC_Complaint_29
**Title:** Submit Vandalism Type Complaint  
**Precondition:** User is authenticated.  
**Steps:**
- Login with valid credentials
- Navigate to complaint submission page
- Select "Vandalism" as complaint type
- Fill other required fields
- Click 'Submit' button

**Test Data:**
- Complaint Type: `Vandalism`
- Description: `Public property was damaged with graffiti`

**Expected Result:** 
- Returns status 200
- Complaint is created with "Vandalism" category
- Category ID is correctly mapped

---


## Summary Statistics

**Total Test Cases:** 40
- **Authentication Tests:** 11
- **Complaint Submission Tests:** 29

**Test Coverage Areas:**
- User Authentication & Login
- Input Validation (Missing fields, Empty values)
- GPS Coordinates Validation
- File Upload Handling
- Admin Assignment Logic
- Database Error Handling
- Security & Session Management
- Special Characters & Unicode Support
- Edge Cases & Boundary Testing
- Multiple Complaint Types (Theft, Assault, Vandalism, Fraud)

---

## Test Execution Notes

1. All tests should be executed in isolation to avoid data contamination
2. Database should be reset to known state before each test run
3. Mock objects are used to simulate external dependencies
4. Session management should be properly configured for authentication tests
5. File uploads should be tested with actual files in integration tests
6. Security tests should verify no sensitive information is leaked in error messages
7. Performance tests should be conducted for multiple concurrent submissions
8. API endpoint URLs should be configured based on environment (dev/test/prod)

---

## Prerequisites for Running Tests

1. Python 3.7+ with pytest installed
2. Mock database with test data
3. Test user accounts created
4. Admin accounts configured for location-based assignment
5. File upload directory configured with proper permissions
6. Session management middleware properly configured
7. Test environment variables set

---

## Test Data Requirements

### Users Table
- At least one valid test user with hashed password
- Users with special characters in username
- Users with unicode characters in username

### Admins Table
- Admins assigned to various districts
- At least one district without admin assignment

### Categories Table
- All crime types (Theft, Assault, Vandalism, Fraud)
- Valid category IDs

### Locations Table
- Pre-populated test locations
- Various districts for testing admin assignment

---

*Document Created: January 16, 2026*  
*Last Updated: January 16, 2026*  
*Version: 1.0*
