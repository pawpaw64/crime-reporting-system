"""
================================================================================
                    UNIT TESTING TUTORIAL - USER LOGIN FEATURE
================================================================================

WHAT IS UNIT TESTING?
---------------------
Unit testing is like checking each LEGO piece works correctly before building
the whole castle. Instead of testing the entire application, we test small
"units" (functions/methods) individually.

WHY UNIT TEST?
--------------
1. Catch bugs early (before users find them!)
2. Confidence to change code (tests tell you if you broke something)
3. Documentation (tests show how code should work)
4. Better code design (testable code = cleaner code)

WHAT WE'RE TESTING:
-------------------
The user login function from authController.js which:
1. Takes username and password from request
2. Checks if they exist in database
3. Verifies password matches
4. Creates a session if successful
5. Returns appropriate response

================================================================================
"""

# ==============================================================================
# STEP 1: IMPORTS
# ==============================================================================
# pytest is the testing framework - it runs our tests and reports results
# Think of it as the "test runner" that executes all our test cases
import pytest


# ==============================================================================
# STEP 2: UNDERSTANDING MOCKING
# ==============================================================================
"""
WHAT IS MOCKING?
----------------
Mocking = Creating FAKE versions of real things

Imagine you're testing a car's steering wheel. You don't need the actual engine,
wheels, or road - you just need to know: "When I turn left, does the signal go
to the wheels?"

In our login test:
- We DON'T want to use a real database (slow, needs setup, might have real data)
- We DON'T want to actually hash passwords (slow, unnecessary)
- We CREATE FAKE versions that we control completely

This is MOCKING - replacing real dependencies with controlled fakes.
"""


# ==============================================================================
# STEP 3: CREATE MOCK OBJECTS
# ==============================================================================

class MockResponse:
    """
    FAKE Express.js Response Object
    
    In the real app, Express.js provides a 'res' object with methods like:
    - res.status(400) - sets HTTP status code
    - res.json({...}) - sends JSON response
    
    We create a FAKE one so we can:
    1. Call the same methods (so our code works)
    2. Check what was called (to verify correct behavior)
    
    Example of how it's used in the login function:
        res.status(400).json({ success: false, message: "Error" })
    """
    
    def __init__(self):
        # Store what status code was set
        # Starts at 200 (success) because that's the default
        self.status_code = 200
        
        # Store what JSON data was sent back
        self.json_data = None
    
    def status(self, code):
        """
        Mimics res.status(400) in Express.js
        
        Notice we return 'self' - this allows CHAINING like:
            res.status(400).json({...})
        
        The real Express does the same thing!
        """
        self.status_code = code
        return self  # <-- This enables chaining!
    
    def json(self, data):
        """
        Mimics res.json({...}) in Express.js
        
        We save the data so we can CHECK it later in our tests:
            assert res.json_data['success'] == False
        """
        self.json_data = data
        return self


class MockRequest:
    """
    FAKE Express.js Request Object
    
    In the real app, Express.js provides a 'req' object with:
    - req.body - the data sent by the user (username, password)
    - req.session - storage for user session data
    
    We create a FAKE one so we can:
    1. Control what "user input" the login function sees
    2. Check if session was set correctly after login
    """
    
    def __init__(self, body=None):
        # The request body - what the user "sent"
        # Example: {'username': 'john', 'password': 'secret123'}
        self.body = body or {}
        
        # The session object - starts empty
        # After successful login, should contain user info
        self.session = {}


class MockPool:
    """
    FAKE Database Connection Pool
    
    In the real app, we query MySQL like:
        results = await pool.query('SELECT * FROM users WHERE username = ?', ['john'])
    
    We DON'T want to:
    - Connect to a real database
    - Have actual user data
    - Deal with network issues
    
    Instead, we CONTROL what the "database" returns!
    
    Example:
        mock_pool.query_result = [[{'userid': 1, 'username': 'john'}]]
        # Now when code calls pool.query(), it gets our fake user!
    """
    
    def __init__(self):
        # What we want the query to return
        # Default: empty list (no users found)
        self.query_result = [[]]
        
        # Track what queries were made (useful for verification)
        self.last_query = None
        self.last_params = None
    
    async def query(self, sql, params=None):
        """
        FAKE database query
        
        The 'async' keyword means this is an asynchronous function.
        The real database query takes time (network call), so it's async.
        We make ours async too so the code works the same way.
        """
        # Save what was queried (so tests can verify correct query was made)
        self.last_query = sql
        self.last_params = params
        
        # Return whatever we set up in query_result
        return self.query_result


# ==============================================================================
# STEP 4: THE FUNCTION WE'RE TESTING (Simulated)
# ==============================================================================
"""
Since the original code is in JavaScript, we've recreated the EXACT SAME LOGIC
in Python. This is the function we'll test.

In real projects, you'd import the actual function. But since this is JS->Python,
we simulate it to demonstrate the concepts.
"""

async def login(req, res, pool, compare_password):
    """
    User Login Function (simulates authController.login from Node.js)
    
    Parameters:
    -----------
    req : MockRequest
        The HTTP request with body containing {username, password}
    
    res : MockResponse  
        The HTTP response object to send data back to user
    
    pool : MockPool
        Database connection pool for querying users
    
    compare_password : function
        Function to compare plain password with hashed password
        (We pass this as parameter to make it mockable!)
    
    Returns:
    --------
    None (sends response via res object)
    """
    try:
        # ----------------------------------------------------------------------
        # STEP A: Extract username and password from request body
        # ----------------------------------------------------------------------
        username = req.body.get('username')
        password = req.body.get('password')

        # ----------------------------------------------------------------------
        # STEP B: Input Validation
        # ----------------------------------------------------------------------
        # Check if username AND password were provided
        # Empty string "" is falsy in Python, so this catches that too
        if not username or not password:
            res.status(400)  # 400 = Bad Request (client error)
            res.json({
                'success': False,
                'message': 'Username and password are required'
            })
            return  # Stop execution here!

        # ----------------------------------------------------------------------
        # STEP C: Query Database for User
        # ----------------------------------------------------------------------
        # Look up user by username
        # The ? is a placeholder to prevent SQL injection
        results = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        )

        # results[0] is the list of matching users
        # If empty, user doesn't exist
        if len(results[0]) == 0:
            res.status(401)  # 401 = Unauthorized
            res.json({
                'success': False,
                'message': 'Invalid username or password'
            })
            return

        # ----------------------------------------------------------------------
        # STEP D: Verify Password
        # ----------------------------------------------------------------------
        # Get the user object from results
        user = results[0][0]
        
        # Compare provided password with hashed password in database
        # compare_password uses bcrypt to securely check this
        is_match = await compare_password(password, user['password'])

        if not is_match:
            res.status(401)  # 401 = Unauthorized
            res.json({
                'success': False,
                # SECURITY: Same message as "user not found"
                # This prevents attackers from knowing if username exists
                'message': 'Invalid username or password'
            })
            return

        # ----------------------------------------------------------------------
        # STEP E: Create Session (User is now logged in!)
        # ----------------------------------------------------------------------
        # Store user info in session
        # This is how the server "remembers" who is logged in
        req.session['userId'] = user['userid']
        req.session['username'] = user['username']
        req.session['email'] = user['email']

        # ----------------------------------------------------------------------
        # STEP F: Send Success Response
        # ----------------------------------------------------------------------
        res.json({
            'success': True,
            'message': 'Login successful',
            'redirect': '/profile'  # Where to send user after login
        })

    except Exception as err:
        # ----------------------------------------------------------------------
        # STEP G: Error Handling
        # ----------------------------------------------------------------------
        # Something went wrong (database error, etc.)
        print(f"Login error: {err}")
        res.status(500)  # 500 = Internal Server Error
        res.json({
            'success': False,
            'message': 'Server error'
        })


# ==============================================================================
# STEP 5: WRITING TEST CASES
# ==============================================================================
"""
TEST CASE STRUCTURE:
--------------------
Each test follows the AAA pattern:

    A - ARRANGE: Set up the test (create mocks, prepare data)
    A - ACT: Run the function being tested  
    A - ASSERT: Check the results are correct

NAMING CONVENTION:
------------------
Test names should describe WHAT is being tested and EXPECTED outcome:
    test_should_return_400_if_username_is_missing
    ^^^^        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    prefix      description of behavior

This makes test output readable:
    PASSED test_should_return_400_if_username_is_missing
    FAILED test_should_login_successfully_with_valid_credentials
"""


# ==============================================================================
# TEST CLASS 1: INPUT VALIDATION TESTS
# ==============================================================================
class TestInputValidation:
    """
    Tests for validating user input (username and password)
    
    These tests verify that the login function properly rejects
    invalid or missing input BEFORE doing any database work.
    
    Why is this important?
    - Early validation = better performance (no wasted DB queries)
    - Clear error messages help users
    - Prevents potential security issues
    """

    @pytest.mark.asyncio  # <-- This decorator tells pytest this is an async test
    async def test_should_return_400_if_username_is_missing(self):
        """
        TEST CASE 1: Missing Username
        
        Scenario: User submits login form but username field is empty
        Expected: 400 Bad Request with helpful error message
        
        This is like testing: "If someone tries to login without typing
        their username, do we handle it properly?"
        """
        
        # ----- ARRANGE -----
        # Create a request with password but NO username
        req = MockRequest(body={'password': 'password123'})
        # Note: 'username' key is completely missing!
        
        # Create empty response object to capture what's sent back
        res = MockResponse()
        
        # Create mock database (won't be used, but function needs it)
        pool = MockPool()
        
        # Create mock password comparison function
        async def mock_compare(plain_password, hashed_password):
            return False
        
        # ----- ACT -----
        # Call the login function with our mock objects
        await login(req, res, pool, mock_compare)
        
        # ----- ASSERT -----
        # Check 1: Status code should be 400 (Bad Request)
        assert res.status_code == 400, \
            f"Expected status 400, but got {res.status_code}"
        
        # Check 2: Response should indicate failure with correct message
        assert res.json_data == {
            'success': False,
            'message': 'Username and password are required'
        }, f"Unexpected response: {res.json_data}"
        
        # Check 3: Database should NOT have been queried (early exit)
        assert pool.last_query is None, \
            "Database was queried when it shouldn't have been!"

    @pytest.mark.asyncio
    async def test_should_return_400_if_password_is_missing(self):
        """
        TEST CASE 2: Missing Password
        
        Similar to above, but password is missing instead of username.
        """
        
        # ----- ARRANGE -----
        req = MockRequest(body={'username': 'testuser'})
        res = MockResponse()
        pool = MockPool()
        
        async def mock_compare(p, h):
            return False
        
        # ----- ACT -----
        await login(req, res, pool, mock_compare)
        
        # ----- ASSERT -----
        assert res.status_code == 400
        assert res.json_data['success'] is False
        assert 'required' in res.json_data['message'].lower()

    @pytest.mark.asyncio
    async def test_should_return_400_if_username_is_empty_string(self):
        """
        TEST CASE 3: Empty String Username
        
        Edge case: Username is provided but it's an empty string ""
        
        This is different from MISSING - the key exists but value is empty.
        Both should be rejected.
        
        Why test this separately?
        - Some validation only checks if key exists (would miss this)
        - Empty string "" is falsy in Python/JavaScript
        - This is a common user mistake (form submitted with empty field)
        """
        
        # ----- ARRANGE -----
        req = MockRequest(body={
            'username': '',  # <-- Empty string, NOT missing
            'password': 'password123'
        })
        res = MockResponse()
        pool = MockPool()
        
        async def mock_compare(p, h):
            return False
        
        # ----- ACT -----
        await login(req, res, pool, mock_compare)
        
        # ----- ASSERT -----
        assert res.status_code == 400
        assert res.json_data['success'] is False


# ==============================================================================
# TEST CLASS 2: AUTHENTICATION TESTS
# ==============================================================================
class TestAuthentication:
    """
    Tests for the core authentication logic:
    - Does it find the user in database?
    - Does it verify password correctly?
    - Does it handle wrong credentials properly?
    """

    @pytest.mark.asyncio
    async def test_should_return_401_if_user_does_not_exist(self):
        """
        TEST CASE 4: Non-existent User
        
        Scenario: Someone tries to login with a username that doesn't exist
        Expected: 401 Unauthorized (not 404 - for security reasons!)
        
        SECURITY NOTE:
        We return the SAME error message whether user doesn't exist OR
        password is wrong. This prevents "username enumeration" attacks
        where hackers try to discover valid usernames.
        """
        
        # ----- ARRANGE -----
        req = MockRequest(body={
            'username': 'nonexistent_user',
            'password': 'password123'
        })
        res = MockResponse()
        pool = MockPool()
        
        # Set up database to return EMPTY result (no user found)
        pool.query_result = [[]]  # <-- Empty list = no users match
        
        async def mock_compare(p, h):
            return False
        
        # ----- ACT -----
        await login(req, res, pool, mock_compare)
        
        # ----- ASSERT -----
        # Verify the database was queried with correct username
        assert pool.last_query == 'SELECT * FROM users WHERE username = ?'
        assert pool.last_params == ['nonexistent_user']
        
        # Verify response
        assert res.status_code == 401
        assert res.json_data == {
            'success': False,
            'message': 'Invalid username or password'
        }

    @pytest.mark.asyncio
    async def test_should_return_401_if_password_is_wrong(self):
        """
        TEST CASE 5: Wrong Password
        
        Scenario: User exists but password is incorrect
        Expected: 401 Unauthorized with generic message
        
        This tests the password comparison step specifically.
        """
        
        # ----- ARRANGE -----
        # Create a mock user that "exists" in our fake database
        mock_user = {
            'userid': 1,
            'username': 'john_doe',
            'email': 'john@example.com',
            'password': 'hashed_password_abc123'  # The stored hash
        }
        
        req = MockRequest(body={
            'username': 'john_doe',
            'password': 'wrong_password'  # Wrong password!
        })
        res = MockResponse()
        pool = MockPool()
        
        # Database returns our mock user
        pool.query_result = [[mock_user]]  # <-- User found!
        
        # Password comparison will FAIL (return False)
        async def mock_compare(plain_password, hashed_password):
            # In real code, bcrypt compares these securely
            # We simulate: "wrong_password" != "hashed_password_abc123"
            return False  # <-- Password doesn't match!
        
        # ----- ACT -----
        await login(req, res, pool, mock_compare)
        
        # ----- ASSERT -----
        assert res.status_code == 401
        assert res.json_data['success'] is False
        # Same message as "user not found" (security!)
        assert res.json_data['message'] == 'Invalid username or password'

    @pytest.mark.asyncio
    async def test_should_login_successfully_with_valid_credentials(self):
        """
        TEST CASE 6: Successful Login (Happy Path!)
        
        Scenario: Correct username AND correct password
        Expected: Login succeeds, session is created, redirect to profile
        
        This is the "happy path" - everything works as intended.
        Always test happy paths first, then edge cases!
        """
        
        # ----- ARRANGE -----
        mock_user = {
            'userid': 42,
            'username': 'jane_doe',
            'email': 'jane@example.com',
            'password': 'hashed_correct_password'
        }
        
        req = MockRequest(body={
            'username': 'jane_doe',
            'password': 'correct_password'
        })
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        # Password comparison will SUCCEED
        async def mock_compare(plain_password, hashed_password):
            return True  # <-- Password matches!
        
        # ----- ACT -----
        await login(req, res, pool, mock_compare)
        
        # ----- ASSERT -----
        # Check 1: Status should be 200 (default, not set = success)
        assert res.status_code == 200
        
        # Check 2: Response should indicate success
        assert res.json_data == {
            'success': True,
            'message': 'Login successful',
            'redirect': '/profile'
        }
        
        # Check 3: Session should be populated with user data
        assert req.session['userId'] == 42
        assert req.session['username'] == 'jane_doe'
        assert req.session['email'] == 'jane@example.com'


# ==============================================================================
# TEST CLASS 3: SESSION MANAGEMENT TESTS
# ==============================================================================
class TestSessionManagement:
    """
    Tests to verify session is set up correctly after login.
    
    Sessions are how servers "remember" logged-in users.
    After successful login, user data should be stored in session.
    """

    @pytest.mark.asyncio
    async def test_session_should_contain_user_id(self):
        """
        TEST CASE 7: Session Contains User ID
        
        The userId in session is critical - it's used to identify the user
        in all subsequent requests (viewing profile, submitting complaints, etc.)
        """
        
        # ----- ARRANGE -----
        mock_user = {
            'userid': 999,  # <-- This specific ID should end up in session
            'username': 'test_user',
            'email': 'test@example.com',
            'password': 'hash'
        }
        
        req = MockRequest(body={'username': 'test_user', 'password': 'pass'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return True
        
        # ----- ACT -----
        await login(req, res, pool, mock_compare)
        
        # ----- ASSERT -----
        # Verify the EXACT userId is in session
        assert 'userId' in req.session, "userId not found in session!"
        assert req.session['userId'] == 999, \
            f"Expected userId 999, got {req.session['userId']}"


# ==============================================================================
# TEST CLASS 4: ERROR HANDLING TESTS
# ==============================================================================
class TestErrorHandling:
    """
    Tests for when things go WRONG.
    
    What if the database is down? What if bcrypt crashes?
    Good code handles errors gracefully instead of crashing.
    """

    @pytest.mark.asyncio
    async def test_should_return_500_when_database_fails(self):
        """
        TEST CASE 8: Database Connection Error
        
        Scenario: Database is unavailable or query fails
        Expected: 500 Internal Server Error (not crash!)
        
        This is important because:
        - Databases can go down
        - Network issues happen
        - User should see error message, not crash page
        """
        
        # ----- ARRANGE -----
        req = MockRequest(body={'username': 'user', 'password': 'pass'})
        res = MockResponse()
        
        # Create a database mock that THROWS AN ERROR
        class FailingPool:
            async def query(self, sql, params=None):
                # Simulate database crash!
                raise Exception('Connection refused: Database is down!')
        
        failing_pool = FailingPool()
        
        async def mock_compare(p, h):
            return True
        
        # ----- ACT -----
        # This should NOT crash - it should be caught and handled
        await login(req, res, failing_pool, mock_compare)
        
        # ----- ASSERT -----
        assert res.status_code == 500
        assert res.json_data == {
            'success': False,
            'message': 'Server error'  # Generic message (don't leak details!)
        }


# ==============================================================================
# TEST CLASS 5: SECURITY TESTS
# ==============================================================================
class TestSecurity:
    """
    Tests for security considerations.
    
    Security is not just about preventing hacks - it's about not
    leaking information that could help attackers.
    """

    @pytest.mark.asyncio
    async def test_same_error_for_wrong_username_and_wrong_password(self):
        """
        TEST CASE 9: Preventing Username Enumeration
        
        ATTACK SCENARIO:
        Hacker tries to find valid usernames by observing different errors:
        - "Username not found" → Now they know it's not a real user
        - "Wrong password" → Now they know username EXISTS!
        
        DEFENSE:
        Return the EXACT SAME message for both cases!
        Attacker can't tell which one failed.
        """
        
        # ----- SCENARIO A: User doesn't exist -----
        req1 = MockRequest(body={'username': 'fake_user', 'password': 'pass'})
        res1 = MockResponse()
        pool1 = MockPool()
        pool1.query_result = [[]]  # No user found
        
        async def mock_compare(p, h):
            return False
        
        await login(req1, res1, pool1, mock_compare)
        
        # ----- SCENARIO B: User exists, wrong password -----
        mock_user = {'userid': 1, 'username': 'real_user', 'email': 'e', 'password': 'h'}
        req2 = MockRequest(body={'username': 'real_user', 'password': 'wrong'})
        res2 = MockResponse()
        pool2 = MockPool()
        pool2.query_result = [[mock_user]]  # User found
        
        await login(req2, res2, pool2, mock_compare)  # But password wrong
        
        # ----- ASSERT: Both responses should be IDENTICAL -----
        assert res1.status_code == res2.status_code == 401
        assert res1.json_data['message'] == res2.json_data['message']
        # Attacker can't tell which scenario occurred!


# ==============================================================================
# TEST CLASS 6: EDGE CASE TESTS
# ==============================================================================
class TestEdgeCases:
    """
    Tests for unusual but possible scenarios.
    
    Edge cases are the weird inputs that users might provide:
    - Special characters
    - Very long strings
    - Unicode characters
    - Null values
    
    These often cause bugs because developers don't think of them!
    """

    @pytest.mark.asyncio
    async def test_username_with_special_characters(self):
        """
        TEST CASE 10: Special Characters in Username
        
        Some users have usernames like "john.doe" or "user@123"
        Make sure these work correctly!
        """
        
        mock_user = {
            'userid': 1,
            'username': 'user@123!#$',  # Lots of special chars
            'email': 'test@test.com',
            'password': 'hash'
        }
        
        req = MockRequest(body={
            'username': 'user@123!#$',
            'password': 'password'
        })
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        assert res.json_data['success'] is True

    @pytest.mark.asyncio
    async def test_unicode_username(self):
        """
        TEST CASE 11: Unicode Characters
        
        Users from non-English speaking countries might have
        usernames in their native language: 日本語, العربية, 中文
        """
        
        mock_user = {
            'userid': 1,
            'username': '用户名',  # Chinese characters
            'email': 'test@test.com',
            'password': 'hash'
        }
        
        req = MockRequest(body={'username': '用户名', 'password': 'pass'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        assert res.json_data['success'] is True
        assert req.session['username'] == '用户名'


# ==============================================================================
# HOW TO RUN THESE TESTS
# ==============================================================================
"""
RUNNING TESTS:
--------------
1. Open terminal in the backend folder
2. Install pytest: pip install pytest pytest-asyncio
3. Run tests: pytest tests/auth/test_login_tutorial.py -v

The -v flag means "verbose" - shows each test name and result.

OUTPUT EXAMPLE:
---------------
tests/auth/test_login_tutorial.py::TestInputValidation::test_should_return_400_if_username_is_missing PASSED
tests/auth/test_login_tutorial.py::TestInputValidation::test_should_return_400_if_password_is_missing PASSED
tests/auth/test_login_tutorial.py::TestAuthentication::test_should_login_successfully PASSED
...

========================== 11 passed in 0.5s ==========================

USEFUL PYTEST OPTIONS:
----------------------
pytest -v                    # Verbose output
pytest -x                    # Stop on first failure
pytest --tb=short           # Shorter error messages
pytest -k "password"        # Only run tests with "password" in name
pytest --cov=src            # Show code coverage

================================================================================
SUMMARY - WHAT YOU LEARNED:
================================================================================

1. UNIT TESTING = Testing small pieces of code in isolation

2. MOCKING = Creating fake versions of dependencies (database, etc.)

3. TEST STRUCTURE:
   - ARRANGE: Set up test data and mocks
   - ACT: Call the function being tested
   - ASSERT: Verify the results

4. ASSERTIONS = Checks that verify expected behavior
   - assert condition, "error message if fails"

5. TEST NAMING: Describe what is being tested
   - test_should_[expected behavior]_when_[condition]

6. WHAT TO TEST:
   - Happy path (everything works)
   - Validation errors (bad input)
   - Authentication failures (wrong credentials)
   - Error handling (database down, etc.)
   - Security (don't leak information)
   - Edge cases (special characters, etc.)

================================================================================
"""


# This allows running the file directly: python test_login_tutorial.py
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
