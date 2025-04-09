document.addEventListener('DOMContentLoaded', function() {
    const totalClassesInput = document.getElementById('totalClasses');
    const attendedClassesInput = document.getElementById('attendedClasses');
    const currentPercentageDisplay = document.getElementById('currentPercentage');
    const desiredPercentageInput = document.getElementById('desiredPercentage');
    const classesPerWeekInput = document.getElementById('classesPerWeek');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resultCurrentPercentage = document.getElementById('resultCurrentPercentage');
    const resultMaxBunk = document.getElementById('resultMaxBunk');
    const warningMessage = document.getElementById('warningMessage');

    // Set default values
    desiredPercentageInput.value = 75;

    // Calculate current percentage when inputs change
    totalClassesInput.addEventListener('input', updateCurrentPercentage);
    attendedClassesInput.addEventListener('input', updateCurrentPercentage);

    // Calculate button click handler
    calculateBtn.addEventListener('click', calculateBunkableClasses);

    // Update current percentage based on inputs
    function updateCurrentPercentage() {
        const totalClasses = parseInt(totalClassesInput.value) || 0;
        const attendedClasses = parseInt(attendedClassesInput.value) || 0;

        if (totalClasses > 0 && attendedClasses <= totalClasses) {
            const currentPercentage = (attendedClasses / totalClasses) * 100;
            currentPercentageDisplay.textContent = currentPercentage.toFixed(2);
        } else {
            currentPercentageDisplay.textContent = '0';
        }
    }

    // Calculate maximum bunkable classes
    function calculateBunkableClasses() {
        // Get input values
        const totalClasses = parseInt(totalClassesInput.value);
        const attendedClasses = parseInt(attendedClassesInput.value);
        const desiredPercentage = parseInt(desiredPercentageInput.value);
        const classesPerWeek = parseInt(classesPerWeekInput.value);

        // Validate inputs
        if (!totalClasses || !attendedClasses || !desiredPercentage || !classesPerWeek) {
            alert('Please fill in all fields with valid numbers');
            return;
        }

        if (attendedClasses > totalClasses) {
            alert('Attended classes cannot be more than total classes');
            return;
        }

        // Calculate current percentage
        const currentPercentage = (attendedClasses / totalClasses) * 100;

        // Calculate maximum bunkable classes
        // Formula: Bmax = Floor(A + W - (D/100) * (T + W))
        const maxBunk = Math.floor(attendedClasses + classesPerWeek - (desiredPercentage / 100) * (totalClasses + classesPerWeek));

        // Display results
        resultCurrentPercentage.textContent = currentPercentage.toFixed(2) + '%';

        if (maxBunk < 0) {
            resultMaxBunk.textContent = '0';
            warningMessage.textContent = `You can't bunk any classes this week! You need to attend all classes to maintain ${desiredPercentage}% attendance.`;
            warningMessage.className = 'warning-message risky';
        } else {
            resultMaxBunk.textContent = maxBunk;

            if (maxBunk === 0) {
                warningMessage.textContent = `You can't bunk any classes this week if you want to maintain ${desiredPercentage}% attendance.`;
                warningMessage.className = 'warning-message risky';
            } else if (maxBunk < classesPerWeek / 2) {
                warningMessage.textContent = `Bunking more than ${maxBunk} classes will drop you below ${desiredPercentage}% attendance.`;
                warningMessage.className = 'warning-message risky';
            } else {
                warningMessage.textContent = `You can safely bunk up to ${maxBunk} classes this week while maintaining ${desiredPercentage}% attendance.`;
                warningMessage.className = 'warning-message safe';
            }
        }

        warningMessage.style.display = 'block';
        resultContainer.style.display = 'block';

        // Scroll to results
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Initialize tooltips
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => {
        tooltip.addEventListener('mouseenter', () => {
            const tooltipText = tooltip.querySelector('.tooltip-text');
            tooltipText.style.visibility = 'visible';
            tooltipText.style.opacity = '1';
        });

        tooltip.addEventListener('mouseleave', () => {
            const tooltipText = tooltip.querySelector('.tooltip-text');
            tooltipText.style.visibility = 'hidden';
            tooltipText.style.opacity = '0';
        });
    });
});
