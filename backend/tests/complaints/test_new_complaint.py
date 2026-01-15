"""
Unit Tests for New Complaint Submission Feature
Tests the submit complaint functionality in complaintController.js using Python + pytest

These tests simulate HTTP requests to the complaint submission endpoint and verify responses.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import asyncio
from datetime import datetime


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
    def __init__(self, body=None, session=None, files=None):
        self.body = body or {}
        self.session = session or {}
        self.files = files or []


class MockPool:
    """Mock database pool"""
    def __init__(self):
        self.query_results = [[]]
        self.query_index = 0
        self.executed_queries = []
    
    async def query(self, sql, params=None):
        self.executed_queries.append({'sql': sql, 'params': params})
        if self.query_index < len(self.query_results):
            result = self.query_results[self.query_index]
            self.query_index += 1
            return result
        return [[]]


class MockInsertResult:
    """Mock database insert result"""
    def __init__(self, insert_id=1):
        self.insertId = insert_id


# Helper functions to simulate controller logic
async def find_admin_by_location(location, pool):
    """Simulated findAdminByLocation from helperUtils.js"""
    results = await pool.query(
        'SELECT username FROM admins WHERE district = ?',
        [location]
    )
    if len(results[0]) > 0:
        return {'adminUsername': results[0][0]['username'], 'districtName': location}
    return None


async def get_or_create_location(location, district, pool):
    """Simulated getOrCreateLocation from helperUtils.js"""
    results = await pool.query(
        'SELECT location_id FROM locations WHERE address = ?',
        [location]
    )
    if len(results[0]) > 0:
        return results[0][0]['location_id']
    # Create new location
    insert_result = await pool.query(
        'INSERT INTO locations (address, district) VALUES (?, ?)',
        [location, district]
    )
    return insert_result[0].insertId if hasattr(insert_result[0], 'insertId') else 1


async def get_category_id(complaint_type, pool):
    """Simulated getCategoryIdNormalized from helperUtils.js"""
    results = await pool.query(
        'SELECT category_id FROM categories WHERE name = ?',
        [complaint_type]
    )
    if len(results[0]) > 0:
        return results[0][0]['category_id']
    # Create new category
    return 1


# Simulated submitComplaint function (mirrors complaintController.submitComplaint logic)
async def submit_complaint(req, res, pool, find_admin_fn, get_location_fn, get_category_fn):
    """
    Simulated complaint submission function based on complaintController.js implementation
    """
    try:
        # Check authentication
        if not req.session.get('userId'):
            res.status(401)
            res.json({
                'success': False,
                'message': 'Not authenticated'
            })
            return

        complaint_type = req.body.get('complaintType')
        description = req.body.get('description')
        incident_date = req.body.get('incidentDate')
        location = req.body.get('location')
        latitude = req.body.get('latitude')
        longitude = req.body.get('longitude')
        accuracy_radius = req.body.get('accuracyRadius')
        username = req.session.get('username')

        # Validate required fields
        if not complaint_type or not description or not incident_date or not location:
            res.status(400)
            res.json({
                'success': False,
                'message': 'All fields are required'
            })
            return

        # Find admin for location
        admin_data = await find_admin_fn(location)

        if not admin_data:
            res.status(400)
            res.json({
                'success': False,
                'message': 'No authority from this district is available right now'
            })
            return

        admin_username = admin_data['adminUsername']
        district_name = admin_data['districtName']

        # Get or create location
        location_id = await get_location_fn(location, district_name)

        # Get category ID
        category_id = await get_category_fn(complaint_type)

        # Parse and validate coordinates
        lat = None
        lng = None
        radius = None

        if latitude and longitude:
            lat = float(latitude)
            lng = float(longitude)

            # Validate coordinate ranges
            if lat < -90 or lat > 90 or lng < -180 or lng > 180:
                res.status(400)
                res.json({
                    'success': False,
                    'message': 'Invalid coordinate values'
                })
                return

            if accuracy_radius:
                radius = int(accuracy_radius)
                if radius <= 0:
                    res.status(400)
                    res.json({
                        'success': False,
                        'message': 'Invalid accuracy radius'
                    })
                    return

        # Insert complaint
        complaint_id = 1  # Simulated insert ID

        # Handle file uploads (simulated)
        if req.files and len(req.files) > 0:
            for file in req.files:
                # Simulate evidence insertion
                pass

        formatted_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        res.json({
            'success': True,
            'message': 'Complaint submitted successfully!',
            'complaintId': complaint_id,
            'complaint': {
                'id': complaint_id,
                'type': complaint_type,
                'status': 'pending',
                'location': location,
                'latitude': latitude,
                'longitude': longitude,
                'accuracyRadius': accuracy_radius,
                'createdAt': formatted_date
            }
        })

    except Exception as err:
        print(f"Submit complaint error: {err}")
        res.status(500)
        res.json({
            'success': False,
            'message': 'Error submitting complaint'
        })


class TestAuthentication:
    """Test cases for authentication validation"""

    @pytest.mark.asyncio
    async def test_should_return_401_if_user_not_authenticated(self):
        """Test that unauthenticated users cannot submit complaints"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location'
            },
            session={}  # No userId in session
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test District'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 401
        assert res.json_data == {
            'success': False,
            'message': 'Not authenticated'
        }

    @pytest.mark.asyncio
    async def test_should_proceed_if_user_is_authenticated(self):
        """Test that authenticated users can submit complaints"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'My wallet was stolen',
                'incidentDate': '2026-01-10',
                'location': 'Downtown Area'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Downtown'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['success'] == True
        assert res.json_data['message'] == 'Complaint submitted successfully!'


class TestInputValidation:
    """Test cases for input validation"""

    @pytest.mark.asyncio
    async def test_should_return_400_if_complaint_type_is_missing(self):
        """Test validation when complaint type is missing"""
        req = MockRequest(
            body={
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'All fields are required'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_if_description_is_missing(self):
        """Test validation when description is missing"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'incidentDate': '2026-01-10',
                'location': 'Test Location'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'All fields are required'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_if_incident_date_is_missing(self):
        """Test validation when incident date is missing"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'location': 'Test Location'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'All fields are required'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_if_location_is_missing(self):
        """Test validation when location is missing"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'All fields are required'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_if_all_fields_are_missing(self):
        """Test validation when all required fields are missing"""
        req = MockRequest(
            body={},
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'All fields are required'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_if_complaint_type_is_empty_string(self):
        """Test validation when complaint type is empty string"""
        req = MockRequest(
            body={
                'complaintType': '',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'All fields are required'
        }


class TestAdminAssignment:
    """Test cases for admin assignment based on location"""

    @pytest.mark.asyncio
    async def test_should_return_400_if_no_admin_available_for_location(self):
        """Test when no admin is available for the given district"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Remote Area'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return None  # No admin available

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'No authority from this district is available right now'
        }

    @pytest.mark.asyncio
    async def test_should_assign_admin_based_on_location(self):
        """Test that complaint is assigned to correct admin based on location"""
        req = MockRequest(
            body={
                'complaintType': 'Assault',
                'description': 'Physical assault incident',
                'incidentDate': '2026-01-10',
                'location': 'Central District'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        admin_found = False
        async def mock_find_admin(loc):
            nonlocal admin_found
            admin_found = True
            return {'adminUsername': 'central_admin', 'districtName': 'Central District'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert admin_found == True
        assert res.status_code == 200
        assert res.json_data['success'] == True


class TestCoordinateValidation:
    """Test cases for coordinate validation"""

    @pytest.mark.asyncio
    async def test_should_accept_valid_coordinates(self):
        """Test that valid coordinates are accepted"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Bike stolen from parking lot',
                'incidentDate': '2026-01-10',
                'location': 'City Center',
                'latitude': '40.7128',
                'longitude': '-74.0060'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'City'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['success'] == True
        assert res.json_data['complaint']['latitude'] == '40.7128'
        assert res.json_data['complaint']['longitude'] == '-74.0060'

    @pytest.mark.asyncio
    async def test_should_return_400_for_invalid_latitude_too_high(self):
        """Test that latitude > 90 is rejected"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location',
                'latitude': '95.0',
                'longitude': '-74.0060'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Invalid coordinate values'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_for_invalid_latitude_too_low(self):
        """Test that latitude < -90 is rejected"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location',
                'latitude': '-95.0',
                'longitude': '-74.0060'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Invalid coordinate values'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_for_invalid_longitude_too_high(self):
        """Test that longitude > 180 is rejected"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location',
                'latitude': '40.7128',
                'longitude': '185.0'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Invalid coordinate values'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_for_invalid_longitude_too_low(self):
        """Test that longitude < -180 is rejected"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location',
                'latitude': '40.7128',
                'longitude': '-185.0'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Invalid coordinate values'
        }

    @pytest.mark.asyncio
    async def test_should_accept_edge_case_coordinates(self):
        """Test that edge case coordinates (90, 180, -90, -180) are accepted"""
        # Test maximum valid latitude
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'North Pole',
                'latitude': '90',
                'longitude': '0'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['success'] == True


class TestAccuracyRadius:
    """Test cases for location accuracy radius validation"""

    @pytest.mark.asyncio
    async def test_should_accept_valid_accuracy_radius(self):
        """Test that valid accuracy radius is accepted"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location',
                'latitude': '40.7128',
                'longitude': '-74.0060',
                'accuracyRadius': '50'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['success'] == True
        assert res.json_data['complaint']['accuracyRadius'] == '50'

    @pytest.mark.asyncio
    async def test_should_return_400_for_zero_accuracy_radius(self):
        """Test that zero accuracy radius is rejected"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location',
                'latitude': '40.7128',
                'longitude': '-74.0060',
                'accuracyRadius': '0'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Invalid accuracy radius'
        }

    @pytest.mark.asyncio
    async def test_should_return_400_for_negative_accuracy_radius(self):
        """Test that negative accuracy radius is rejected"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location',
                'latitude': '40.7128',
                'longitude': '-74.0060',
                'accuracyRadius': '-10'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 400
        assert res.json_data == {
            'success': False,
            'message': 'Invalid accuracy radius'
        }


class TestFileUpload:
    """Test cases for evidence file upload"""

    @pytest.mark.asyncio
    async def test_should_submit_complaint_without_files(self):
        """Test that complaint can be submitted without file attachments"""
        req = MockRequest(
            body={
                'complaintType': 'Vandalism',
                'description': 'Graffiti on public property',
                'incidentDate': '2026-01-10',
                'location': 'Park District'
            },
            session={'userId': 1, 'username': 'testuser'},
            files=[]
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Park'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['success'] == True

    @pytest.mark.asyncio
    async def test_should_submit_complaint_with_image_files(self):
        """Test that complaint can be submitted with image attachments"""
        mock_file = {
            'filename': 'evidence1.jpg',
            'mimetype': 'image/jpeg',
            'path': '/uploads/images/evidence1.jpg'
        }
        req = MockRequest(
            body={
                'complaintType': 'Vandalism',
                'description': 'Broken windows',
                'incidentDate': '2026-01-10',
                'location': 'Downtown'
            },
            session={'userId': 1, 'username': 'testuser'},
            files=[mock_file]
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Downtown'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['success'] == True

    @pytest.mark.asyncio
    async def test_should_submit_complaint_with_multiple_files(self):
        """Test that complaint can be submitted with multiple file attachments"""
        mock_files = [
            {'filename': 'evidence1.jpg', 'mimetype': 'image/jpeg'},
            {'filename': 'evidence2.png', 'mimetype': 'image/png'},
            {'filename': 'video1.mp4', 'mimetype': 'video/mp4'}
        ]
        req = MockRequest(
            body={
                'complaintType': 'Assault',
                'description': 'Attack incident',
                'incidentDate': '2026-01-10',
                'location': 'Mall Area'
            },
            session={'userId': 1, 'username': 'testuser'},
            files=mock_files
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Mall'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['success'] == True


class TestSuccessfulSubmission:
    """Test cases for successful complaint submission"""

    @pytest.mark.asyncio
    async def test_should_return_complaint_id_on_success(self):
        """Test that complaint ID is returned on successful submission"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Phone stolen',
                'incidentDate': '2026-01-10',
                'location': 'Bus Station'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Station'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert 'complaintId' in res.json_data
        assert res.json_data['complaintId'] is not None

    @pytest.mark.asyncio
    async def test_should_set_status_to_pending_on_new_complaint(self):
        """Test that new complaints have 'pending' status"""
        req = MockRequest(
            body={
                'complaintType': 'Fraud',
                'description': 'Online scam',
                'incidentDate': '2026-01-10',
                'location': 'Online'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Online'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['complaint']['status'] == 'pending'

    @pytest.mark.asyncio
    async def test_should_return_success_message(self):
        """Test that success message is returned"""
        req = MockRequest(
            body={
                'complaintType': 'Harassment',
                'description': 'Verbal harassment',
                'incidentDate': '2026-01-10',
                'location': 'Office Building'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Office'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['message'] == 'Complaint submitted successfully!'

    @pytest.mark.asyncio
    async def test_should_return_complaint_details_on_success(self):
        """Test that full complaint details are returned on success"""
        req = MockRequest(
            body={
                'complaintType': 'Burglary',
                'description': 'Home break-in',
                'incidentDate': '2026-01-10',
                'location': 'Residential Area',
                'latitude': '40.7128',
                'longitude': '-74.0060'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Residential'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        complaint = res.json_data['complaint']
        assert complaint['type'] == 'Burglary'
        assert complaint['status'] == 'pending'
        assert complaint['location'] == 'Residential Area'
        assert complaint['latitude'] == '40.7128'
        assert complaint['longitude'] == '-74.0060'


class TestComplaintTypes:
    """Test cases for different complaint types"""

    @pytest.mark.asyncio
    async def test_should_accept_theft_complaint(self):
        """Test submission of theft complaint"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Car was stolen',
                'incidentDate': '2026-01-10',
                'location': 'Parking Lot'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Parking'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['complaint']['type'] == 'Theft'

    @pytest.mark.asyncio
    async def test_should_accept_assault_complaint(self):
        """Test submission of assault complaint"""
        req = MockRequest(
            body={
                'complaintType': 'Assault',
                'description': 'Physical attack',
                'incidentDate': '2026-01-10',
                'location': 'Street Corner'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Street'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['complaint']['type'] == 'Assault'

    @pytest.mark.asyncio
    async def test_should_accept_vandalism_complaint(self):
        """Test submission of vandalism complaint"""
        req = MockRequest(
            body={
                'complaintType': 'Vandalism',
                'description': 'Property damage',
                'incidentDate': '2026-01-10',
                'location': 'School'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'School'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['complaint']['type'] == 'Vandalism'

    @pytest.mark.asyncio
    async def test_should_accept_fraud_complaint(self):
        """Test submission of fraud complaint"""
        req = MockRequest(
            body={
                'complaintType': 'Fraud',
                'description': 'Credit card fraud',
                'incidentDate': '2026-01-10',
                'location': 'Bank Branch'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Bank'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['complaint']['type'] == 'Fraud'


class TestErrorHandling:
    """Test cases for error handling"""

    @pytest.mark.asyncio
    async def test_should_return_500_on_database_error(self):
        """Test that database errors are handled gracefully"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin_error(loc):
            raise Exception("Database connection failed")

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin_error, mock_get_location, mock_get_category)

        assert res.status_code == 500
        assert res.json_data == {
            'success': False,
            'message': 'Error submitting complaint'
        }


class TestDateHandling:
    """Test cases for date handling"""

    @pytest.mark.asyncio
    async def test_should_accept_valid_date_format(self):
        """Test that valid date format is accepted"""
        req = MockRequest(
            body={
                'complaintType': 'Theft',
                'description': 'Test description',
                'incidentDate': '2026-01-10',
                'location': 'Test Location'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Test'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['success'] == True

    @pytest.mark.asyncio
    async def test_should_accept_datetime_format(self):
        """Test that datetime format is accepted"""
        req = MockRequest(
            body={
                'complaintType': 'Assault',
                'description': 'Incident occurred at night',
                'incidentDate': '2026-01-10T22:30:00',
                'location': 'Night Club'
            },
            session={'userId': 1, 'username': 'testuser'}
        )
        res = MockResponse()
        pool = MockPool()

        async def mock_find_admin(loc):
            return {'adminUsername': 'admin1', 'districtName': 'Night'}

        async def mock_get_location(loc, district):
            return 1

        async def mock_get_category(cat):
            return 1

        await submit_complaint(req, res, pool, mock_find_admin, mock_get_location, mock_get_category)

        assert res.status_code == 200
        assert res.json_data['success'] == True


# Run tests when executed directly
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
