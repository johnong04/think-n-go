## Setup

1. Clone the repository and navigate directory to `backend` folder

2. Create and activate a virtual environment:
```bash
python3 -m venv venv
# On Windows
.\venv\Scripts\activate
# On Unix/MacOS
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables by copying `.env.example` to `.env`:
```bash
cp .env.example .env
```

5. Configure your `.env` file

6. Activate FastAPI backend server:
```bash
python main.py
```

## Docker Setup
1. Install docker desktop from the links provided [Docker Desktop Installation](https://www.docker.com/products/docker-desktop/)

2. Under makefile, there are some commands where you can try to run backend seperately
    - docker-build: Allow you to build the docker image name as `backendtest`
    - docker-run-test: Allow you to have a terminal for ease of debugging
    - docker-run: Allow you to execute the specific docker image
