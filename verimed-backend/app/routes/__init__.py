# Initialize route blueprints
from app.routes.auth import auth_bp
from app.routes.medicines import medicine_bp
from app.routes.batches import batch_bp
from app.routes.inventory import inventory_bp
from app.routes.analytics import analytics_bp
from app.routes.reports import reports_bp

def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    app.register_blueprint(auth_bp)
    app.register_blueprint(medicine_bp)
    app.register_blueprint(batch_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(reports_bp)
