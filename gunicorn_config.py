import os

# Gunicorn config variables
workers = 1
threads = 8
timeout = 0
bind = f"0.0.0.0:{os.getenv('PORT', '8080')}"
worker_class = 'gthread'
keepalive = 120
