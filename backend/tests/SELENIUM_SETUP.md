# 🌐 Selenium E2E Testing Setup Guide

This guide will help you set up and run automated browser tests for the complaint submission feature.

---

## 📋 Prerequisites

### 1. **Install Python Packages**

```bash
cd backend
pip install selenium pytest pytest-asyncio webdriver-manager
```

### 2. **Install Chrome Browser**
- Download and install: https://www.google.com/chrome/

### 3. **Install ChromeDriver (Option A - Automatic)**

Using webdriver-manager (recommended):
```bash
pip install webdriver-manager
```

Then update the test file to use it:
```python
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

# In setup_browser fixture:
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=chrome_options)
```

### **OR Install ChromeDriver (Option B - Manual)**

1. Check your Chrome version: `chrome://version`
2. Download matching ChromeDriver: https://chromedriver.chromium.org/
3. Add ChromeDriver to your PATH

---

## 🚀 Running the Tests

### **Step 1: Start Your Backend Server**

```bash
cd backend
npm run dev
```

Server should be running on `http://localhost:3000`

### **Step 2: Create Test User (If needed)**

Make sure you have a test user in your database:
- Username: `testuser`
- Password: `testpass123`

Or update the credentials in the test file:
```python
def login_user(self, driver, username="YOUR_USERNAME", password="YOUR_PASSWORD"):
```

### **Step 3: Run Selenium Tests**

```bash
cd backend/tests

# Run all Selenium tests with visible browser:
pytest complaints/test_complaint_selenium.py -v -s

# Run specific test:
pytest complaints/test_complaint_selenium.py::TestComplaintSubmissionSelenium::test_02_submit_complaint_with_all_fields -v -s

# Run in headless mode (no browser window):
# Edit the test file and uncomment:
# chrome_options.add_argument('--headless')
```

---

## 🎯 Test Output

### **Successful Run:**
```
tests/complaints/test_complaint_selenium.py::TestComplaintSubmissionSelenium::test_01_user_can_access_complaint_form PASSED
✅ TEST PASSED: User can access complaint form

tests/complaints/test_complaint_selenium.py::TestComplaintSubmissionSelenium::test_02_submit_complaint_with_all_fields PASSED
✅ TEST PASSED: Complaint submitted successfully

tests/complaints/test_complaint_selenium.py::TestComplaintSubmissionSelenium::test_03_validation_missing_complaint_type PASSED
✅ TEST PASSED: Form validates missing complaint type

... (more tests)

========================= 9 passed in 45.23s =========================
```

---

## 🔧 Configuration

### **Adjust Base URL**

If your server runs on a different port:
```python
# In setup_browser fixture:
driver.base_url = "http://localhost:5000"  # Change port
```

### **Adjust Element Selectors**

The tests use element IDs and classes. Update them to match your HTML:
```python
# Example: If your form has different IDs
complaint_type = driver.find_element(By.ID, "your-actual-id")
```

### **Add Wait Times**

If your app is slow, increase timeouts:
```python
driver.implicitly_wait(20)  # Wait up to 20 seconds
wait = WebDriverWait(driver, 20)
```

---

## 📸 Screenshots

Tests automatically take screenshots on errors:
- `complaint_form_filled.png` - Before submission
- `complaint_submission_error.png` - If submission fails

Find them in the `backend/tests` directory.

---

## 🐛 Troubleshooting

### **Problem: "ChromeDriver not found"**
**Solution:** Install webdriver-manager or manually add ChromeDriver to PATH

### **Problem: "Element not found"**
**Solution:** Update element selectors to match your HTML:
```python
# Check your HTML and update:
complaint_type = driver.find_element(By.ID, "actual-element-id")
```

### **Problem: "Connection refused"**
**Solution:** Make sure backend server is running on http://localhost:3000

### **Problem: Tests run too fast**
**Solution:** Add more wait time:
```python
time.sleep(2)  # Wait 2 seconds
```

### **Problem: "Session not created"**
**Solution:** Chrome and ChromeDriver versions don't match
- Update Chrome browser
- Reinstall ChromeDriver: `pip install --upgrade webdriver-manager`

---

## 📝 Test Checklist

Before running tests, ensure:
- ✅ Backend server is running
- ✅ Database has test user credentials
- ✅ Chrome browser is installed
- ✅ ChromeDriver is installed or webdriver-manager is set up
- ✅ All required Python packages are installed

---

## 🎓 Understanding the Tests

### **What These Tests Do:**

1. **test_01**: Opens browser → Logs in → Clicks complaint button → Verifies form appears
2. **test_02**: Fills all form fields → Submits → Checks for success message
3. **test_03-06**: Tests validation by leaving fields empty → Verifies errors appear
4. **test_07**: Views list of submitted complaints
5. **test_08**: Checks complaint status is displayed correctly
6. **test_09**: Logs out the user

### **Benefits Over Unit Tests:**

- ✅ Tests the **actual UI** users interact with
- ✅ Tests **browser compatibility**
- ✅ Tests **JavaScript** that runs in browser
- ✅ Tests **visual elements** (buttons, forms, messages)
- ✅ Catches **CSS/layout issues**
- ✅ Tests **complete user workflow**

### **When to Use:**

- **Unit Tests**: Fast, test individual functions, run on every code change
- **Selenium Tests**: Slower, test complete workflows, run before deployment

---

## 🚦 Running Both Test Types

```bash
# Run unit tests (fast):
pytest tests/auth/test_login.py -v

# Run Selenium tests (slower, full browser):
pytest tests/complaints/test_complaint_selenium.py -v -s

# Run all tests:
pytest tests/ -v
```

---

## 💡 Tips

1. **Run Selenium tests periodically** (e.g., before deploying)
2. **Run unit tests frequently** (e.g., on every code commit)
3. **Use headless mode in CI/CD** to avoid opening browser windows
4. **Take screenshots** on failures for debugging
5. **Keep test user credentials separate** from production

---

## 📚 Next Steps

1. Customize element selectors to match your HTML
2. Add more test scenarios (file uploads, error handling)
3. Integrate with CI/CD pipeline (GitHub Actions, Jenkins)
4. Test on multiple browsers (Firefox, Safari, Edge)

---

**Happy Testing! 🎉**
