FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

WORKDIR /app

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright is already installed in the base image

# Copy application code (except start.sh which we'll copy later)
COPY app.py requirements.txt gunicorn_config.py ./
COPY static/ ./static/
COPY templates/ ./templates/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
# Xvfb display settings
ENV DISPLAY=:99
# Increase timeouts for network operations
ENV PLAYWRIGHT_TIMEOUT=120000

# Expose the port the app runs on
EXPOSE 8080

# Create a non-root user to run the application
RUN groupadd -r playwright && useradd -r -g playwright -G audio,video playwright \
    && mkdir -p /home/playwright && chown -R playwright:playwright /home/playwright

# Give appropriate permissions to the app directory
RUN chown -R playwright:playwright /app

# Switch to non-root user
USER playwright

# Switch back to root to copy and set permissions for the startup script
USER root

# Copy and make the startup script executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh && \
    chown playwright:playwright /app/start.sh

# Switch back to non-root user
USER playwright

# Command to run the application with Xvfb
CMD ["/app/start.sh"]
