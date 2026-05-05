from flask import Blueprint, request, jsonify
from app.models import Analytics
from app.auth import token_required, role_required

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/manufacturer', methods=['GET'])
@token_required
@role_required('manufacturer')
def get_manufacturer_analytics():
    """Get manufacturer analytics"""
    days = request.args.get('days', default=30, type=int)
    
    analytics = Analytics.get_manufacturer_analytics(request.user_id, days)
    
    return jsonify({
        'period_days': days,
        'analytics': analytics
    }), 200

@analytics_bp.route('/retailer', methods=['GET'])
@token_required
@role_required('retailer')
def get_retailer_analytics():
    """Get retailer analytics"""
    days = request.args.get('days', default=30, type=int)
    
    analytics = Analytics.get_retailer_analytics(request.user_id, days)
    
    return jsonify({
        'period_days': days,
        'analytics': analytics
    }), 200

@analytics_bp.route('/retailer/inventory', methods=['GET'])
@token_required
@role_required('retailer')
def get_retailer_inventory_analytics():
    """Get retailer inventory analytics"""
    from app.models import RetailerInventory
    
    stats = RetailerInventory.get_inventory_stats(request.user_id)
    
    return jsonify({
        'inventory_stats': {
            'total_batches': stats['total_batches'] if stats else 0,
            'total_units': stats['total_units'] if stats else 0,
            'total_sold': stats['total_sold'] if stats else 0,
            'verified_batches': stats['verified_batches'] if stats else 0,
            'inventory_value': (stats['total_units'] * 50) if stats else 0  # Assuming $50 per unit
        }
    }), 200
