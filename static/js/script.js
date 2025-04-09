document.addEventListener('DOMContentLoaded', function() {
    // Initialize password toggle
    const togglePasswordBtn = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle the eye icon
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Form submission with animated progress steps
    const loginForm = document.getElementById('loginForm');
    const progressContainer = document.getElementById('progressContainer');
    const submitBtn = document.getElementById('submitBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (!username || !password) {
                showError('Please provide both username and password');
                return;
            }

            // Disable submit button
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

            // Hide form and show progress
            loginForm.style.display = 'none';
            progressContainer.style.display = 'block';

            // Start progress animation
            simulateProgress();

            try {
                // Make API request
                const response = await fetch('/api/scrape', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }

                // Complete the progress animation
                completeProgress();

                // Show results page
                showResults(data);
            } catch (error) {
                console.error('API Error:', error);

                // Reset progress
                stopProgress();

                // Reset form
                loginForm.reset();
                submitBtn.disabled = false;
                submitBtn.textContent = 'Get Attendance';

                // Show error message
                showError(error.message || 'Failed to fetch data. Please try again.');
            }
        });
    }

    function showResults(data) {
        // Remove any existing error messages
        const errorContainer = document.querySelector('.error-message');
        if (errorContainer) {
            errorContainer.remove();
        }

        // Create results card if it doesn't exist
        let resultsCard = document.querySelector('.result-card');
        if (!resultsCard) {
            resultsCard = document.createElement('div');
            resultsCard.className = 'card result-card';

            // Create student info section
            const studentInfo = document.createElement('div');
            studentInfo.className = 'student-info';
            studentInfo.innerHTML = `
                <h2>${data.student_name}</h2>
                <p>Roll Number: <span class="highlight">${data.roll_number}</span></p>
            `;

            // Create course list section
            const courseList = document.createElement('div');
            courseList.className = 'course-list';

            // Filter out "SUBJECT CODE" entries and remove undefined values
            const filteredCourses = data.courses.filter((course, index) => {
                return !course.includes('SUBJECT CODE') && data.percentages[index] !== undefined;
            });

            const filteredPercentages = data.percentages.filter((percentage, index) => {
                return !data.courses[index].includes('SUBJECT CODE') && percentage !== undefined;
            });

            // Filter classes_attended and classes_conducted to match filtered courses
            const filteredAttended = data.classes_attended ? data.classes_attended.filter((_, index) => {
                return !data.courses[index].includes('SUBJECT CODE') && data.percentages[index] !== undefined;
            }) : [];

            const filteredConducted = data.classes_conducted ? data.classes_conducted.filter((_, index) => {
                return !data.courses[index].includes('SUBJECT CODE') && data.percentages[index] !== undefined;
            }) : [];

            courseList.innerHTML = `
                <h3><i class="fas fa-graduation-cap"></i> Course Attendance</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Course Name</th>
                            <th>Percentage</th>
                            <th>Attended</th>
                            <th>Conducted</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredCourses.map((course, index) => `
                            <tr>
                                <td>${course}</td>
                                <td class="attendance">${filteredPercentages[index]}%</td>
                                <td>${filteredAttended[index] !== undefined ? filteredAttended[index] : 'N/A'}</td>
                                <td>${filteredConducted[index] !== undefined ? filteredConducted[index] : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            // Create summary section
            const summary = document.createElement('div');
            summary.className = 'summary';
            
            // Check if TT classes exist by checking for TT-specific properties
            const hasTTClasses = data.hasOwnProperty('overall_percentage_no_tt') && 
                               data.hasOwnProperty('classes_attended_no_tt') && 
                               data.hasOwnProperty('classes_conducted_no_tt');
            
            // Sum up attended and conducted classes
            const totalAttended = data.classes_attended ? 
                data.classes_attended.reduce((sum, val) => sum + (val || 0), 0) : 'N/A';
            const totalConducted = data.classes_conducted ? 
                data.classes_conducted.reduce((sum, val) => sum + (val || 0), 0) : 'N/A';
            
            // Calculate non-TT sums if they exist
            const totalAttendedNoTT = data.classes_attended_no_tt ? 
                data.classes_attended_no_tt.reduce((sum, val) => sum + (val || 0), 0) : 'N/A';
            const totalConductedNoTT = data.classes_conducted_no_tt ? 
                data.classes_conducted_no_tt.reduce((sum, val) => sum + (val || 0), 0) : 'N/A';
                
            // Create the summary HTML based on whether TT data exists
            let summaryHTML = `
                <h3><i class="fas fa-chart-pie"></i> Attendance Summary</h3>
                <table>
                    <tbody>
                        <tr>
                            <td>Overall Attendance</td>
                            <td class="attendance" id="finalPercentage">${data.overall_percentage}%</td>
                        </tr>
                        <tr>
                            <td>Total Classes Attended</td>
                            <td class="attendance">${totalAttended}</td>
                        </tr>
                        <tr>
                            <td>Total Classes Conducted</td>
                            <td class="attendance">${totalConducted}</td>
                        </tr>`;
                        
            // Add TT-specific information if it exists
            if (hasTTClasses) {
                summaryHTML += `
                        <tr class="separator"><td colspan="2"></td></tr>
                        <tr class="section-header">
                            <td colspan="2"><i class="fas fa-minus-circle"></i> Without TT Classes</td>
                        </tr>
                        <tr>
                            <td>Attendance (without TT)</td>
                            <td class="attendance">${data.overall_percentage_no_tt}%</td>
                        </tr>
                        <tr>
                            <td>Total Attended (without TT)</td>
                            <td class="attendance">${totalAttendedNoTT}</td>
                        </tr>
                        <tr>
                            <td>Total Conducted (without TT)</td>
                            <td class="attendance">${totalConductedNoTT}</td>
                        </tr>`;
            }
            
            summaryHTML += `
                    </tbody>
                </table>
            `;
            
            summary.innerHTML = summaryHTML;

            // Add all sections to results card
            resultsCard.appendChild(studentInfo);
            resultsCard.appendChild(courseList);
            resultsCard.appendChild(summary);

            // Add check another student button
            const buttonCard = document.createElement('div');
            buttonCard.className = 'card';
            buttonCard.innerHTML = `
                <button onclick="window.location.href='/'">Check Another Student</button>
            `;

            // Add cards to container
            const container = document.querySelector('.container');
            const loginCard = document.querySelector('.card:not(.result-card)');
            loginCard.style.display = 'none';
            container.insertBefore(resultsCard, loginCard.nextSibling);
            container.insertBefore(buttonCard, resultsCard.nextSibling);

            // Apply animations
            resultsCard.style.display = 'block';
            resultsCard.style.opacity = '0';
            setTimeout(() => {
                resultsCard.style.opacity = '1';
                resultsCard.classList.add('reveal');
            }, 100);

            // Add attendance color coding
            const attendanceElements = resultsCard.querySelectorAll('.attendance');
            attendanceElements.forEach(element => {
                const valueText = element.textContent;
                if (valueText.includes('%')) {
                    const value = parseFloat(valueText);
                    if (value >= 75) {
                        element.classList.add('high');
                    } else if (value >= 60) {
                        element.classList.add('medium');
                    } else {
                        element.classList.add('low');
                    }
                }
            });

            // Add table row animations
            const tableRows = resultsCard.querySelectorAll('tbody tr');
            tableRows.forEach((row, index) => {
                row.style.opacity = '0';
                row.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    row.style.opacity = '1';
                    row.style.transform = 'translateY(0)';
                }, 200 + (index * 100));
            });
        }
    }

    function simulateProgress() {
        const steps = document.querySelectorAll('.progress-step');
        let currentStep = 0;

        // Initial state - first step active
        steps[currentStep].classList.add('active');

        // Simulate progress through steps
        const timings = [2000, 3000, 4000, 5000, 6000]; // Increased timing for each step
        const progressInterval = setInterval(() => {
            if (currentStep < steps.length - 1) {
                // Complete current step
                steps[currentStep].classList.remove('active');
                steps[currentStep].classList.add('done');

                // Move to next step
                currentStep++;
                steps[currentStep].classList.add('active');

                // Adjust timing based on step
                setTimeout(() => {
                    const text = steps[currentStep].querySelector('.text');
                    text.classList.remove('typing');
                    text.textContent = text.textContent + ' ✓';
                }, 1000); // Add checkmark after 1 second
            } else {
                clearInterval(progressInterval);
            }
        }, timings[currentStep]);
    }

    function stopProgress() {
        // Reset progress steps
        const steps = document.querySelectorAll('.progress-step');
        steps.forEach(step => {
            step.classList.remove('active', 'done');
            const text = step.querySelector('.text');
            text.classList.remove('typing');
            text.textContent = text.textContent.replace(' ✓', '');
        });

        // Show form again
        const loginCard = document.querySelector('.card:not(.result-card)');
        loginCard.style.display = 'block';
        progressContainer.style.display = 'none';
        submitBtn.disabled = false;
    }

    function showError(message) {
        // Reset progress
        stopProgress();
        
        // Create error message if it doesn't exist
        let errorContainer = document.querySelector('.error-message');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'error-message';
            const loginCard = document.querySelector('.card:not(.result-card)');
            loginCard.insertBefore(errorContainer, loginForm);
        }

        // Show login form again
        if (loginForm) {
            loginForm.style.display = 'flex';
        }

        const paragraph = document.createElement('p');
        paragraph.textContent = message;
        errorContainer.innerHTML = '';
        errorContainer.appendChild(paragraph);
        
        // Add shake animation
        errorContainer.classList.add('shake');
        setTimeout(() => {
            errorContainer.classList.remove('shake');
        }, 500);
    }

    function completeProgress() {
        const steps = document.querySelectorAll('.progress-step');

        // Mark all steps as done
        steps.forEach(step => {
            step.classList.remove('active');
            step.classList.add('done');

            const text = step.querySelector('.text');
            text.classList.remove('typing');
            
            if (!text.textContent.includes('✓')) {
                text.textContent = text.textContent + ' ✓';
            }
        });

        const completionMessage = document.createElement('div');
        completionMessage.className = 'progress-step done completion-step';
        completionMessage.innerHTML = '<div class="pulse success"></div><div class="text">All done! Loading results...</div>';
        progressContainer.appendChild(completionMessage);
        
        // Add fade out animation after a delay
        setTimeout(() => {
            progressContainer.classList.add('fade-out');
        }, 1500);
    }
});