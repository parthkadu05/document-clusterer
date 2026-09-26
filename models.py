from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    histories = db.relationship('History', backref='user', lazy=True)

class History(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    upload_names = db.Column(db.String(500))
    search_name = db.Column(db.String(100))
    output_filename = db.Column(db.String(200))
    output_format = db.Column(db.String(50))
    tags = db.Column(db.String(200), default="")
    summary = db.Column(db.Text, default="")
    insights = db.Column(db.Text, default="") # JSON string of insight data
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
