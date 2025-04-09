from flask import Flask, render_template, request, jsonify
from playwright.sync_api import sync_playwright
import time
import os
import sys
import traceback
from typing import Optional, Dict, List, Tuple

import logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    stream=sys.stdout)

app = Flask(__name__)

def scrape_attendance(username: str, password: str) -> Optional[Dict]:
    logging.info(f"DISPLAY environment variable: {os.environ.get('DISPLAY', 'Not set')}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            slow_mo=100,
            timeout=90000,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-setuid-sandbox',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-client-side-phishing-detection',
                '--disable-component-update',
                '--disable-default-apps',
                '--disable-dev-shm-usage',
                '--disable-domain-reliability',
                '--disable-features=AudioServiceOutOfProcess',
                '--disable-hang-monitor',
                '--disable-ipc-flooding-protection',
                '--disable-notifications',
                '--disable-offer-store-unmasked-wallet-cards',
                '--disable-popup-blocking',
                '--disable-print-preview',
                '--disable-prompt-on-repost',
                '--disable-renderer-backgrounding',
                '--disable-speech-api',
                '--disable-sync',
                '--hide-scrollbars',
                '--ignore-gpu-blacklist',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-default-browser-check',
                '--no-first-run',
                '--no-pings',
                '--no-zygote',
                '--password-store=basic',
                '--use-gl=swiftshader',
                '--use-mock-keychain',
                f'--window-size=1280,720',
            ]
        )
        context = browser.new_context(
            viewport={'width': 1280, 'height': 720},
            ignore_https_errors=True,
            java_script_enabled=True,
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        )
        page = context.new_page()

        try:
            print("\n=== Starting Scraping Process ===")
            print("Navigating to main page...")
            page.goto('http://mitsims.in/', wait_until='domcontentloaded')
            page.wait_for_load_state('networkidle', timeout=10000)

            print("\n=== Clicking Student Link ===")
            page.click('text=Student')
            page.wait_for_load_state('networkidle', timeout=10000)

            print("\n=== Waiting for Login Form ===")
            page.wait_for_selector('#studentForm', timeout=15000)

            print("\n=== Filling Login Form ===")
            try:
                page.fill('#studentForm #inputStuId', username)
                page.fill('#studentForm #inputPassword', password)

                print(f"Username filled: {username}")
                print(f"Password filled: {'*' * len(password)}")
            except Exception as e:
                print(f"Failed to fill form: {str(e)}")
                return None

            print("\n=== Clicking Login Button ===")
            try:
                print("Clicking login button...")
                page.click('#studentForm #studentSubmitButton', force=True)
                print("Login button clicked, waiting for navigation...")

                page.wait_for_load_state('networkidle', timeout=15000)

                print("Waiting for student name to appear...")
                page.wait_for_selector('#studentName', timeout=30000, state='visible')
                print("Login successful!")

                print("Waiting for page to stabilize after login...")
                page.wait_for_load_state('domcontentloaded')
                
            except Exception as e:
                logging.error(f"Login failed: {str(e)}")
                logging.error(f"Current URL: {page.url}")
                logging.error(traceback.format_exc())
                return None

            print("\n=== Getting Student Info ===")
            time.sleep(2)
            try:
                student_name_element = page.query_selector('#studentName')
                if student_name_element:
                    student_name = student_name_element.text_content().strip()
                    print(f"Student name: {student_name}")
                else:
                    print("Student name element not found or not visible.")
                    student_name = "Unknown"
                roll_number = username

                print("\n=== Getting All Course Attendance ===")

                print("Waiting for course fieldsets to load...")
                try:
                    page.wait_for_selector(".x-fieldset", timeout=20000, state='visible')
                    
                    page.wait_for_load_state('networkidle', timeout=10000)

                    fieldsets = page.query_selector_all(".x-fieldset")
                    print(f"Found {len(fieldsets)} fieldsets")

                    if len(fieldsets) == 0:
                        logging.warning("No fieldsets found with primary selector, trying alternatives...")
                        page_content = page.content()
                        logging.info(f"Page content length: {len(page_content)}")
                        logging.info(f"Page URL: {page.url}")

                        fieldsets = page.query_selector_all("fieldset") or page.query_selector_all(".x-panel-body") or []
                        print(f"Found {len(fieldsets)} fieldsets with alternative selector")
                except Exception as e:
                    logging.error(f"Error waiting for fieldsets: {str(e)}")
                    fieldsets = []
                    print("Could not find fieldsets, continuing with empty list")

                courses = []
                percentages = []
                classes_attended = []
                classes_conducted = []

                logging.info(f"Processing {len(fieldsets)} fieldsets")

                if len(fieldsets) == 0:
                    logging.warning("No fieldsets found, trying to reload the page...")
                    try:
                        page.reload(wait_until='networkidle')
                        page.wait_for_load_state('domcontentloaded')
                        
                        fieldsets = page.query_selector_all(".x-fieldset")
                        logging.info(f"After reload: Found {len(fieldsets)} fieldsets")
                    except Exception as e:
                        logging.error(f"Error reloading page: {str(e)}")

                for fieldset in fieldsets:
                    try:
                        if fieldset.query_selector(".x-fieldset-body .x-column-inner .x-field .x-form-display-field span[style*='color:blue']"):
                            continue

                        course_name_element = fieldset.query_selector(".x-fieldset-body .x-column-inner div[id*='displayfield'][style*='width: 150px'] .x-form-display-field span")
                        if not course_name_element:
                            course_name_element = fieldset.query_selector(".x-fieldset-body .x-column-inner div:nth-child(2) .x-form-display-field span")

                        if course_name_element:
                            course_name = course_name_element.text_content().strip()
                            print(f"Found course name: {course_name}")
                        else:
                            print("Could not find course name, skipping fieldset")
                            continue

                        attended_element = fieldset.query_selector(".x-fieldset-body .x-column-inner div[id*='displayfield']:nth-child(3) .x-form-display-field span")
                        if not attended_element:
                            attended_element = fieldset.query_selector(".x-fieldset-body .x-column-inner div[style*='width: 200px']:nth-child(3) .x-form-display-field span")

                        if attended_element:
                            attended_text = attended_element.text_content().strip()
                            attended = ''.join(c for c in attended_text if c.isdigit())
                            print(f"Found classes attended: {attended}")
                        else:
                            print("Could not find classes attended")
                            attended = None

                        conducted_element = fieldset.query_selector(".x-fieldset-body .x-column-inner div[id*='displayfield']:nth-child(4) .x-form-display-field span")
                        if not conducted_element:
                            conducted_element = fieldset.query_selector(".x-fieldset-body .x-column-inner div[style*='width: 200px']:nth-child(4) .x-form-display-field span")

                        if conducted_element:
                            conducted_text = conducted_element.text_content().strip()
                            conducted = ''.join(c for c in conducted_text if c.isdigit())
                            print(f"Found classes conducted: {conducted}")
                        else:
                            print("Could not find classes conducted")
                            conducted = None

                        attendance_element = fieldset.query_selector(".x-fieldset-body .x-column-inner div[id*='displayfield']:nth-child(5) .x-form-display-field span[style*='color']")
                        if not attendance_element:
                            attendance_element = fieldset.query_selector(".x-fieldset-body .x-column-inner div[style*='width: 200px']:nth-child(5) .x-form-display-field span")
                            if not attendance_element:
                                attendance_element = fieldset.query_selector(".x-fieldset-body .x-column-inner div:nth-child(5) .x-form-display-field span")

                        if attendance_element:
                            attendance_text = attendance_element.text_content().strip()
                            attendance = ''.join(c for c in attendance_text if c.isdigit() or c == '.')
                            print(f"Found attendance percentage: {attendance}")
                        else:
                            print("Could not find attendance percentage")
                            attendance = None

                        if course_name and (attendance or (attended and conducted)):
                            print(f"Found course: {course_name}, Attended: {attended}, Conducted: {conducted}, Percentage: {attendance}")
                            courses.append(course_name)

                            if attended and conducted and not attendance:
                                try:
                                    att_percent = (int(attended) / int(conducted)) * 100
                                    attendance = str(round(att_percent, 2))
                                    print(f"Calculated attendance percentage: {attendance}")
                                except (ValueError, ZeroDivisionError) as e:
                                    print(f"Error calculating percentage: {str(e)}")
                                    attendance = "0"

                            try:
                                if attended:
                                    classes_attended.append(int(attended))
                                if conducted:
                                    classes_conducted.append(int(conducted))
                                if attendance:
                                    percentages.append(float(attendance))
                                else:
                                    percentages.append(0.0)
                            except ValueError as e:
                                print(f"Could not convert value to number: {str(e)}")
                    except Exception as e:
                        print(f"Error processing course fieldset: {str(e)}")
                        continue

                if not percentages:
                    logging.warning("No attendance percentages found, trying alternative approach...")
                    try:
                        logging.info("Trying to find attendance data using alternative selectors...")

                        screenshot_path = '/tmp/no_percentages.png'
                        page.screenshot(path=screenshot_path)
                        logging.info(f"Screenshot saved to {screenshot_path}")

                        attendance_elements = page.query_selector_all("span[style*='color:green'], span[style*='color:red']")
                        logging.info(f"Found {len(attendance_elements)} potential attendance elements")

                        for elem in attendance_elements:
                            text = elem.text_content().strip()
                            logging.info(f"Potential attendance element text: {text}")
                            if '%' in text:
                                try:
                                    percentage_text = ''.join(c for c in text if c.isdigit() or c == '.')
                                    if percentage_text:
                                        percentages.append(float(percentage_text))
                                        logging.info(f"Added percentage: {percentage_text}")
                                except ValueError:
                                    pass
                    except Exception as e:
                        logging.error(f"Error in alternative approach: {str(e)}")

                overall_percentage = sum(percentages) / len(percentages) if percentages else 0

                # Filter out TT courses based on name containing "TT"
                non_tt_indices = [i for i, course in enumerate(courses) if "TT" not in course]
                
                courses_no_tt = [courses[i] for i in non_tt_indices] if non_tt_indices else []
                percentages_no_tt = [percentages[i] for i in non_tt_indices] if non_tt_indices and len(percentages) >= len(courses) else []
                
                # Calculate overall attendance without TT courses
                overall_percentage_no_tt = (
                    sum(percentages_no_tt) / len(percentages_no_tt) 
                    if percentages_no_tt 
                    else overall_percentage  # Use the original percentage if no non-TT courses
                )
                
                # Handle classes_attended and classes_conducted for no_tt calculation
                classes_attended_no_tt = [classes_attended[i] for i in non_tt_indices] if non_tt_indices and len(classes_attended) >= len(courses) else []
                classes_conducted_no_tt = [classes_conducted[i] for i in non_tt_indices] if non_tt_indices and len(classes_conducted) >= len(courses) else []

                print("\n=== Attendance Data Summary ===")
                print(f"Student Name: {student_name}")
                print(f"Roll Number: {roll_number}")
                print(f"Total Courses Found: {len(courses)}")
                print(f"Courses: {', '.join(courses)}")
                print(f"Overall Attendance: {round(overall_percentage, 2)}%")
                print(f"Overall Attendance (without TT): {round(overall_percentage_no_tt, 2)}%")

                if len(courses) != len(percentages):
                    print(f"WARNING: Mismatch between courses ({len(courses)}) and percentages ({len(percentages)})")
                if len(courses) != len(classes_attended):
                    print(f"WARNING: Mismatch between courses ({len(courses)}) and classes_attended ({len(classes_attended)})")
                if len(courses) != len(classes_conducted):
                    print(f"WARNING: Mismatch between courses ({len(courses)}) and classes_conducted ({len(classes_conducted)})")

                return {
                    'student_name': student_name,
                    'roll_number': roll_number,
                    'courses': courses,
                    'classes_attended': classes_attended,
                    'classes_conducted': classes_conducted,
                    'percentages': percentages,
                    'overall_percentage': round(overall_percentage, 2),
                    'courses_no_tt': courses_no_tt,
                    'classes_attended_no_tt': classes_attended_no_tt,
                    'classes_conducted_no_tt': classes_conducted_no_tt,
                    'percentages_no_tt': percentages_no_tt,
                    'overall_percentage_no_tt': round(overall_percentage_no_tt, 2)
                }
            except Exception as e:
                print(f"Failed to get attendance info: {str(e)}")
                return None

        except Exception as e:
            logging.error(f"An error occurred during scraping: {str(e)}")
            logging.error(traceback.format_exc())
            return None
        finally:
            browser.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy'}), 200

@app.route('/bunk-calculator')
def bunk_calculator():
    return render_template('bunk_calculator.html')

@app.route('/api/scrape', methods=['POST'])
def scrape():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        logging.warning("API request missing username or password")
        return jsonify({'error': 'Username and password are required'}), 400

    try:
        logging.info(f"Starting scrape for user: {username}")
        result = scrape_attendance(username, password)
        if result:
            logging.info(f"Scrape successful for user: {username}")
            return jsonify(result)
        else:
            logging.error(f"Scrape failed for user: {username}")
            return jsonify({'error': 'Failed to scrape data. Please check credentials or try again later.'}), 400
    except Exception as e:
        logging.error(f"Exception in API endpoint: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=debug_mode)