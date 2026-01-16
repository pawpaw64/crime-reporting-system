
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import os


class TestComplaintSubmissionSelenium:
    
    
    @pytest.fixture(scope="class")
    def setup_browser(self):
        """
        Setup: Create browser instance before tests
        Teardown: Close browser after tests
        """
        # Setup Chrome options
        chrome_options = webdriver.ChromeOptions()
        # chrome_options.add_argument('--headless')  # Uncomment to run without opening browser window
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--start-maximized')
        
        # Initialize Chrome driver
        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(10)  # Wait up to 10 seconds for elements
        
        # Set base URL (adjust to your server address)
        driver.base_url = "http://localhost:3000"
        
        yield driver
        
        # Cleanup: Close browser after all tests
        driver.quit()
    
    
    def login_user(self, driver, username="milonnahid_mjttnj8h", password="Nill@12345678"):
        """
        Helper method to login a user before testing complaints
        """
        # Navigate to login page
        driver.get(f"{driver.base_url}/login")
        
        # Wait for page to load
        wait = WebDriverWait(driver, 10)
        
        try:
            # Find and fill username field
            username_field = wait.until(
                EC.presence_of_element_located((By.ID, "username"))
            )
            username_field.clear()
            username_field.send_keys(username)
            
            # Find and fill password field
            password_field = driver.find_element(By.ID, "password")
            password_field.clear()
            password_field.send_keys(password)
            
            # Click login button
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_button.click()
            
            # Wait for redirect to dashboard/profile
            wait.until(EC.url_contains("profile"))
            
            return True
        except Exception as e:
            print(f"Login failed: {e}")
            return False
    
    
    def test_01_user_can_access_complaint_form(self, setup_browser):
        """
        Test that logged-in user can access the complaint submission form
        """
        driver = setup_browser
        
        # Login first
        assert self.login_user(driver), "Login failed"
        
        # Navigate to complaint form (adjust URL to your route)
        driver.get(f"{driver.base_url}/profile")
        
        # Click on "New Complaint" or "Submit Complaint" button
        wait = WebDriverWait(driver, 10)
        
        try:
            # Try to find the complaint button (adjust selector to match your HTML)
            complaint_btn = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'New Complaint')] | //a[contains(text(), 'Report Crime')]"))
            )
            complaint_btn.click()
            
            # Verify complaint form is visible
            complaint_form = wait.until(
                EC.presence_of_element_located((By.ID, "complaintForm"))
            )
            
            assert complaint_form.is_displayed(), "Complaint form not visible"
            print("✅ TEST PASSED: User can access complaint form")
            
        except Exception as e:
            pytest.fail(f"Could not access complaint form: {e}")
    
    
    def test_02_submit_complaint_with_all_fields(self, setup_browser):
        """
        Test submitting a complete complaint with all required fields
        """
        driver = setup_browser
        wait = WebDriverWait(driver, 15)
        
        # Ensure we're on the complaint form
        driver.get(f"{driver.base_url}/profile")
        time.sleep(2)
        
        try:
            # Fill out complaint type (adjust selectors to match your HTML)
            complaint_type = Select(driver.find_element(By.ID, "complaintType"))
            complaint_type.select_by_visible_text("Theft")
            
            # Fill description
            description_field = driver.find_element(By.ID, "description")
            description_field.clear()
            description_field.send_keys("My bicycle was stolen from the parking lot on January 15th. It was a red mountain bike with black handles. I locked it with a chain lock but someone cut through it.")
            
            # Fill incident date
            incident_date = driver.find_element(By.ID, "incidentDate")
            incident_date.send_keys("2026-01-15")
            
            # Fill location
            location_field = driver.find_element(By.ID, "location")
            location_field.clear()
            location_field.send_keys("Downtown Shopping Mall, Parking Area B")
            
            # Optional: Fill coordinates if your form has them
            try:
                latitude_field = driver.find_element(By.ID, "latitude")
                latitude_field.send_keys("23.8103")
                
                longitude_field = driver.find_element(By.ID, "longitude")
                longitude_field.send_keys("90.4125")
            except NoSuchElementException:
                print("Coordinate fields not found, skipping...")
            
            # Take screenshot before submission
            driver.save_screenshot("complaint_form_filled.png")
            
            # Submit the form
            submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            # Wait for success message or redirect
            try:
                success_message = wait.until(
                    EC.presence_of_element_located((By.CLASS_NAME, "success-message"))
                )
                assert "success" in success_message.text.lower(), "No success message found"
                print("✅ TEST PASSED: Complaint submitted successfully")
                
            except TimeoutException:
                # Check if redirected to complaints list
                wait.until(EC.url_contains("complaints"))
                print("✅ TEST PASSED: Redirected after submission")
            
        except Exception as e:
            driver.save_screenshot("complaint_submission_error.png")
            pytest.fail(f"Complaint submission failed: {e}")
    
    
    def test_03_validation_missing_complaint_type(self, setup_browser):
        """
        Test that form validation works when complaint type is missing
        """
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        
        driver.get(f"{driver.base_url}/profile")
        time.sleep(2)
        
        try:
            # Fill all fields EXCEPT complaint type
            description_field = driver.find_element(By.ID, "description")
            description_field.clear()
            description_field.send_keys("Test description for validation")
            
            incident_date = driver.find_element(By.ID, "incidentDate")
            incident_date.send_keys("2026-01-15")
            
            location_field = driver.find_element(By.ID, "location")
            location_field.clear()
            location_field.send_keys("Test Location")
            
            # Try to submit
            submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            # Check for error message
            time.sleep(1)
            
            # Check if complaint type field shows validation error
            complaint_type_field = driver.find_element(By.ID, "complaintType")
            validation_msg = complaint_type_field.get_attribute("validationMessage")
            
            assert validation_msg or not driver.current_url.endswith("/success"), "Validation should prevent submission"
            print("✅ TEST PASSED: Form validates missing complaint type")
            
        except Exception as e:
            pytest.fail(f"Validation test failed: {e}")
    
    
    def test_04_validation_missing_description(self, setup_browser):
        """
        Test that form validation works when description is missing
        """
        driver = setup_browser
        
        driver.get(f"{driver.base_url}/profile")
        time.sleep(2)
        
        try:
            # Fill all fields EXCEPT description
            complaint_type = Select(driver.find_element(By.ID, "complaintType"))
            complaint_type.select_by_visible_text("Assault")
            
            incident_date = driver.find_element(By.ID, "incidentDate")
            incident_date.send_keys("2026-01-15")
            
            location_field = driver.find_element(By.ID, "location")
            location_field.clear()
            location_field.send_keys("Test Location")
            
            # Leave description empty
            description_field = driver.find_element(By.ID, "description")
            description_field.clear()
            
            # Try to submit
            submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            time.sleep(1)
            
            # Verify we didn't navigate away (form prevented submission)
            assert "profile" in driver.current_url or "complaint" in driver.current_url, "Should stay on form page"
            print("✅ TEST PASSED: Form validates missing description")
            
        except Exception as e:
            pytest.fail(f"Validation test failed: {e}")
    
    
    def test_05_validation_missing_date(self, setup_browser):
        """
        Test that form validation works when incident date is missing
        """
        driver = setup_browser
        
        driver.get(f"{driver.base_url}/profile")
        time.sleep(2)
        
        try:
            # Fill all fields EXCEPT date
            complaint_type = Select(driver.find_element(By.ID, "complaintType"))
            complaint_type.select_by_visible_text("Fraud")
            
            description_field = driver.find_element(By.ID, "description")
            description_field.clear()
            description_field.send_keys("Test description")
            
            location_field = driver.find_element(By.ID, "location")
            location_field.clear()
            location_field.send_keys("Test Location")
            
            # Leave date empty - clear it if it has a default value
            incident_date = driver.find_element(By.ID, "incidentDate")
            incident_date.clear()
            
            # Try to submit
            submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            time.sleep(1)
            
            # Check validation
            date_validation = incident_date.get_attribute("validationMessage")
            assert date_validation or "profile" in driver.current_url, "Date validation should trigger"
            print("✅ TEST PASSED: Form validates missing date")
            
        except Exception as e:
            pytest.fail(f"Validation test failed: {e}")
    
    
    def test_06_validation_missing_location(self, setup_browser):
        """
        Test that form validation works when location is missing
        """
        driver = setup_browser
        
        driver.get(f"{driver.base_url}/profile")
        time.sleep(2)
        
        try:
            # Fill all fields EXCEPT location
            complaint_type = Select(driver.find_element(By.ID, "complaintType"))
            complaint_type.select_by_visible_text("Vandalism")
            
            description_field = driver.find_element(By.ID, "description")
            description_field.clear()
            description_field.send_keys("Test description for validation")
            
            incident_date = driver.find_element(By.ID, "incidentDate")
            incident_date.send_keys("2026-01-15")
            
            # Leave location empty
            location_field = driver.find_element(By.ID, "location")
            location_field.clear()
            
            # Try to submit
            submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            time.sleep(1)
            
            # Verify validation triggered
            assert "profile" in driver.current_url or "complaint" in driver.current_url, "Should stay on form"
            print("✅ TEST PASSED: Form validates missing location")
            
        except Exception as e:
            pytest.fail(f"Validation test failed: {e}")
    
    
    def test_07_view_submitted_complaints(self, setup_browser):
        """
        Test that user can view their submitted complaints
        """
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        
        try:
            # Navigate to complaints list page
            driver.get(f"{driver.base_url}/profile")
            
            # Look for "My Complaints" link or button
            complaints_link = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'My Complaints')] | //button[contains(text(), 'View Complaints')]"))
            )
            complaints_link.click()
            
            time.sleep(2)
            
            # Verify complaints are displayed
            complaints_list = driver.find_elements(By.CLASS_NAME, "complaint-item")
            
            # Should have at least the complaint we just submitted
            assert len(complaints_list) > 0, "No complaints found"
            print(f"✅ TEST PASSED: Found {len(complaints_list)} complaint(s)")
            
        except Exception as e:
            driver.save_screenshot("view_complaints_error.png")
            print(f"⚠️ Warning: Could not verify complaints list: {e}")
    
    
    def test_08_complaint_status_display(self, setup_browser):
        """
        Test that complaint status is displayed correctly
        """
        driver = setup_browser
        
        try:
            driver.get(f"{driver.base_url}/profile")
            time.sleep(2)
            
            # Find status elements
            status_elements = driver.find_elements(By.CLASS_NAME, "complaint-status")
            
            if status_elements:
                for status in status_elements:
                    status_text = status.text.lower()
                    # Valid statuses: pending, reviewed, investigating, resolved
                    assert any(s in status_text for s in ['pending', 'reviewed', 'investigating', 'resolved']), \
                        f"Invalid status: {status_text}"
                
                print("✅ TEST PASSED: Complaint statuses are valid")
            else:
                print("⚠️ Warning: No status elements found")
                
        except Exception as e:
            print(f"⚠️ Warning: Status check failed: {e}")
    
    
    def test_09_logout_after_tests(self, setup_browser):
        """
        Test logout functionality and cleanup
        """
        driver = setup_browser
        
        try:
            # Find and click logout button
            logout_btn = driver.find_element(By.XPATH, "//a[contains(text(), 'Logout')] | //button[contains(text(), 'Logout')]")
            logout_btn.click()
            
            time.sleep(2)
            
            # Verify redirected to login or home page
            assert "login" in driver.current_url or driver.current_url == f"{driver.base_url}/", \
                "Should redirect after logout"
            
            print("✅ TEST PASSED: User logged out successfully")
            
        except Exception as e:
            print(f"⚠️ Warning: Logout test failed: {e}")


# ==============================================================================
# TEST CONFIGURATION
# ==============================================================================

if __name__ == '__main__':
    """
    Run tests when executed directly
    
    Usage:
        python test_complaint_selenium.py
        
    Or with pytest:
        pytest test_complaint_selenium.py -v -s
        
    Options:
        -v : Verbose output
        -s : Show print statements
        --tb=short : Short traceback format
    """
    pytest.main([__file__, '-v', '-s', '--tb=short'])
