from flask import Blueprint, request, jsonify
from app.models import MedicineBatch, Medicine, User, BatchHistory, QRVerification, Analytics
from app.auth import token_required, role_required, verify_token
from app.utils.helpers import generate_batch_id, generate_qr_data, generate_qr_code
from datetime import datetime
from app.database import execute_query, execute_update

batch_bp = Blueprint('batch', __name__, url_prefix='/api/batches')


def _verify_batch(batch_id_str, verified_by_user=None, verified_by_role='consumer'):
    batch = MedicineBatch.get_batch_by_batch_id(batch_id_str)

    if not batch:
        return jsonify({'message': 'Batch not found', 'success': False, 'is_authentic': False}), 404

    is_expired = MedicineBatch.check_expiry_date(batch['id'])
    is_recalled = batch['batch_status'] == 'recalled'
    is_authentic = not is_expired and not is_recalled and batch['batch_status'] == 'active'
    
    if is_recalled:
        verification_status = 'recalled'
    elif is_expired:
        verification_status = 'expired'
    elif is_authentic:
        verification_status = 'valid'
    else:
        verification_status = 'counterfeit'

    # Log verification — don't let a logging error break the response
    try:
        QRVerification.log_verification(
            batch['id'],
            verified_by_user,
            verified_by_role,
            is_authentic,
            verification_status,
            {
                'manufacturing_date': str(batch['manufacturing_date']),
                'expiry_date': str(batch['expiry_date']),
                'medicine_name': batch['medicine_name']
            }
        )
        if verified_by_user and verified_by_role in ['manufacturer', 'retailer', 'customer']:
            Analytics.record_metric(verified_by_user, verified_by_role, 'batches_verified', 1)
    except Exception as log_err:
        print(f"[verify] logging error (non-fatal): {log_err}")

    # Fetch dispatched retailer info — LEFT JOIN so NULL retailer_id doesn't crash
    try:
        dispatch_info = execute_query(
            """
            SELECT d.retailer_name, d.retailer_contact, d.retailer_location, d.retailer_website,
                   u.company_name  AS retailer_company,
                   u.city          AS retailer_city,
                   u.contact_phone AS retailer_phone,
                   u.address       AS retailer_address
            FROM deliveries d
            LEFT JOIN users u ON d.retailer_id = u.id
            WHERE d.batch_id = %s AND d.delivery_status != 'cancelled'
            ORDER BY d.created_at DESC
            LIMIT 1
            """,
            (batch['id'],),
            fetch_one=True
        )
    except Exception as e:
        print(f"[verify] dispatch_info query error (non-fatal): {e}")
        dispatch_info = None

    response = {
        'message': 'Batch verified successfully' if is_authentic else f'Batch is {verification_status}',
        'success': is_authentic,
        'is_authentic': is_authentic,
        'verification_status': verification_status,
        'batch_info': {
            'batch_id': batch['batch_id'],
            'medicine_name': batch['medicine_name'],
            'manufacturer': batch.get('company_name', ''),
            'manufacturing_date': str(batch['manufacturing_date']) if batch['manufacturing_date'] else '',
            'expiry_date': str(batch['expiry_date']) if batch['expiry_date'] else '',
            'quantity': batch.get('quantity', 0),
            'is_expired': is_expired,
            'is_recalled': is_recalled
        }
    }

    if dispatch_info:
        response['retailer_info'] = {
            'company_name': dispatch_info.get('retailer_company') or dispatch_info.get('retailer_name'),
            'contact_phone': dispatch_info.get('retailer_contact') or dispatch_info.get('retailer_phone'),
            'location': dispatch_info.get('retailer_location') or dispatch_info.get('retailer_city'),
            'address': dispatch_info.get('retailer_address'),
            'website_url': dispatch_info.get('retailer_website'),
        }

    return jsonify(response), 200

@batch_bp.route('', methods=['POST'])
@token_required
@role_required('manufacturer')
def create_batch():
    """Create a new medicine batch"""
    data = request.get_json()
    
    required_fields = ['medicine_id', 'quantity', 'manufacturing_date', 'expiry_date', 'serial_number', 'lot_number']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing required fields'}), 400
    
    # Verify medicine exists
    medicine = Medicine.get_medicine_by_id(data['medicine_id'])
    if not medicine:
        return jsonify({'message': 'Medicine not found'}), 404
    
    # Get manufacturer info
    manufacturer = User.get_user_by_id(request.user_id)

    # Generate batch ID and retry if a rare collision happens
    last_error = None
    for _ in range(5):
        batch_id = generate_batch_id()

        existing = execute_query("SELECT id FROM medicine_batches WHERE batch_id = %s", (batch_id,), fetch_one=True)
        if existing:
            continue

        # Generate QR data and QR code
        qr_data = generate_qr_data(
            batch_id,
            medicine['medicine_name'],
            manufacturer['company_name'],
            data['expiry_date']
        )
        qr_code_base64 = generate_qr_code(qr_data)

        if not qr_code_base64:
            return jsonify({'message': 'Failed to generate QR code'}), 500

        # Create batch
        if MedicineBatch.create_batch(
            batch_id,
            data['medicine_id'],
            request.user_id,
            data['quantity'],
            data['manufacturing_date'],
            data['expiry_date'],
            qr_data,
            qr_code_base64,
            data['serial_number'],
            data['lot_number']
        ):
            # Log to batch history
            batch = MedicineBatch.get_batch_by_batch_id(batch_id)
            BatchHistory.log_event(
                batch['id'],
                'created',
                manufacturer['company_name'],
                request.user_id,
                'manufacturer'
            )

            # Record analytics
            Analytics.record_metric(request.user_id, 'manufacturer', 'batches_created', 1)

            return jsonify({
                'message': 'Batch created successfully',
                'batch': {
                    'id': batch['id'],
                    'batch_id': batch['batch_id'],
                    'medicine_name': batch['medicine_name'],
                    'quantity': batch['quantity'],
                    'expiry_date': batch['expiry_date'],
                    'qr_code_base64': batch['qr_code_base64'],
                    'serial_number': batch['serial_number'],
                    'lot_number': batch['lot_number']
                }
            }), 201

        last_error = 'Failed to create batch'

    return jsonify({'message': last_error or 'Failed to create batch'}), 500

@batch_bp.route('', methods=['GET'])
@token_required
def get_batches():
    """Get batches (all for admin, manufacturer-specific for manufacturer)"""
    if request.role == 'manufacturer':
        batches = MedicineBatch.get_batches_by_manufacturer(request.user_id)
    else:
        return jsonify({'message': 'Access denied'}), 403
    
    return jsonify({
        'batches': batches,
        'count': len(batches) if batches else 0
    }), 200

@batch_bp.route('/<batch_id_str>', methods=['GET'])
@token_required
def get_batch(batch_id_str):
    """Get specific batch by batch_id"""
    batch = MedicineBatch.get_batch_by_batch_id(batch_id_str)
    
    if not batch:
        return jsonify({'message': 'Batch not found'}), 404
    
    # Get batch history
    history = BatchHistory.get_batch_history(batch['id'])
    
    # Get verification history
    verifications = QRVerification.get_verification_history(batch['id'])
    
    return jsonify({
        'batch': {
            'id': batch['id'],
            'batch_id': batch['batch_id'],
            'medicine_name': batch['medicine_name'],
            'manufacturer': batch['company_name'],
            'quantity': batch['quantity'],
            'manufacturing_date': batch['manufacturing_date'],
            'expiry_date': batch['expiry_date'],
            'batch_status': batch['batch_status'],
            'qr_code_base64': batch['qr_code_base64']
        },
        'history': history,
        'verifications': verifications
    }), 200

@batch_bp.route('/<batch_id_str>/verify', methods=['POST'])
@token_required
def verify_batch(batch_id_str):
    """Verify batch authenticity"""
    return _verify_batch(batch_id_str, request.user_id, request.role)


@batch_bp.route('/public/<batch_id_str>/verify', methods=['POST'])
def verify_batch_public(batch_id_str):
    """Verify batch authenticity without requiring login"""
    verified_by_user = None
    verified_by_role = 'consumer'

    auth_header = request.headers.get('Authorization')
    if auth_header:
        parts = auth_header.split(' ', 1)
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            payload = verify_token(parts[1].strip())
            if payload:
                verified_by_user = payload.get('user_id')
                verified_by_role = payload.get('role', 'consumer')

    return _verify_batch(batch_id_str, verified_by_user, verified_by_role)

@batch_bp.route('/<batch_id_str>/qr', methods=['GET'])
@token_required
def get_qr_code(batch_id_str):
    """Get QR code for batch"""
    batch = MedicineBatch.get_batch_by_batch_id(batch_id_str)
    
    if not batch:
        return jsonify({'message': 'Batch not found'}), 404
    
    return jsonify({
        'batch_id': batch['batch_id'],
        'qr_code_base64': batch['qr_code_base64'],
        'qr_data': batch['qr_code_data']
    }), 200


@batch_bp.route('/<batch_id_str>/dispatch', methods=['POST'])
@token_required
@role_required('manufacturer')
def dispatch_batch(batch_id_str):
    """
    Dispatch a batch to a retailer.
    Body: {
        retailer_name, retailer_contact, retailer_location,
        retailer_website (optional), quantity, delivery_date (optional)
    }
    """
    data = request.get_json()

    required = ['retailer_name', 'retailer_contact', 'retailer_location', 'quantity']
    if not all(field in data for field in required):
        return jsonify({'message': 'Missing required fields: retailer_name, retailer_contact, retailer_location, quantity'}), 400

    batch = MedicineBatch.get_batch_by_batch_id(batch_id_str)
    if not batch:
        return jsonify({'message': 'Batch not found'}), 404

    if batch['manufacturer_id'] != request.user_id:
        return jsonify({'message': 'You do not own this batch'}), 403

    quantity = int(data['quantity'])
    if quantity <= 0:
        return jsonify({'message': 'Quantity must be positive'}), 400

    delivery_date = data.get('delivery_date') or datetime.now().strftime('%Y-%m-%d')
    retailer_website = data.get('retailer_website', '')

    # Generate a unique delivery ID
    import uuid
    delivery_id = 'DLV-' + uuid.uuid4().hex[:12].upper()

    # Try to find a matching retailer user account (optional)
    retailer_user = execute_query(
        "SELECT id FROM users WHERE role='retailer' AND company_name = %s LIMIT 1",
        (data['retailer_name'],),
        fetch_one=True
    )
    retailer_id = retailer_user['id'] if retailer_user else None

    # If no matching retailer account, use a placeholder retailer_id (NULL-safe approach)
    # We'll store the retailer info directly in the deliveries table via extra columns
    # First, ensure the deliveries table has the extra columns (handled in migration)

    if retailer_id:
        # Use the matched retailer account
        ok = execute_update(
            """
            INSERT INTO deliveries
              (delivery_id, manufacturer_id, retailer_id, batch_id, quantity,
               delivery_date, delivery_status,
               retailer_name, retailer_contact, retailer_location, retailer_website)
            VALUES (%s, %s, %s, %s, %s, %s, 'in_transit', %s, %s, %s, %s)
            """,
            (delivery_id, request.user_id, retailer_id, batch['id'], quantity,
             delivery_date, data['retailer_name'], data['retailer_contact'],
             data['retailer_location'], retailer_website)
        )
    else:
        # No matched retailer — store info without a FK user
        ok = execute_update(
            """
            INSERT INTO deliveries
              (delivery_id, manufacturer_id, retailer_id, batch_id, quantity,
               delivery_date, delivery_status,
               retailer_name, retailer_contact, retailer_location, retailer_website)
            VALUES (%s, %s, NULL, %s, %s, %s, 'in_transit', %s, %s, %s, %s)
            """,
            (delivery_id, request.user_id, batch['id'], quantity,
             delivery_date, data['retailer_name'], data['retailer_contact'],
             data['retailer_location'], retailer_website)
        )

    if not ok:
        return jsonify({'message': 'Failed to create dispatch record'}), 500

    # Log batch history
    manufacturer = User.get_user_by_id(request.user_id)
    BatchHistory.log_event(
        batch['id'],
        'delivered',
        data['retailer_location'],
        request.user_id,
        'manufacturer'
    )

    return jsonify({
        'message': 'Batch dispatched successfully',
        'delivery': {
            'delivery_id': delivery_id,
            'batch_id': batch_id_str,
            'retailer_name': data['retailer_name'],
            'retailer_contact': data['retailer_contact'],
            'retailer_location': data['retailer_location'],
            'retailer_website': retailer_website,
            'quantity': quantity,
            'delivery_date': delivery_date,
            'status': 'in_transit'
        }
    }), 201


@batch_bp.route('/<batch_id_str>/dispatches', methods=['GET'])
@token_required
@role_required('manufacturer')
def get_batch_dispatches(batch_id_str):
    """Get all dispatch records for a batch"""
    batch = MedicineBatch.get_batch_by_batch_id(batch_id_str)
    if not batch:
        return jsonify({'message': 'Batch not found'}), 404

    if batch['manufacturer_id'] != request.user_id:
        return jsonify({'message': 'Access denied'}), 403

    dispatches = execute_query(
        """
        SELECT delivery_id, retailer_name, retailer_contact, retailer_location,
               retailer_website, quantity, delivery_date, delivery_status, created_at
        FROM deliveries
        WHERE batch_id = %s AND manufacturer_id = %s
        ORDER BY created_at DESC
        """,
        (batch['id'], request.user_id)
    )

    return jsonify({
        'dispatches': dispatches or [],
        'count': len(dispatches) if dispatches else 0
    }), 200

@batch_bp.route('/<batch_id_str>/recall', methods=['POST'])
@token_required
@role_required('manufacturer')
def recall_batch(batch_id_str):
    """Recall a specific batch"""
    batch = MedicineBatch.get_batch_by_batch_id(batch_id_str)
    
    if not batch:
        return jsonify({'message': 'Batch not found'}), 404
        
    if batch['manufacturer_id'] != request.user_id:
        return jsonify({'message': 'Access denied. You do not own this batch.'}), 403
        
    # Update status to recalled
    execute_update("UPDATE medicine_batches SET batch_status = 'recalled' WHERE id = %s", (batch['id'],))
    
    # Log to batch history
    manufacturer = User.get_user_by_id(request.user_id)
    BatchHistory.log_event(
        batch['id'],
        'recalled',
        manufacturer['company_name'],
        request.user_id,
        'manufacturer'
    )
    
    return jsonify({'message': 'Batch recalled successfully', 'success': True}), 200

