from pydantic import BaseModel


class AwsIdentity(BaseModel):
    account: str
    arn: str
    user_id: str
    region: str
    profile: str | None = None
