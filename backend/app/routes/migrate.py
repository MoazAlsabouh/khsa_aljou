from flask_migrate import upgrade
from flask import Blueprint

migrate_bp = Blueprint('migrate_bp', __name__)

@migrate_bp.route('/')
def run_migrations():
    upgrade()
    return "Migrations applied!"
    # return "this endpoint is for running migrations, but it's currently disabled."