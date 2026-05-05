from flask import Blueprint, request, jsonify
from app.models import User
from app.auth import create_token, token_required
from app.utils.helpers import validate_email, validate_password

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Validate input - core fields only
    required_fields = ['username', 'email', 'password', 'full_name', 'role']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing required fields'}), 400
    
    # For non-customers, company_name and license_number are required
    if data['role'] in ['manufacturer', 'retailer']:
        if not data.get('company_name') or not data.get('license_number'):
            return jsonify({'message': 'Company name and license number required for this role'}), 400
    
    # Set defaults for customers
    company_name = data.get('company_name', '')
    license_number = data.get('license_number', '')
    
    # Validate email
    if not validate_email(data['email']):
        return jsonify({'message': 'Invalid email format'}), 400
    
    # Validate password
    is_valid, message = validate_password(data['password'])
    if not is_valid:
        return jsonify({'message': message}), 400
    
    # Check if user exists
    if User.get_user_by_username(data['username']):
        return jsonify({'message': 'Username already exists'}), 409
    
    if User.get_user_by_email(data['email']):
        return jsonify({'message': 'Email already exists'}), 409
    
    # Validate role
    if data['role'] not in ['manufacturer', 'retailer', 'customer']:
        return jsonify({'message': 'Invalid role'}), 400
    
    # Create user
    if User.create_user(
        data['username'],
        data['email'],
        data['password'],
        data['full_name'],
        data['role'],
        company_name,
        license_number
    ):
        return jsonify({'message': 'User registered successfully'}), 201
    else:
        return jsonify({'message': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username and password required'}), 400
    
    user = User.get_user_by_username(data['username'])
    if not user:
        return jsonify({'message': 'Invalid username or password'}), 401
    
    if not User.verify_password(data['password'], user['password_hash']):
        return jsonify({'message': 'Invalid username or password'}), 401
    
    if not user['is_active']:
        return jsonify({'message': 'User account is inactive'}), 403
    
    # Create token
    token = create_token(user['id'], user['username'], user['role'])
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'full_name': user['full_name'],
            'role': user['role'],
            'company_name': user['company_name']
        }
    }), 200

@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get current user profile"""
    user = User.get_user_by_id(request.user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    return jsonify({
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'full_name': user['full_name'],
            'role': user['role'],
            'company_name': user['company_name'],
            'license_number': user['license_number'],
            'contact_phone': user['contact_phone'],
            'address': user['address'],
            'city': user['city'],
            'state': user['state'],
            'country': user['country'],
            'postal_code': user['postal_code']
        }
    }), 200

@auth_bp.route('/users', methods=['GET'])
@token_required
def get_users():
    """Get list of users by role"""
    role = request.args.get('role')
    
    if role and role not in ['manufacturer', 'retailer', 'customer']:
        return jsonify({'message': 'Invalid role filter'}), 400
    
    users = User.get_all_users(role=role)
    
    return jsonify({
        'users': users,
        'count': len(users) if users else 0
    }), 200
