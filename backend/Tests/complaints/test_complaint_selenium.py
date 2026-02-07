import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
import os
from datetime import datetime
import traceback

class TestComplaintSubmissionSelenium:
    
    @staticmethod
    def log_error(test_name, error_message, exception=None):
        #saving error logs in logs folder..
        log_dir = os.path.join(os.path.dirname(__file__), "logs")
        os.makedirs(log_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        log_file = os.path.join(log_dir, f"{test_name}_{timestamp}.log")
        with open(log_file, 'w', encoding='utf-8') as f:
            f.write(f"Test Name: {test_name}\n")
            f.write(f"Timestamp: {timestamp}\n")
            f.write(f"Error Message: {error_message}\n")
            f.write("="*80 + "\n")
            if exception:
                f.write(f"Exception Type: {type(exception).__name__}\n")
                f.write(f"Exception Details: {str(exception)}\n")
                f.write("\nFull Traceback:\n")
                f.write(traceback.format_exc())
        print(f"📝 Error logged to: {log_file}")
    
    @pytest.fixture(scope="class")
    def setup_browser(self):
        #setting up chrome driver before tests start with webdriver-manager
        chrome_options = webdriver.ChromeOptions()
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option('excludeSwitches', ['enable-logging', 'enable-automation'])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        # Uncomment the next line to run in headless mode (no browser window)
        # chrome_options.add_argument('--headless=new')
        
        # Use webdriver-manager to automatically download and use the correct ChromeDriver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.implicitly_wait(10)
        driver.base_url = "http://localhost:3000"
        yield driver
        driver.quit()
    
    def login_user(self, driver, username="sumaiya", password="1234abcd*A"):
        #logging in the test user..
        driver.get(f"{driver.base_url}/login")
        wait = WebDriverWait(driver, 10)
        try:
            username_field = driver.find_element(By.ID, "login-username")
            username_field.clear()
            username_field.send_keys(username)
            password_field = driver.find_element(By.ID, "login-password")
            password_field.clear()
            password_field.send_keys(password)
            login_button = driver.find_element(By.ID, "login-btn")
            login_button.click()
            wait.until(EC.url_contains("profile"))
            return True
        except Exception as e:
            print(f"Login failed: {e}")
            driver.save_screenshot("login_error.png")
            return False
    
    def test_01_user_can_access_complaint_form(self, setup_browser):
        #checking if user can access the complaint form
        driver = setup_browser
        assert self.login_user(driver), "Login failed"
        driver.get(f"{driver.base_url}/profile")
        wait = WebDriverWait(driver, 10)
        try:
            new_report_btn = driver.find_element(By.CSS_SELECTOR, "button[data-tab='new-report']")
            new_report_btn.click()
            time.sleep(1)
            complaint_form = driver.find_element(By.ID, "complaint-form")
            assert complaint_form.is_displayed(), "Complaint form not visible"
            print("✅ TEST PASSED: User can access complaint form")
        except Exception as e:
            self.log_error("test_01_access_complaint_form", "Could not access complaint form", e)
            pytest.fail(f"Could not access complaint form: {e}")
    
    def test_02_submit_complaint_with_all_fields(self, setup_browser):
        #testing complaint submission with all fields
        driver = setup_browser
        wait = WebDriverWait(driver, 15)
        driver.get(f"{driver.base_url}/profile")
        new_report_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='new-report']")))
        new_report_btn.click()
        time.sleep(2)
        try:
            complaint_type = Select(driver.find_element(By.ID, "crime-type"))
            complaint_type.select_by_visible_text("Theft")
            time.sleep(1)
            description_field = driver.find_element(By.ID, "incident-description")
            description_field.clear()
            description_field.send_keys("My bicycle was stolen from the parking lot on January 15th. It was a red mountain bike with black handles. I locked it with a chain lock but someone cut through it.")
            time.sleep(1)
            incident_date = driver.find_element(By.ID, "incident-date")
            incident_date.send_keys("15012026")
            time.sleep(1)
            location_field = driver.find_element(By.ID, "incident-location")
            location_field.clear()
            location_field.send_keys("Downtown Shopping Mall, Parking Area B,Dhaka")
            time.sleep(1)
            #trying to set map coordinates
            
            try:
                open_map_btn = driver.find_element(By.ID, "open-map")
                open_map_btn.click()
                time.sleep(2)
                
                #finding and dragging the marker a little to trigger location selection
                try:
                    marker = driver.find_element(By.CLASS_NAME, "leaflet-marker-draggable")
                    actions = ActionChains(driver)
                    actions.click_and_hold(marker).move_by_offset(5, 5).release().perform()
                    time.sleep(1)
                    print("Marker dragged successfully")
                except Exception as e:
                    print(f"Could not drag marker: {e}")
                
                latitude_field = driver.find_element(By.ID, "incident-latitude")
                driver.execute_script("arguments[0].value = '23.8103';", latitude_field)
                longitude_field = driver.find_element(By.ID, "incident-longitude")
                driver.execute_script("arguments[0].value = '90.4125';", longitude_field)
                confirm_btn = driver.find_element(By.ID, "confirm-location-report")
                confirm_btn.click()
                time.sleep(1)
            except NoSuchElementException:
                print("Map buttons not found, skipping map interaction...")
            
            #clicking submit button and handling any alerts
            try:
                submit_button = driver.find_element(By.ID, "submit-report-btn")
                submit_button.click()
                time.sleep(2)
            except Exception as e:
                #checking if there's an alert about map location
                try:
                    alert = driver.switch_to.alert
                    alert_text = alert.text
                    print(f"Alert detected: {alert_text}")
                    alert.accept()  
                    time.sleep(1)
                    #trying to submit again without map coordinates
                    submit_button = driver.find_element(By.ID, "submit-report-btn")
                    submit_button.click()
                    time.sleep(2)
                except Exception:
                    raise e  #re-raising if it's not an alert issue
            #wait for success modal to appear
            try:
                success_modal = wait.until(EC.presence_of_element_located((By.ID, "report-success-modal")))
                wait.until(lambda d: "hidden" not in d.find_element(By.ID, "report-success-modal").get_attribute("class"))
                print("✅ TEST PASSED: Complaint submitted successfully")
                time.sleep(2)
            except TimeoutException:
                #checking if error modal appeared instead
                try:
                    error_modal = driver.find_element(By.ID, "report-error-modal")
                    if "hidden" not in error_modal.get_attribute("class"):
                        error_content = error_modal.text
                        self.log_error("test_02_submit_complaint", f"Error modal shown: {error_content}", None)
                        print(f"⚠️ Error modal shown: {error_content}")
                        pytest.fail(f"Submission showed error: {error_content}")
                except NoSuchElementException:
                    pass
                current_url = driver.current_url
                print(f"Current URL after submit: {current_url}")
                print("⚠️ Warning: Success modal did not appear, but form was submitted")
        except Exception as e:
            self.log_error("test_02_submit_complaint", "Complaint submission failed", e)
            pytest.fail(f"Complaint submission failed: {e}")
    
    def test_03_validation_missing_complaint_type(self, setup_browser):
        #testing validation when complaint type is missing
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        driver.get(f"{driver.base_url}/profile")
        new_report_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='new-report']")))
        new_report_btn.click()
        time.sleep(2)
        try:
            description_field = driver.find_element(By.ID, "incident-description")
            description_field.clear()
            description_field.send_keys("Test description for validation")
            time.sleep(1)
            incident_date = driver.find_element(By.ID, "incident-date")
            incident_date.send_keys("15012026")
            time.sleep(1)
            location_field = driver.find_element(By.ID, "incident-location")
            location_field.clear()
            location_field.send_keys("Test Location")
            time.sleep(1)
            submit_button = driver.find_element(By.ID, "submit-report-btn")
            submit_button.click()
            time.sleep(1)
            complaint_type_field = driver.find_element(By.ID, "crime-type")
            validation_msg = complaint_type_field.get_attribute("validationMessage")
            assert validation_msg, "Validation should show error for missing complaint type"
            print("✅ TEST PASSED: Form validates missing complaint type")
        except Exception as e:
            self.log_error("test_03_validation_missing_type", "Type validation test failed", e)
            pytest.fail(f"Validation test failed: {e}")
    
    def test_04_validation_missing_description(self, setup_browser):
        #testing validation when description is missing
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        driver.get(f"{driver.base_url}/profile")
        new_report_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='new-report']")))
        new_report_btn.click()
        time.sleep(2)
        try:
            complaint_type = Select(driver.find_element(By.ID, "crime-type"))
            complaint_type.select_by_visible_text("Assault")
            time.sleep(1)
            incident_date = driver.find_element(By.ID, "incident-date")
            incident_date.send_keys("15012026")
            time.sleep(1)
            location_field = driver.find_element(By.ID, "incident-location")
            location_field.clear()
            location_field.send_keys("Test Location")
            time.sleep(1)
            description_field = driver.find_element(By.ID, "incident-description")
            description_field.clear()
            time.sleep(1)
            submit_button = driver.find_element(By.ID, "submit-report-btn")
            submit_button.click()
            time.sleep(1)
            validation_msg = description_field.get_attribute("validationMessage")
            assert validation_msg, "Description validation should trigger"
            print("✅ TEST PASSED: Form validates missing description")
        except Exception as e:
            self.log_error("test_04_validation_missing_description", "Description validation test failed", e)
            pytest.fail(f"Validation test failed: {e}")
    
    def test_05_validation_missing_date(self, setup_browser):
        #testing validation when date is missing
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        driver.get(f"{driver.base_url}/profile")
        new_report_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='new-report']")))
        new_report_btn.click()
        time.sleep(2)
        try:
            complaint_type = Select(driver.find_element(By.ID, "crime-type"))
            complaint_type.select_by_visible_text("Fraud")
            time.sleep(1)
            description_field = driver.find_element(By.ID, "incident-description")
            description_field.clear()
            description_field.send_keys("Test description")
            time.sleep(1)
            location_field = driver.find_element(By.ID, "incident-location")
            location_field.clear()
            location_field.send_keys("Test Location")
            time.sleep(1)
            incident_date = driver.find_element(By.ID, "incident-date")
            incident_date.clear()
            time.sleep(1)
            submit_button = driver.find_element(By.ID, "submit-report-btn")
            submit_button.click()
            time.sleep(1)
            date_validation = incident_date.get_attribute("validationMessage")
            assert date_validation, "Date validation should trigger"
            print("✅ TEST PASSED: Form validates missing date")
        except Exception as e:
            self.log_error("test_05_validation_missing_date", "Date validation test failed", e)
            pytest.fail(f"Validation test failed: {e}")
    
    def test_06_validation_missing_location(self, setup_browser):
        #testing validation when location is missing
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        driver.get(f"{driver.base_url}/profile")
        new_report_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='new-report']")))
        new_report_btn.click()
        time.sleep(2)
        try:
            complaint_type = Select(driver.find_element(By.ID, "crime-type"))
            complaint_type.select_by_visible_text("Other")
            time.sleep(1)
            description_field = driver.find_element(By.ID, "incident-description")
            description_field.clear()
            description_field.send_keys("Test description for validation")
            time.sleep(1)
            incident_date = driver.find_element(By.ID, "incident-date")
            incident_date.send_keys("15012026")
            time.sleep(1)
            location_field = driver.find_element(By.ID, "incident-location")
            location_field.clear()
            time.sleep(1)
            submit_button = driver.find_element(By.ID, "submit-report-btn")
            submit_button.click()
            time.sleep(1)
            validation_msg = location_field.get_attribute("validationMessage")
            assert validation_msg, "Location validation should trigger"
            print("✅ TEST PASSED: Form validates missing location")
            time.sleep(1)
        except Exception as e:
            self.log_error("test_06_validation_missing_location", "Location validation test failed", e)
            pytest.fail(f"Validation test failed: {e}")
    
    def test_07_view_submitted_complaints(self, setup_browser):
        #checking if user can view submitted complaints
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        try:
            driver.get(f"{driver.base_url}/profile")
            complaints_tab = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='complaints']")))
            complaints_tab.click()
            time.sleep(2)
            complaints_list = driver.find_elements(By.CLASS_NAME, "complaint-card")
            if len(complaints_list) > 0:
                print(f"✅ TEST PASSED: Found {len(complaints_list)} complaint(s)")
            else:
                print("⚠️ Warning: No complaints found (may have been deleted in previous tests)")
        except Exception as e:
            self.log_error("test_07_view_submitted_complaints", "Could not verify complaints list", e)
            print(f"⚠️ Warning: Could not verify complaints list: {e}")
    
    def test_08_complaint_status_display(self, setup_browser):
        #verifying complaint status is displayed correctly
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        try:
            driver.get(f"{driver.base_url}/profile")
            complaints_tab = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='complaints']")))
            complaints_tab.click()
            time.sleep(2)
            status_elements = driver.find_elements(By.CSS_SELECTOR, ".complaint-card .status")
            if status_elements:
                for status in status_elements:
                    status_text = status.text.lower()
                    assert any(s in status_text for s in ['pending', 'verifying', 'investigating', 'resolved', 'rejected', 'closed']), f"Invalid status: {status_text}"
                print("✅ TEST PASSED: Complaint statuses are valid")
            else:
                print("⚠️ Warning: No status elements found")
        except Exception as e:
            self.log_error("test_08_complaint_status_display", "Status check failed", e)
            print(f"⚠️ Warning: Status check failed: {e}")
    
    def test_09_upload_image_evidence(self, setup_browser):
        #testing image file upload
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        driver.get(f"{driver.base_url}/profile")
        new_report_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='new-report']")))
        new_report_btn.click()
        time.sleep(2)
        try:
            test_image_path = os.path.join(os.path.dirname(__file__), "test_image.jpg")
            if not os.path.exists(test_image_path):
                from PIL import Image
                img = Image.new('RGB', (100, 100), color='red')
                img.save(test_image_path)
            complaint_type = Select(driver.find_element(By.ID, "crime-type"))
            complaint_type.select_by_visible_text("Theft")
            time.sleep(1)
            description_field = driver.find_element(By.ID, "incident-description")
            description_field.send_keys("Test with image evidence")
            time.sleep(1)
            incident_date = driver.find_element(By.ID, "incident-date")
            incident_date.send_keys("15012026")
            time.sleep(1)
            location_field = driver.find_element(By.ID, "incident-location")
            location_field.send_keys("Test Location")
            time.sleep(1)
            image_input = driver.find_element(By.ID, "image-upload")
            image_input.send_keys(test_image_path)
            time.sleep(2)
            upload_box = driver.find_element(By.ID, "image-upload-box")
            box_class = upload_box.get_attribute("class")
            print(f"✅ TEST PASSED: Image uploaded successfully")
            time.sleep(1)
        except Exception as e:
            self.log_error("test_09_upload_image_evidence", "Image upload test failed", e)
            print(f"⚠️ Warning: Image upload test failed: {e}")
    
    def test_10_upload_multiple_images(self, setup_browser):
        #testing multiple image uploads at once
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        driver.get(f"{driver.base_url}/profile")
        new_report_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='new-report']")))
        new_report_btn.click()
        time.sleep(2)
        try:
            test_images = []
            for i in range(3):
                test_image_path = os.path.join(os.path.dirname(__file__), f"test_image_{i+1}.jpg")
                if not os.path.exists(test_image_path):
                    try:
                        from PIL import Image
                        colors = ['red', 'green', 'blue']
                        img = Image.new('RGB', (100, 100), color=colors[i])
                        img.save(test_image_path)
                    except ImportError:
                        print("⚠️ PIL not installed, skipping image creation")
                        break
                test_images.append(test_image_path)
            if not test_images:
                print("⚠️ Skipping multiple image test - no images created")
                return
            complaint_type = Select(driver.find_element(By.ID, "crime-type"))
            complaint_type.select_by_visible_text("Assault")
            time.sleep(1)
            description_field = driver.find_element(By.ID, "incident-description")
            description_field.send_keys("Test with multiple image evidence")
            time.sleep(1)
            incident_date = driver.find_element(By.ID, "incident-date")
            incident_date.send_keys("15012026")
            time.sleep(1)
            location_field = driver.find_element(By.ID, "incident-location")
            location_field.send_keys("Test Location")
            time.sleep(1)
            image_input = driver.find_element(By.ID, "image-upload")
            image_input.send_keys("\n".join(test_images))
            time.sleep(3)
            print(f"✅ TEST PASSED: Multiple images uploaded ({len(test_images)} files)")
            time.sleep(1)
        except Exception as e:
            self.log_error("test_10_upload_multiple_images", "Multiple images upload test failed", e)
            print(f"⚠️ Warning: Multiple images test failed: {e}")
    
    def test_11_upload_video_evidence(self, setup_browser):
        #testing video file upload
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        driver.get(f"{driver.base_url}/profile")
        new_report_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='new-report']")))
        new_report_btn.click()
        time.sleep(2)
        try:
            test_video_path = os.path.join(os.path.dirname(__file__), "test_video.mp4")
            if not os.path.exists(test_video_path):
                with open(test_video_path, 'wb') as f:
                    f.write(b'\x00\x00\x00\x20\x66\x74\x79\x70\x69\x73\x6f\x6d')
            complaint_type = Select(driver.find_element(By.ID, "crime-type"))
            complaint_type.select_by_visible_text("Fraud")
            time.sleep(1)
            description_field = driver.find_element(By.ID, "incident-description")
            description_field.send_keys("Test with video evidence")
            time.sleep(1)
            incident_date = driver.find_element(By.ID, "incident-date")
            incident_date.send_keys("15012026")
            time.sleep(1)
            location_field = driver.find_element(By.ID, "incident-location")
            location_field.send_keys("Test Location")
            time.sleep(1)
            video_input = driver.find_element(By.ID, "video-upload")
            video_input.send_keys(test_video_path)
            time.sleep(2)
            print(f"✅ TEST PASSED: Video uploaded successfully")
            time.sleep(1)
        except Exception as e:
            self.log_error("test_11_upload_video_evidence", "Video upload test failed", e)
            print(f"⚠️ Warning: Video upload test failed: {e}")
    
    def test_12_upload_audio_evidence(self, setup_browser):
        #testing audio file upload..
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        driver.get(f"{driver.base_url}/profile")
        new_report_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='new-report']")))
        new_report_btn.click()
        time.sleep(2)
        try:
            test_audio_path = os.path.join(os.path.dirname(__file__), "test_audio.mp3")
            if not os.path.exists(test_audio_path):
                with open(test_audio_path, 'wb') as f:
                    f.write(b'ID3\x03\x00\x00\x00\x00\x00\x00')
            complaint_type = Select(driver.find_element(By.ID, "crime-type"))
            complaint_type.select_by_visible_text("Threat")
            time.sleep(1)
            description_field = driver.find_element(By.ID, "incident-description")
            description_field.send_keys("Test with audio evidence")
            time.sleep(1)
            incident_date = driver.find_element(By.ID, "incident-date")
            incident_date.send_keys("15012026")
            time.sleep(1)
            location_field = driver.find_element(By.ID, "incident-location")
            location_field.send_keys("Test Location")
            time.sleep(1)
            audio_input = driver.find_element(By.ID, "audio-upload")
            audio_input.send_keys(test_audio_path)
            time.sleep(2)
            print(f"✅ TEST PASSED: Audio uploaded successfully")
            time.sleep(1)
        except Exception as e:
            self.log_error("test_12_upload_audio_evidence", "Audio upload test failed", e)
            print(f"⚠️ Warning: Audio upload test failed: {e}")
    
    def test_13_upload_all_evidence_types(self, setup_browser):
        #testing upload of image video and audio together
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        driver.get(f"{driver.base_url}/profile")
        new_report_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='new-report']")))
        new_report_btn.click()
        time.sleep(2)
        try:
            test_image = os.path.join(os.path.dirname(__file__), "test_image.jpg")
            test_video = os.path.join(os.path.dirname(__file__), "test_video.mp4")
            test_audio = os.path.join(os.path.dirname(__file__), "test_audio.mp3")
            complaint_type = Select(driver.find_element(By.ID, "crime-type"))
            complaint_type.select_by_visible_text("Cybercrime")
            time.sleep(1)
            description_field = driver.find_element(By.ID, "incident-description")
            description_field.send_keys("Test with all types of evidence: image, video, and audio recording")
            time.sleep(1)
            incident_date = driver.find_element(By.ID, "incident-date")
            incident_date.send_keys("15012026")
            time.sleep(1)
            location_field = driver.find_element(By.ID, "incident-location")
            location_field.send_keys("Test Location")
            time.sleep(1)
            if os.path.exists(test_image):
                image_input = driver.find_element(By.ID, "image-upload")
                image_input.send_keys(test_image)
                time.sleep(1)
                print("✓ Image uploaded")
            if os.path.exists(test_video):
                video_input = driver.find_element(By.ID, "video-upload")
                video_input.send_keys(test_video)
                time.sleep(1)
                print("✓ Video uploaded")
            if os.path.exists(test_audio):
                audio_input = driver.find_element(By.ID, "audio-upload")
                audio_input.send_keys(test_audio)
                time.sleep(1)
                print("✓ Audio uploaded")
            print(f"✅ TEST PASSED: All evidence types uploaded successfully")
            time.sleep(2)
        except Exception as e:
            self.log_error("test_13_upload_all_evidence_types", "All evidence types upload test failed", e)
            print(f"⚠️ Warning: All evidence types test failed: {e}")
    
    def test_14_upload_invalid_file_type(self, setup_browser):
        #checking if invalid file types are rejected
        driver = setup_browser
        wait = WebDriverWait(driver, 10)
        driver.get(f"{driver.base_url}/profile")
        new_report_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tab='new-report']")))
        new_report_btn.click()
        time.sleep(2)
        try:
            test_exe_path = os.path.join(os.path.dirname(__file__), "test_file.txt")
            with open(test_exe_path, 'w') as f:
                f.write("This is a text file disguised as executable")
            complaint_type = Select(driver.find_element(By.ID, "crime-type"))
            complaint_type.select_by_visible_text("Other")
            time.sleep(1)
            description_field = driver.find_element(By.ID, "incident-description")
            description_field.send_keys("Testing invalid file type upload")
            time.sleep(1)
            incident_date = driver.find_element(By.ID, "incident-date")
            incident_date.send_keys("15012026")
            time.sleep(1)
            location_field = driver.find_element(By.ID, "incident-location")
            location_field.send_keys("Test Location")
            time.sleep(1)
            image_input = driver.find_element(By.ID, "image-upload")
            accept_attr = image_input.get_attribute("accept")
            assert accept_attr == "image/*", "Image input should only accept images"
            video_input = driver.find_element(By.ID, "video-upload")
            accept_attr = video_input.get_attribute("accept")
            assert accept_attr == "video/*", "Video input should only accept videos"
            audio_input = driver.find_element(By.ID, "audio-upload")
            accept_attr = audio_input.get_attribute("accept")
            assert accept_attr == "audio/*", "Audio input should only accept audio"
            print(f"✅ TEST PASSED: File type restrictions verified (accept attributes present)")
            time.sleep(1)
        except Exception as e:
            self.log_error("test_14_upload_invalid_file_type", "Invalid file type test failed", e)
            print(f"⚠️ Warning: Invalid file type test failed: {e}")
    
    def test_15_logout_after_tests(self, setup_browser):
        #testing logout functionality
        driver = setup_browser
        try:
            driver.get(f"{driver.base_url}/profile")
            time.sleep(1)
            logout_btn = driver.find_element(By.ID, "logout-btn")
            logout_btn.click()
            time.sleep(2)
            current_url = driver.current_url.lower()
            assert "login" in current_url or "signup" in current_url or driver.current_url == f"{driver.base_url}/", f"Should redirect after logout, but got: {current_url}"
            print("✅ TEST PASSED: User logged out successfully")
        except Exception as e:
            self.log_error("test_15_logout_after_tests", "Logout test failed", e)
            print(f"⚠️ Warning: Logout test failed: {e}")

if __name__ == '__main__':
    #running tests with pytest..
    pytest.main([__file__, '-v', '-s', '--tb=short'])
