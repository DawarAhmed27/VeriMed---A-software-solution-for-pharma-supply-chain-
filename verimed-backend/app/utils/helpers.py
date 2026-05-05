import qrcode
import qrcode.image.pil
from io import BytesIO
import base64
from config import Config
from datetime import datetime
import secrets

def generate_qr_code(data):
    """Generate QR code using Pillow backend and return as base64 PNG string"""
    try:
        # box_size is pixels-per-module; keep it reasonable (10 is standard)
        # Config.QR_CODE_SIZE might be 300 (total px intent) — use 10 as safe default
        box_size = min(Config.QR_CODE_SIZE, 20) if Config.QR_CODE_SIZE <= 20 else 10

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=box_size,
            border=Config.QR_CODE_BORDER,
        )
        qr.add_data(data)
        qr.make(fit=True)

        # Explicitly use Pillow image factory so .save(format='PNG') works
        img = qr.make_image(
            image_factory=qrcode.image.pil.PilImage,
            fill_color="black",
            back_color="white"
        )

        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return qr_code_base64
    except Exception as e:
        print(f"Error generating QR code: {e}")
        return None

def generate_batch_id():
    """Generate a unique batch ID"""
    now = datetime.now()
    timestamp = now.strftime('%Y%m%d%H%M%S')
    suffix = secrets.token_hex(2).upper()
    return f"BT-{timestamp}-{suffix}"

def generate_qr_data(batch_id, medicine_name, manufacturer_name, expiry_date):
    """Generate QR data string - only batch ID for maximum compatibility"""
    return batch_id

def validate_email(email):
    """Validate email format"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 6:
        return False, "Password must be at least 6 characters"
    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"
