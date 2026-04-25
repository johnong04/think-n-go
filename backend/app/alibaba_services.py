"""Alibaba Cloud services integration module."""

import oss2
from oss2.credentials import EnvironmentVariableCredentialsProvider

from app.config import settings


class AlibabsOSSService:
    """Alibaba Cloud Object Storage Service (OSS)."""

    def __init__(self):
        if not settings.alibaba_oss_bucket or not settings.alibaba_oss_endpoint:
            raise ValueError(
                "Alibaba OSS is not configured. Set ALIBABA_OSS_BUCKET and ALIBABA_OSS_ENDPOINT in backend/.env."
            )

        auth = oss2.ProviderAuthV4(EnvironmentVariableCredentialsProvider())

        bucket_name = settings.alibaba_oss_bucket
        endpoint_raw = settings.alibaba_oss_endpoint
        region = settings.alibaba_region or "ap-southeast-3"

        if endpoint_raw.startswith("https://"):
            endpoint_domain = endpoint_raw[8:]
        elif endpoint_raw.startswith("http://"):
            endpoint_domain = endpoint_raw[7:]
        else:
            endpoint_domain = endpoint_raw

        if endpoint_domain.startswith(f"{bucket_name}."):
            endpoint_domain = endpoint_domain[len(bucket_name) + 1 :]

        endpoint_domain = endpoint_domain.rstrip("/")
        protocol = "https://" if not endpoint_raw.startswith("http://") else "http://"
        endpoint = f"{protocol}{endpoint_domain}"

        self.bucket = oss2.Bucket(
            auth,
            endpoint,
            bucket_name,
            region=region,
        )

    async def upload_file(self, file_path: str, object_name: str) -> dict:
        try:
            self.bucket.put_object_from_file(object_name, file_path)
            url = (
                f"https://{settings.alibaba_oss_bucket}."
                f"{settings.alibaba_oss_endpoint}/{object_name}"
            )
            return {
                "status": "success",
                "url": url,
                "object_name": object_name,
            }
        except Exception as exc:
            return {
                "status": "error",
                "error": str(exc),
            }

    async def list_files(self, prefix: str = "") -> dict:
        try:
            result = oss2.ObjectIterator(self.bucket, prefix=prefix)
            files = [obj.key for obj in result]
            return {
                "status": "success",
                "files": files,
                "count": len(files),
            }
        except Exception as exc:
            return {
                "status": "error",
                "error": str(exc),
            }

    async def delete_file(self, object_name: str) -> dict:
        try:
            self.bucket.delete_object(object_name)
            return {
                "status": "success",
                "message": f"File {object_name} deleted",
            }
        except Exception as exc:
            return {
                "status": "error",
                "error": str(exc),
            }


_oss_service: AlibabsOSSService | None = None


def get_oss_service() -> AlibabsOSSService:
    global _oss_service
    if _oss_service is None:
        _oss_service = AlibabsOSSService()
    return _oss_service
