"""Alibaba Cloud services integration module"""

import os
import oss2
from oss2.credentials import EnvironmentVariableCredentialsProvider
from datetime import datetime
from urllib.parse import quote
from app.config import settings


class AlibabsOSSService:
    """Alibaba Cloud Object Storage Service (OSS)

    Uses ProviderAuthV4 with correct OSS_* environment variable names
    """

    def __init__(self):
        # Use ProviderAuthV4 with EnvironmentVariableCredentialsProvider for STS tokens
        # Note: EnvironmentVariableCredentialsProvider looks for OSS_* prefix, not ALIYUN_*
        auth = oss2.ProviderAuthV4(EnvironmentVariableCredentialsProvider())

        bucket_name = settings.alibaba_oss_bucket
        endpoint_raw = settings.alibaba_oss_endpoint
        region = settings.alibaba_region or "ap-southeast-3"

        # Clean endpoint: remove bucket name prefix (virtual-hosted-style) and trailing slash
        # Input:  https://test-tngo.oss-ap-southeast-3.aliyuncs.com/
        # Output: https://oss-ap-southeast-3.aliyuncs.com
        if endpoint_raw.startswith('https://'):
            endpoint_domain = endpoint_raw[8:]  # Remove 'https://'
        elif endpoint_raw.startswith('http://'):
            endpoint_domain = endpoint_raw[7:]   # Remove 'http://'
        else:
            endpoint_domain = endpoint_raw

        # Remove bucket name prefix if present (virtual-hosted-style)
        if endpoint_domain.startswith(f"{bucket_name}."):
            endpoint_domain = endpoint_domain[len(bucket_name) + 1:]

        # Remove trailing slash
        endpoint_domain = endpoint_domain.rstrip('/')

        # Determine protocol
        protocol = "https://" if not endpoint_raw.startswith(
            'http://') else "http://"
        endpoint = f"{protocol}{endpoint_domain}"

        self.bucket = oss2.Bucket(
            auth,
            endpoint,
            bucket_name,
            region=region
        )

    async def upload_file(self, file_path: str, object_name: str) -> dict:
        """
        Upload file to OSS

        Args:
            file_path: Local file path
            object_name: Object name in OSS bucket

        Returns:
            Upload result
        """
        try:
            self.bucket.put_object_from_file(object_name, file_path)
            url = f"https://{settings.alibaba_oss_bucket}.{settings.alibaba_oss_endpoint}/{object_name}"
            return {
                'status': 'success',
                'url': url,
                'object_name': object_name,
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
            }

    async def download_file(self, object_name: str, file_path: str) -> dict:
        """
        Download file from OSS

        Args:
            object_name: Object name in OSS bucket
            file_path: Local file path to save

        Returns:
            Download result
        """
        try:
            self.bucket.get_object_to_file(object_name, file_path)
            return {
                'status': 'success',
                'message': f"File downloaded to {file_path}",
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
            }

    async def delete_file(self, object_name: str) -> dict:
        """
        Delete file from OSS

        Args:
            object_name: Object name in OSS bucket

        Returns:
            Delete result
        """
        try:
            self.bucket.delete_object(object_name)
            return {
                'status': 'success',
                'message': f"File {object_name} deleted",
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
            }

    async def list_files(self, prefix: str = "") -> dict:
        """
        List files in OSS bucket

        Args:
            prefix: Prefix to filter objects

        Returns:
            List of objects
        """
        try:
            result = oss2.ObjectIterator(self.bucket, prefix=prefix)
            files = [obj.key for obj in result]
            return {
                'status': 'success',
                'files': files,
                'count': len(files),
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
            }


# Singleton instances
oss_service = None

def get_oss_service() -> AlibabsOSSService:
    """Get OSS service instance"""
    global oss_service
    if oss_service is None:
        oss_service = AlibabsOSSService()
    return oss_service
