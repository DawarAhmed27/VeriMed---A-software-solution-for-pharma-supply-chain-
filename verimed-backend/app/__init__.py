from flask import Flask, jsonify
from flask_cors import CORS
from config import config, DevelopmentConfig
import os

def create_app(config_name='development'):
    """Create Flask application"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Enable CORS
    CORS(app)
    
    # Register error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'message': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'message': 'Internal server error'}), 500
    
    # Register blueprints
    from app.routes import register_blueprints
    register_blueprints(app)
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'OK', 'message': 'VeriMed API is running'}), 200
    
    return app
