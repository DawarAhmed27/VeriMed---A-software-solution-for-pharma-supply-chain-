from flask import Blueprint, request, jsonify
from app.models import Medicine
from app.auth import token_required, role_required

medicine_bp = Blueprint('medicine', __name__, url_prefix='/api/medicines')

@medicine_bp.route('', methods=['POST'])
@token_required
@role_required('manufacturer')
def create_medicine():
    """Create a new medicine"""
    data = request.get_json()
    
    required_fields = ['medicine_name', 'generic_name', 'dosage', 'active_ingredient', 'manufacturer_info']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing required fields'}), 400
    
    medicine_id = Medicine.create_medicine(
        data['medicine_name'],
        data['generic_name'],
        data['dosage'],
        request.user_id,
        data['active_ingredient'],
        data['manufacturer_info']
    )
    
    if medicine_id:
        return jsonify({
            'message': 'Medicine created successfully',
            'medicine_id': medicine_id
        }), 201
        
    return jsonify({'message': 'Failed to create medicine'}), 500

@medicine_bp.route('', methods=['GET'])
@token_required
def get_medicines():
    """Get all medicines (for admin) or manufacturer specific"""
    if request.role == 'manufacturer':
        medicines = Medicine.get_medicines_by_manufacturer(request.user_id)
    else:
        medicines = Medicine.get_all_medicines()
        
    return jsonify({
        'medicines': medicines,
        'count': len(medicines) if medicines else 0
    }), 200

@medicine_bp.route('/<int:medicine_id>', methods=['GET'])
@token_required
def get_medicine(medicine_id):
    """Get specific medicine"""
    medicine = Medicine.get_medicine_by_id(medicine_id)
    
    if not medicine:
        return jsonify({'message': 'Medicine not found'}), 404
        
    return jsonify({'medicine': medicine}), 200
