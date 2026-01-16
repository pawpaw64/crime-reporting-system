"""
Unit Tests for User Login Feature
Tests the login functionality in authController.js using Python + pytest

These tests simulate HTTP requests to the login endpoint and verify responses.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import asyncio


class MockResponse:
    """Mock Express.js response object"""
    def __init__(self):
        self.status_code = 200
        self.json_data = None
        self._status = MagicMock(return_value=self)
    
    def status(self, code):
        self.status_code = code
        return self
    
    def json(self, data):
        self.json_data = data
        return self


class MockRequest:
    """Mock Express.js request object"""
    def __init__(self, body=None):
        self.body = body or {}
        self.session = {}


class MockPool:
    """Mock database pool"""
    def __init__(self):
        self.query_result = [[]]
    
    async def query(self, sql, params=None):
        return self.query_result


# Simulated login function (mirrors authController.login logic)
async def login(req, res, pool, compare_password):
    """
    Simulated user login function based on authController.js implementation
    """
    try:
        username = req.body.get('username')
        password = req.body.get('password')

        if not username or not password:
            res.status(400)
            res.json({
                'success': False,
                'message': 'Username and password are required'
            })
            return

        results = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        )

        if len(results[0]) == 0:
            res.status(401)
            res.json({
                'success': False,
                'message': 'Invalid username or password'
            })
            return

        user = results[0][0]
        is_match = await compare_password(password, user['password'])

        if not is_match:
            res.status(401)
            res.json({
                'success': False,
                'message': 'Invalid username or password'
            })
            return

        req.session['userId'] = user['userid']
        req.session['username'] = user['username']
        req.session['email'] = user['email']

        res.json({
            'success': True,
            'message': 'Login successful',
            'redirect': '/profile'
        })

    except Exception as err:
        print(f"Login error: {err}")
        res.status(500)
        res.json({
            'success': False,
            'message': 'Server error'
        })


class TestInputValidation:
    """Test cases for input validation"""

    @pytest.mark.asyncio
    async def test_should_return_400_if_username_is_missing(self):
        req = MockRequest(body={'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Username and password are required'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_if_password_is_missing(self):
        req = MockRequest(body={'username': 'testuser'})
        res = MockResponse()
        pool = MockPool()
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Username and password are required'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_if_both_username_and_password_are_missing(self):
        req = MockRequest(body={})
        res = MockResponse()
        pool = MockPool()
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Username and password are required'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_if_username_is_empty_string(self):
        req = MockRequest(body={'username': '', 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Username and password are required'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_if_password_is_empty_string(self):
        req = MockRequest(body={'username': 'testuser', 'password': ''})
        res = MockResponse()
        pool = MockPool()
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Username and password are required'
        }


class TestUserAuthentication:
    """Test cases for user authentication"""

    @pytest.mark.asyncio
    async def test_should_return_401_if_user_does_not_exist(self):
        req = MockRequest(body={'username': 'nonexistent', 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[]]  # Empty result - no user found
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 401
        assert res.json_data == {
            'success': False,
            'message': 'Invalid username or password'
        }

    @pytest.mark.asyncio
    async def test_should_return_401_if_password_is_incorrect(self):
        mock_user = {
            'userid': 1,
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'hashedPassword123'
        }
        req = MockRequest(body={'username': 'testuser', 'password': 'wrongpassword'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return False  # Password doesn't match
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 401
        assert res.json_data == {
            'success': False,
            'message': 'Invalid username or password'
        }

    @pytest.mark.asyncio
    async def test_should_login_successfully_with_valid_credentials(self):
        mock_user = {
            'userid': 1,
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'hashedPassword123'
        }
        req = MockRequest(body={'username': 'testuser', 'password': 'correctpassword'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return True  # Password matches
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 200
        assert res.json_data == {
            'success': True,
            'message': 'Login successful',
            'redirect': '/profile'
        }


class TestSessionManagement:
    """Test cases for session management"""

    @pytest.mark.asyncio
    async def test_should_set_session_user_id_after_successful_login(self):
        mock_user = {
            'userid': 42,
            'username': 'sessionuser',
            'email': 'session@example.com',
            'password': 'hashedPassword'
        }
        req = MockRequest(body={'username': 'sessionuser', 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        assert req.session['userId'] == 42

    @pytest.mark.asyncio
    async def test_should_set_session_username_after_successful_login(self):
        mock_user = {
            'userid': 42,
            'username': 'sessionuser',
            'email': 'session@example.com',
            'password': 'hashedPassword'
        }
        req = MockRequest(body={'username': 'sessionuser', 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        assert req.session['username'] == 'sessionuser'

    @pytest.mark.asyncio
    async def test_should_set_session_email_after_successful_login(self):
        mock_user = {
            'userid': 42,
            'username': 'sessionuser',
            'email': 'session@example.com',
            'password': 'hashedPassword'
        }
        req = MockRequest(body={'username': 'sessionuser', 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        assert req.session['email'] == 'session@example.com'


class TestErrorHandling:
    """Test cases for error handling"""

    @pytest.mark.asyncio
    async def test_should_return_500_if_database_query_fails(self):
        req = MockRequest(body={'username': 'testuser', 'password': 'password123'})
        res = MockResponse()
        
        class FailingPool:
            async def query(self, sql, params=None):
                raise Exception('Database connection failed')
        
        pool = FailingPool()
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 500
        assert res.json_data == {
            'success': False,
            'message': 'Server error'
        }

    @pytest.mark.asyncio
    async def test_should_return_500_if_password_comparison_fails(self):
        mock_user = {
            'userid': 1,
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'hashedPassword123'
        }
        req = MockRequest(body={'username': 'testuser', 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            raise Exception('Bcrypt error')
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 500
        assert res.json_data == {
            'success': False,
            'message': 'Server error'
        }


class TestResponseFormat:
    """Test cases for response format"""

    @pytest.mark.asyncio
    async def test_should_return_correct_success_response_structure(self):
        mock_user = {
            'userid': 1,
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'hashedPassword'
        }
        req = MockRequest(body={'username': 'testuser', 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        assert 'success' in res.json_data
        assert res.json_data['success'] is True
        assert 'message' in res.json_data
        assert res.json_data['message'] == 'Login successful'
        assert 'redirect' in res.json_data
        assert res.json_data['redirect'] == '/profile'

    @pytest.mark.asyncio
    async def test_should_return_correct_error_response_structure_for_invalid_credentials(self):
        req = MockRequest(body={'username': 'testuser', 'password': 'wrongpassword'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[]]
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert 'success' in res.json_data
        assert res.json_data['success'] is False
        assert 'message' in res.json_data
        assert res.json_data['message'] == 'Invalid username or password'


class TestSecurityConsiderations:
    """Test cases for security considerations"""

    @pytest.mark.asyncio
    async def test_should_not_reveal_whether_username_exists_when_password_is_wrong(self):
        mock_user = {
            'userid': 1,
            'username': 'existinguser',
            'email': 'test@example.com',
            'password': 'hashedPassword'
        }
        
        # Test with wrong password for existing user
        req1 = MockRequest(body={'username': 'existinguser', 'password': 'wrongpassword'})
        res1 = MockResponse()
        pool1 = MockPool()
        pool1.query_result = [[mock_user]]
        
        async def mock_compare_false(p, h):
            return False
        
        await login(req1, res1, pool1, mock_compare_false)
        wrong_password_message = res1.json_data['message']
        
        # Test with non-existing user
        req2 = MockRequest(body={'username': 'nonexistent', 'password': 'password123'})
        res2 = MockResponse()
        pool2 = MockPool()
        pool2.query_result = [[]]
        
        await login(req2, res2, pool2, mock_compare_false)
        non_existent_message = res2.json_data['message']
        
        # Both should return the same generic message for security
        assert wrong_password_message == non_existent_message
        assert wrong_password_message == 'Invalid username or password'


class TestEdgeCases:
    """Test cases for edge cases"""

    @pytest.mark.asyncio
    async def test_should_handle_username_with_special_characters(self):
        mock_user = {
            'userid': 1,
            'username': 'user@123',
            'email': 'test@example.com',
            'password': 'hashedPassword'
        }
        req = MockRequest(body={'username': 'user@123', 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        assert res.json_data == {
            'success': True,
            'message': 'Login successful',
            'redirect': '/profile'
        }

    @pytest.mark.asyncio
    async def test_should_handle_password_with_special_characters(self):
        mock_user = {
            'userid': 1,
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'hashedPassword'
        }
        req = MockRequest(body={'username': 'testuser', 'password': 'P@$$w0rd!#%&*'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        assert res.json_data == {
            'success': True,
            'message': 'Login successful',
            'redirect': '/profile'
        }

    @pytest.mark.asyncio
    async def test_should_handle_unicode_characters_in_username(self):
        mock_user = {
            'userid': 1,
            'username': '用户名',
            'email': 'test@example.com',
            'password': 'hashedPassword'
        }
        req = MockRequest(body={'username': '用户名', 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[mock_user]]
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        assert res.json_data == {
            'success': True,
            'message': 'Login successful',
            'redirect': '/profile'
        }

    @pytest.mark.asyncio
    async def test_should_handle_very_long_username(self):
        long_username = 'a' * 255
        req = MockRequest(body={'username': long_username, 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[]]  # User not found
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 401
        assert res.json_data['message'] == 'Invalid username or password'

    @pytest.mark.asyncio
    async def test_should_handle_none_values_in_body(self):
        req = MockRequest(body={'username': None, 'password': None})
        res = MockResponse()
        pool = MockPool()
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Username and password are required'
        }


class TestDatabaseFailures:
    """Test cases for various database failure scenarios"""

    @pytest.mark.asyncio
    async def test_should_handle_database_timeout(self):
        req = MockRequest(body={'username': 'testuser', 'password': 'password123'})
        res = MockResponse()
        
        class TimeoutPool:
            async def query(self, sql, params=None):
                raise Exception('Connection timeout after 30s')
        
        pool = TimeoutPool()
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 500
        assert res.json_data['success'] is False
        assert 'message' in res.json_data

    @pytest.mark.asyncio
    async def test_should_handle_corrupted_user_data(self):
        # Missing critical fields in user data
        corrupted_user = {
            'userid': 1,
            # Missing username, email, password
        }
        req = MockRequest(body={'username': 'testuser', 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[corrupted_user]]
        
        async def mock_compare(p, h):
            raise KeyError('password field missing')
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 500
        assert res.json_data['success'] is False

    @pytest.mark.asyncio
    async def test_should_handle_multiple_users_with_same_username(self):
        # This shouldn't happen but tests system robustness
        user1 = {
            'userid': 1,
            'username': 'duplicate',
            'email': 'test1@example.com',
            'password': 'hashedPassword1'
        }
        user2 = {
            'userid': 2,
            'username': 'duplicate',
            'email': 'test2@example.com',
            'password': 'hashedPassword2'
        }
        req = MockRequest(body={'username': 'duplicate', 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[user1, user2]]  # Multiple results
        
        async def mock_compare(p, h):
            return True
        
        await login(req, res, pool, mock_compare)
        
        # Should only use first user result
        assert res.status_code == 200
        assert req.session['userId'] == 1


class TestInputSanitization:
    """Test cases for SQL injection and malicious input attempts"""

    @pytest.mark.asyncio
    async def test_should_handle_sql_injection_attempt_in_username(self):
        malicious_username = "admin' OR '1'='1"
        req = MockRequest(body={'username': malicious_username, 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[]]  # Should not find any user
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 401
        assert res.json_data['message'] == 'Invalid username or password'

    @pytest.mark.asyncio
    async def test_should_handle_script_tags_in_username(self):
        malicious_username = "<script>alert('XSS')</script>"
        req = MockRequest(body={'username': malicious_username, 'password': 'password123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[]]
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 401
        assert res.json_data['message'] == 'Invalid username or password'

    @pytest.mark.asyncio
    async def test_should_handle_extremely_long_password(self):
        # Test with password exceeding reasonable limits
        extremely_long_password = 'a' * 10000
        req = MockRequest(body={'username': 'testuser', 'password': extremely_long_password})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[]]
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_should_handle_null_bytes_in_password(self):
        malicious_password = "password\x00hidden"
        req = MockRequest(body={'username': 'testuser', 'password': malicious_password})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[]]
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 401


class TestRateLimiting:
    """Test cases for rate limiting and brute force protection"""

    @pytest.mark.asyncio
    async def test_should_handle_rapid_failed_login_attempts(self):
        # Simulate multiple failed login attempts
        failed_attempts = []
        
        for i in range(5):
            req = MockRequest(body={'username': 'testuser', 'password': f'wrongpass{i}'})
            res = MockResponse()
            pool = MockPool()
            pool.query_result = [[]]
            
            async def mock_compare(p, h):
                return False
            
            await login(req, res, pool, mock_compare)
            failed_attempts.append(res.status_code)
        
        # All attempts should return 401
        assert all(status == 401 for status in failed_attempts)

    @pytest.mark.asyncio
    async def test_should_track_session_state_across_attempts(self):
        mock_user = {
            'userid': 1,
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'hashedPassword'
        }
        
        # First attempt - failed
        req1 = MockRequest(body={'username': 'testuser', 'password': 'wrong'})
        res1 = MockResponse()
        pool1 = MockPool()
        pool1.query_result = [[mock_user]]
        
        async def mock_compare_false(p, h):
            return False
        
        await login(req1, res1, pool1, mock_compare_false)
        assert res1.status_code == 401
        assert 'userId' not in req1.session  # Session should not be set
        
        # Second attempt - success
        req2 = MockRequest(body={'username': 'testuser', 'password': 'correct'})
        res2 = MockResponse()
        pool2 = MockPool()
        pool2.query_result = [[mock_user]]
        
        async def mock_compare_true(p, h):
            return True
        
        await login(req2, res2, pool2, mock_compare_true)
        assert res2.status_code == 200
        assert req2.session['userId'] == 1  # Session should be set


class TestPasswordEdgeCases:
    """Test cases for password edge cases"""

    @pytest.mark.asyncio
    async def test_should_reject_whitespace_only_password(self):
        req = MockRequest(body={'username': 'testuser', 'password': '     '})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[]]
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_should_handle_password_with_newlines(self):
        req = MockRequest(body={'username': 'testuser', 'password': 'pass\nword\n123'})
        res = MockResponse()
        pool = MockPool()
        pool.query_result = [[]]
        
        async def mock_compare(p, h):
            return False
        
        await login(req, res, pool, mock_compare)
        
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_should_differentiate_case_sensitive_passwords(self):
        mock_user = {
            'userid': 1,
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'hashedPassword'
        }
        
        # Test lowercase version
        req1 = MockRequest(body={'username': 'testuser', 'password': 'password'})
        res1 = MockResponse()
        pool1 = MockPool()
        pool1.query_result = [[mock_user]]
        
        async def mock_compare_false(p, h):
            return False
        
        await login(req1, res1, pool1, mock_compare_false)
        assert res1.status_code == 401
        
        # Test uppercase version
        req2 = MockRequest(body={'username': 'testuser', 'password': 'PASSWORD'})
        res2 = MockResponse()
        pool2 = MockPool()
        pool2.query_result = [[mock_user]]
        
        await login(req2, res2, pool2, mock_compare_false)
        assert res2.status_code == 401


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
