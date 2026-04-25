## Setup

1. Clone the repository and navigate to the `backend` folder.

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

5. Configure your `.env` file.

6. Start the FastAPI backend server:

```bash
uvicorn app.main:app --reload
```

You can also use the compatibility entrypoint:

```bash
python main.py
```

## AWS Credentials

Do not paste AWS access keys, secret keys, or session tokens into the codebase. The backend uses boto3's standard credential chain, so local development should use AWS IAM Identity Center SSO.

Configure SSO once:

```bash
aws configure sso
```

Use the values from the AWS Access Portal when prompted:

```text
SSO start URL: https://identitycenter.amazonaws.com/ssoins-82108fefdf1fb1e4
SSO region: ap-southeast-1
Account: 560288546574
Role: finhack_IsbUsersPS
Profile name: finhack_IsbUsersPS-560288546574
```

Before running the backend, log in with SSO:

```bash
aws sso login --profile finhack_IsbUsersPS-560288546574
```

Then set non-secret backend settings in `.env`:

```env
AWS_REGION="ap-southeast-1"
AWS_PROFILE="finhack_IsbUsersPS-560288546574"
AWS_BEDROCK_REGION="ap-southeast-5"
BEDROCK_MODEL_ID="apac.amazon.nova-micro-v1:0"
```

Verify the backend can see your active AWS identity:

```bash
curl http://127.0.0.1:8000/aws/identity
```

Call a Bedrock model without a Bedrock API key:

```bash
curl -X POST http://127.0.0.1:8000/bedrock/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Write one short sentence about Malaysia."}'
```

This uses the AWS SDK with your SSO profile or deployment IAM role. The default model is `apac.amazon.nova-micro-v1:0`, the APAC inference profile for Amazon Nova Micro, a low-cost text model suitable for simple prompts.

For deployed environments, prefer an attached IAM role, task role, or workload identity instead of local SSO profiles.

## Project Structure

```text
backend/
|-- app/
|   |-- __init__.py
|   |-- main.py
|   |-- core/
|   |   |-- __init__.py
|   |   `-- config.py
|   |-- routers/
|   |   |-- __init__.py
|   |   |-- aws.py
|   |   |-- bedrock.py
|   |-- schemas/
|   |   |-- __init__.py
|   |   |-- aws.py
|   |   `-- bedrock.py
|   `-- services/
|       |-- __init__.py
|       |-- bedrock.py
|       `-- aws.py
|-- Dockerfile
|-- main.py
`-- requirements.txt
```

## Docker Setup

1. Install Docker Desktop from [Docker Desktop Installation](https://www.docker.com/products/docker-desktop/).

2. Under `makefile`, there are commands where you can run the backend separately:

- `docker-build`: Build the docker image as `backendtest`.
- `docker-run-test`: Open a terminal for debugging.
- `docker-run`: Run the docker image.
