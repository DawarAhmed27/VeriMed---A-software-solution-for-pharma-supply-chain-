from flask import Blueprint, request, jsonify
from app.database import execute_query, execute_update
from app.auth import token_required
from datetime import datetime

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


@reports_bp.route('', methods=['POST'])
def submit_report():
    """Submit a fake medicine report (public — no login required)"""
    data = request.get_json() or {}
    batch_id_str   = (data.get('batch_id') or '').strip()
    location       = (data.get('location') or '').strip()
    description    = (data.get('description') or '').strip()
    reporter_name  = (data.get('reporter_name') or 'Anonymous').strip()

    if not location:
        return jsonify({'message': 'Location is required'}), 400

    ok = execute_update(
        """
        INSERT INTO fake_reports
            (batch_id_str, location, description, reporter_name, reported_at, is_blacklisted)
        VALUES (%s, %s, %s, %s, %s, 0)
        """,
        (batch_id_str or None, location, description, reporter_name, datetime.now())
    )
    if ok:
        return jsonify({'message': 'Report submitted. Thank you for helping keep medicines safe.'}), 201
    return jsonify({'message': 'Failed to submit report'}), 500


@reports_bp.route('', methods=['GET'])
def get_reports():
    """List all fake medicine reports (public)"""
    rows = execute_query(
        """
        SELECT id, batch_id_str, location, description, reporter_name,
               reported_at, is_blacklisted
        FROM fake_reports
        ORDER BY reported_at DESC
        LIMIT 200
        """
    ) or []

    return jsonify({
        'reports': [
            {
                'id': r['id'],
                'batch_id': r.get('batch_id_str') or '',
                'location': r['location'],
                'description': r.get('description') or '',
                'reporter_name': r.get('reporter_name') or 'Anonymous',
                'reported_at': str(r['reported_at']),
                'is_blacklisted': bool(r['is_blacklisted']),
            }
            for r in rows
        ],
        'count': len(rows)
    }), 200


@reports_bp.route('/<int:report_id>/blacklist', methods=['POST'])
@token_required
def blacklist_location(report_id):
    """Toggle blacklist status on a report (logged-in users)"""
    execute_update(
        "UPDATE fake_reports SET is_blacklisted = NOT is_blacklisted WHERE id = %s",
        (report_id,)
    )
    return jsonify({'message': 'Blacklist status updated'}), 200
