import cloudinary
import cloudinary.uploader
import cloudinary.api
import re

def upload_image(file, folder):
    """
    دالة لرفع صورة إلى Cloudinary.
    :param file: الملف المراد رفعه (من request.files).
    :param folder: المجلد داخل Cloudinary لحفظ الصورة فيه.
    :return: قاموس يحتوي على secure_url و public_id للصورة.
    """
    try:
        upload_result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="image"
        )
        return {
            "secure_url": upload_result.get("secure_url"),
            "public_id": upload_result.get("public_id")
        }
    except Exception as e:
        print(f"Cloudinary upload failed: {e}")
        return None

def delete_image(public_id):
    """
    دالة لحذف صورة من Cloudinary باستخدام public_id.
    """
    try:
        cloudinary.uploader.destroy(public_id)
        return True
    except Exception as e:
        print(f"Cloudinary deletion failed: {e}")
        return False

def extract_public_id_from_url(url):
    """
    دالة لاستخراج public_id من رابط Cloudinary.
    """
    if not url or not isinstance(url, str):
        return None
    
    # Example URL: http://res.cloudinary.com/demo/image/upload/v1572285634/folder/public_id.jpg
    match = re.search(r'upload(?:/v\d+)?/(.+?)(?:\.\w+)?$', url)
    if match:
        return match.group(1)
    return None