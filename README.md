# Attendance Tracker

A web application to track college attendance.

## Deployment on Render

This project is configured for easy deployment on Render using Docker.

### Deployment Steps

1. Create a new account on [Render](https://render.com/) if you don't have one.
2. Click on the "New +" button and select "Blueprint" from the dropdown menu.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` file and configure the service.
5. Click "Apply" to start the deployment process.

### Manual Deployment

If you prefer to deploy manually:

1. Create a new Web Service on Render.
2. Select "Docker" as the environment.
3. Connect your GitHub repository.
4. Set the following:
   - Name: attendance-tracker (or your preferred name)
   - Environment: Docker
   - Branch: main (or your default branch)
   - Root Directory: (leave empty)
   - Docker Command: (leave empty, it's specified in the Dockerfile)
5. Click "Create Web Service" to deploy.

## Local Development with Docker

To run the application locally using Docker:

```bash
# Build the Docker image
docker build -t attendance-tracker .

# Run the container
docker run -p 8080:8080 attendance-tracker
```

Then visit `http://localhost:8080` in your browser.
