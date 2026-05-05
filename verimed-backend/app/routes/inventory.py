from flask import Blueprint, request, jsonify
from app.models import RetailerInventory, MedicineBatch, BatchHistory, Analytics
from app.auth import token_required, role_required
from app.database import execute_query
from datetime import datetime

inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')


@inventory_bp.route('/search', methods=['GET'])
def search_medicine_stock():
    """Public medicine stock finder for customers"""
    medicine = request.args.get('medicine', '').strip()
    city = request.args.get('city', '').strip()

    # First try to get results from retailer_inventory (verified stock)
    query = """
        SELECT
            ri.id,
            ri.retailer_id,
            u.company_name,
            u.city,
            u.state,
            u.country,
            u.contact_phone,
            u.address,
            mb.batch_id,
            m.medicine_name,
            m.generic_name,
            ri.quantity_in_stock,
            mb.expiry_date,
            NULL as retailer_contact,
            NULL as retailer_location,
            NULL as retailer_website
        FROM retailer_inventory ri
        JOIN users u ON ri.retailer_id = u.id
        JOIN medicine_batches mb ON ri.batch_id = mb.id
        JOIN medicines m ON mb.medicine_id = m.id
        WHERE ri.quantity_in_stock > 0
          AND (%s = '' OR LOWER(m.medicine_name) LIKE LOWER(CONCAT('%%', %s, '%%')) OR LOWER(m.generic_name) LIKE LOWER(CONCAT('%%', %s, '%%')))
          AND (%s = '' OR LOWER(u.city) LIKE LOWER(CONCAT('%%', %s, '%%')) OR LOWER(u.state) LIKE LOWER(CONCAT('%%', %s, '%%')))
        ORDER BY mb.expiry_date ASC, u.company_name ASC
    """

    inventory_results = execute_query(query, (medicine, medicine, medicine, city, city, city)) or []

    # Also pull dispatched batches (even if not yet in retailer_inventory) so customers
    # can see where the batch was sent based on manufacturer dispatch info.
    dispatch_query = """
        SELECT
            d.id,
            NULL as retailer_id,
            d.retailer_name as company_name,
            d.retailer_location as city,
            NULL as state,
            NULL as country,
            d.retailer_contact as contact_phone,
            d.retailer_location as address,
            mb.batch_id,
            m.medicine_name,
            m.generic_name,
            d.quantity as quantity_in_stock,
            mb.expiry_date,
            d.retailer_contact,
            d.retailer_location,
            d.retailer_website
        FROM deliveries d
        JOIN medicine_batches mb ON d.batch_id = mb.id
        JOIN medicines m ON mb.medicine_id = m.id
        WHERE d.delivery_status != 'cancelled'
          AND mb.batch_status = 'active'
          AND (%s = '' OR LOWER(m.medicine_name) LIKE LOWER(CONCAT('%%', %s, '%%')) OR LOWER(m.generic_name) LIKE LOWER(CONCAT('%%', %s, '%%')))
          AND (%s = '' OR LOWER(d.retailer_location) LIKE LOWER(CONCAT('%%', %s, '%%')) OR LOWER(d.retailer_name) LIKE LOWER(CONCAT('%%', %s, '%%')))
        ORDER BY mb.expiry_date ASC
    """

    dispatch_results = execute_query(dispatch_query, (medicine, medicine, medicine, city, city, city)) or []

    # Merge: prefer inventory_results, supplement with dispatch_results
    seen_batches = {r['batch_id'] for r in inventory_results}
    for r in dispatch_results:
        if r['batch_id'] not in seen_batches:
            inventory_results.append(r)
            seen_batches.add(r['batch_id'])

    combined = []
    for r in inventory_results:
        combined.append({
            'batch_id': r.get('batch_id'),
            'medicine_name': r.get('medicine_name'),
            'generic_name': r.get('generic_name'),
            'quantity_in_stock': r.get('quantity_in_stock'),
            'expiry_date': str(r.get('expiry_date') or ''),
            'company_name': r.get('company_name'),
            'city': r.get('city'),
            'state': r.get('state'),
            'contact_phone': r.get('retailer_contact') or r.get('contact_phone'),
            'address': r.get('retailer_location') or r.get('address'),
            'website_url': r.get('retailer_website'),
        })

    return jsonify({
        'results': combined,
        'count': len(combined),
        'query': {
            'medicine': medicine,
            'city': city,
        }
    }), 200

@inventory_bp.route('', methods=['GET'])
@token_required
@role_required('retailer')
def get_inventory():
    """Get retailer's inventory"""
    inventory = RetailerInventory.get_retailer_inventory(request.user_id)
    
    return jsonify({
        'inventory': inventory,
        'count': len(inventory) if inventory else 0
    }), 200

@inventory_bp.route('/stats', methods=['GET'])
@token_required
@role_required('retailer')
def get_inventory_stats():
    """Get inventory statistics"""
    stats = RetailerInventory.get_inventory_stats(request.user_id)
    
    return jsonify({
        'stats': {
            'total_batches': stats['total_batches'] if stats else 0,
            'total_units': stats['total_units'] if stats else 0,
            'total_sold': stats['total_sold'] if stats else 0,
            'verified_batches': stats['verified_batches'] if stats else 0
        }
    }), 200

@inventory_bp.route('/add', methods=['POST'])
@token_required
@role_required('retailer')
def add_to_inventory():
    """Add medicine batch to inventory"""
    data = request.get_json()
    
    required_fields = ['batch_id', 'quantity_received', 'received_date']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing required fields: batch_id, quantity_received, received_date'}), 400
    
    # Verify batch exists
    batch = MedicineBatch.get_batch_by_batch_id(data['batch_id'])
    if not batch:
        return jsonify({'message': 'Batch not found'}), 404
    
    # received_from_user is optional — default to None (NULL) to avoid FK violations
    received_from_user = data.get('received_from_user') or None
    
    # Add to inventory
    if RetailerInventory.add_to_inventory(
        request.user_id,
        batch['id'],
        data['quantity_received'],
        data['received_date'],
        received_from_user
    ):
        # Log event
        BatchHistory.log_event(
            batch['id'],
            'delivered',
            'Retailer warehouse',
            request.user_id,
            'retailer'
        )
        
        return jsonify({'message': 'Added to inventory successfully'}), 201
    else:
        return jsonify({'message': 'Failed to add to inventory'}), 500

@inventory_bp.route('/<int:batch_id>', methods=['GET'])
@token_required
@role_required('retailer')
def get_inventory_item(batch_id):
    """Get specific inventory item"""
    item = RetailerInventory.get_inventory_item(request.user_id, batch_id)
    
    if not item:
        return jsonify({'message': 'Inventory item not found'}), 404
    
    return jsonify({'item': item}), 200

@inventory_bp.route('/<int:batch_id>/verify', methods=['POST'])
@token_required
@role_required('retailer')
def verify_inventory_item(batch_id):
    """Mark inventory item as verified"""
    item = RetailerInventory.get_inventory_item(request.user_id, batch_id)
    
    if not item:
        return jsonify({'message': 'Inventory item not found'}), 404
    
    if RetailerInventory.mark_as_verified(request.user_id, batch_id):
        # Record analytics
        Analytics.record_metric(request.user_id, 'retailer', 'batches_verified', 1)
        
        return jsonify({'message': 'Inventory item marked as verified'}), 200
    else:
        return jsonify({'message': 'Failed to verify inventory item'}), 500

@inventory_bp.route('/<int:batch_id>/sell', methods=['POST'])
@token_required
@role_required('retailer')
def sell_from_inventory(batch_id):
    """Record sale from inventory"""
    data = request.get_json()
    
    if 'quantity_sold' not in data:
        return jsonify({'message': 'quantity_sold required'}), 400
    
    item = RetailerInventory.get_inventory_item(request.user_id, batch_id)
    if not item:
        return jsonify({'message': 'Inventory item not found'}), 404
    
    if item['quantity_in_stock'] < data['quantity_sold']:
        return jsonify({'message': 'Insufficient stock'}), 400
    
    if RetailerInventory.update_inventory(request.user_id, batch_id, data['quantity_sold']):
        # Record analytics
        Analytics.record_metric(
            request.user_id,
            'retailer',
            'sales',
            data['quantity_sold']
        )
        
        return jsonify({
            'message': 'Sale recorded successfully',
            'quantity_sold': data['quantity_sold']
        }), 200
    else:
        return jsonify({'message': 'Failed to record sale'}), 500

@inventory_bp.route('/expiring-soon', methods=['GET'])
@token_required
@role_required('retailer')
def get_expiring_soon():
    """Get inventory items expiring soon (next 30 days)"""
    from datetime import timedelta, date as date_type
    inventory = RetailerInventory.get_retailer_inventory(request.user_id)

    if not inventory:
        return jsonify({'expiring_items': []}), 200

    expiring_items = []
    today = datetime.now().date()
    thirty_days = timedelta(days=30)

    for item in inventory:
        expiry = item.get('expiry_date')
        if not expiry:
            continue
        # Handle both str and datetime.date from MySQL
        if isinstance(expiry, str):
            expiry_date = datetime.strptime(expiry, '%Y-%m-%d').date()
        elif hasattr(expiry, 'date'):
            expiry_date = expiry.date()
        else:
            expiry_date = expiry  # already a date

        if today <= expiry_date <= today + thirty_days:
            expiring_items.append({
                **item,
                'expiry_date': str(expiry_date)
            })

    return jsonify({
        'expiring_items': expiring_items,
        'count': len(expiring_items)
    }), 200
