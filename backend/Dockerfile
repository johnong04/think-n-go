FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    pkg-config \
  && rm -rf /var/lib/apt/lists/*

# Set the working directory for your backend code
WORKDIR /backend

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend source code
COPY . .

# (Optional) Copy your environment file if you want it in the image
# COPY .env .env

# Expose port 8000 (or whichever port your FastAPI app uses)
EXPOSE 8000

# Command to run your FastAPI application.
# CMD ["python", "main.py"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
