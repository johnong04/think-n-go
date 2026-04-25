"""Alibaba Cloud Service integrations"""

import os
import oss2
from typing import Any, Dict, List
from oss2.auth import ProviderAuthV4
from oss2.credentials import EnvironmentVariableCredentialsProvider


class AlibabsOSSService:
    """Alibaba Cloud OSS Service wrapper"""

    def __init__(self):
        self.endpoint = os.getenv(
            "OSS_ENDPOINT", "oss-ap-southeast-1.aliyuncs.com")
        self.bucket_name = os.getenv("OSS_BUCKET", "think-n-go-bucket")
        self.auth = ProviderAuthV4(EnvironmentVariableCredentialsProvider())
        self.bucket = oss2.Bucket(
            self.auth, f"http://{self.endpoint}", self.bucket_name)

    async def upload_file(self, file_path: str, object_name: str) -> Dict[str, Any]:
        """Upload a file to OSS"""
        try:
            with open(file_path, "rb") as f:
                self.bucket.put_object(object_name, f)
            return {
                "status": "success",
                "url": f"https://{self.bucket_name}.{self.endpoint}/{object_name}",
                "object_name": object_name,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "object_name": object_name,
            }

    async def list_files(self, prefix: str = "") -> Dict[str, Any]:
        """List files in OSS bucket"""
        try:
            files = []
            for obj in oss2.ObjectIterator(self.bucket, prefix=prefix):
                files.append({
                    "name": obj.key,
                    "size": obj.size,
                    "last_modified": str(obj.last_modified),
                })
            return {
                "status": "success",
                "bucket": self.bucket_name,
                "prefix": prefix,
                "count": len(files),
                "files": files,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
            }

    async def delete_file(self, object_name: str) -> Dict[str, Any]:
        """Delete a file from OSS"""
        try:
            self.bucket.delete_object(object_name)
            return {
                "status": "success",
                "message": f"Deleted {object_name}",
                "object_name": object_name,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "object_name": object_name,
            }


class AlibabaSMSService:
    """Alibaba Cloud SMS Service wrapper"""

    def __init__(self):
        self.access_key = os.getenv("ALIYUN_ACCESS_KEY_ID", "")
        self.access_secret = os.getenv("ALIYUN_ACCESS_KEY_SECRET", "")
        self.region_id = "ap-southeast-1"

    async def send_sms(self, phone_number: str, template_id: str, params: Dict[str, str]) -> Dict[str, Any]:
        """Send SMS message"""
        # Placeholder implementation
        return {
            "status": "success",
            "message": f"SMS sent to {phone_number}",
            "phone_number": phone_number,
        }


# Dependency injection
def get_oss_service() -> AlibabsOSSService:
    """Get OSS service instance"""
    return AlibabsOSSService()


def get_sms_service() -> AlibabaSMSService:
    """Get SMS service instance"""
    return AlibabaSMSService()
