from authlib.integrations.flask_client import OAuth
from flask import url_for, redirect, session, jsonify, current_app, Blueprint
import os
from dotenv import load_dotenv

load_dotenv()

oauth = OAuth()
oauth_bp = Blueprint('oauth', __name__) # Blueprint for OAuth routes

BACKEND_URL = os.getenv('BACKEND_URL')

def configure_oauth(app):
    oauth.init_app(app)

    # تكوين Google OAuth
    oauth.register(
        name='google',
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )

    # تكوين GitHub OAuth
    oauth.register(
        name='github',
        client_id=app.config['GITHUB_CLIENT_ID'],
        client_secret=app.config['GITHUB_CLIENT_SECRET'],
        access_token_url='https://github.com/login/oauth/access_token',
        authorize_url='https://github.com/login/oauth/authorize',
        api_base_url='https://api.github.com/',
        client_kwargs={'scope': 'user:email'},
        redirect_uri= f"{BACKEND_URL}/api/v1/auth/authorize/github"
    )

    # تكوين Facebook OAuth
    oauth.register(
        name='facebook',
        client_id=app.config['FACEBOOK_CLIENT_ID'],
        client_secret=app.config['FACEBOOK_CLIENT_SECRET'],
        access_token_url='https://graph.facebook.com/oauth/access_token',
        authorize_url='https://www.facebook.com/dialog/oauth',
        api_base_url='https://graph.facebook.com/',
        client_kwargs={'scope': 'email'},
        redirect_uri= f"{BACKEND_URL}/api/v1/auth/authorize/facebook"
    )