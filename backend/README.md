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

6. Start the FastAPI backend server:
```bash
uvicorn app.main:app --reload
```

You can also use the compatibility entrypoint:

```bash
python main.py
```

## Project Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── dependencies.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── items.py
│   │   └── users.py
│   └── schemas/
│       ├── __init__.py
│       ├── common.py
│       ├── items.py
│       └── users.py
├── Dockerfile
├── main.py
└── requirements.txt
```

## Docker Setup
1. Install docker desktop from the links provided [Docker Desktop Installation](https://www.docker.com/products/docker-desktop/)

2. Under makefile, there are some commands where you can try to run backend separately
    - docker-build: Allow you to build the docker image name as `backendtest`
    - docker-run-test: Allow you to have a terminal for ease of debugging
    - docker-run: Allow you to execute the specific docker image
