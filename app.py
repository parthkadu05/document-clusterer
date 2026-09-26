import os
import uuid
import json
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_from_directory
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
from werkzeug.utils import secure_filename
from models import db, User, History
from document_processor import process_documents

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'super-secret-key-change-in-production')

database_url = os.environ.get('DATABASE_URL')
if database_url:
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql+psycopg2://', 1)
    elif database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    elif database_url.startswith('postgresql+psycopg://'):
        pass
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    os.makedirs(os.path.join(app.root_path, 'instance'), exist_ok=True)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(app.root_path, 'instance', 'database.db')

app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'uploads')
app.config['PROCESSED_FOLDER'] = os.path.join(app.root_path, 'processed')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload size

# Create dirs if not exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)

db.init_app(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Simple in-memory status tracking
user_status = {}


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


with app.app_context():
    db.create_all()


@app.route('/')
def home():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'danger')
    return render_template('login.html')


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'danger')
            return redirect(url_for('signup'))

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        flash('Account created! Please log in.', 'success')
        return redirect(url_for('login'))
    return render_template('signup.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')


@app.route('/process', methods=['POST'])
@login_required
def process_upload():
    # Support both 'files' and 'pdfs' field names
    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        files = request.files.getlist('pdfs')

    if not files or files[0].filename == '':
        return jsonify({'error': 'No files uploaded'}), 400

    search_name = request.form.get('search_name', '').strip()
    output_format = request.form.get('output_format', 'pdf')

    if not search_name:
        return jsonify({'error': 'Search name is required'}), 400

    # Capture filenames BEFORE saving (FileStorage streams get consumed after save)
    uploaded_file_names = [secure_filename(f.filename) for f in files if f and f.filename]

    saved_paths = []
    try:
        user_status[current_user.id] = {"status": "Uploading files...", "progress": 10}

        allowed_exts = {'.pdf', '.xlsx', '.xls', '.csv', '.docx', '.txt'}
        for file in files:
            if file and any(file.filename.lower().endswith(ext) for ext in allowed_exts):
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                saved_paths.append(filepath)

        if not saved_paths:
            return jsonify({'error': 'No valid files were uploaded. Allowed: PDF, XLSX, XLS, CSV, DOCX, TXT'}), 400

        user_status[current_user.id] = {"status": "Extracting & Matching content...", "progress": 40}

        output_ext = 'xlsx' if output_format == 'excel' else (output_format if output_format else 'pdf')
        output_filename = f"merged_result_{uuid.uuid4().hex[:8]}.{output_ext}"
        output_path = os.path.join(app.config['PROCESSED_FOLDER'], output_filename)

        # Run the actual processing
        matches, tags_list, summary, insights = process_documents(
            saved_paths, search_name, output_path, output_format
        )

        user_status[current_user.id] = {"status": "Cleaning up...", "progress": 90}

        # Cleanup uploaded source files after processing
        for path in saved_paths:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

        user_status[current_user.id] = {"status": "Done!", "progress": 100}

        if matches > 0:
            new_history = History(
                user_id=current_user.id,
                upload_names=json.dumps(uploaded_file_names),
                search_name=search_name,
                output_filename=output_filename,
                output_format=output_format,
                tags=json.dumps(tags_list),
                summary=summary,
                insights=json.dumps(insights)
            )
            db.session.add(new_history)
            db.session.commit()

            return jsonify({
                'success': True,
                'matches': matches,
                'tags': tags_list,
                'summary': summary,
                'insights': insights,
                'download_url': url_for('download_file', filename=output_filename)
            })
        else:
            # Remove empty output file if created
            if os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except Exception:
                    pass
            return jsonify({
                'success': False,
                'message': 'No matches found for the given search name.'
            }), 404

    except Exception as e:
        user_status[current_user.id] = {"status": "Error occurred.", "progress": 0}
        # Cleanup on error
        for path in saved_paths:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass
        return jsonify({'error': str(e)}), 500


@app.route('/status')
@login_required
def status():
    status_data = user_status.get(current_user.id, {"status": "Idle", "progress": 0})
    return jsonify(status_data)


@app.route('/downloads/<filename>')
@login_required
def download_file(filename):
    return send_from_directory(app.config['PROCESSED_FOLDER'], filename)


@app.route('/api/history', methods=['GET'])
@login_required
def get_history():
    histories = History.query.filter_by(user_id=current_user.id).order_by(History.created_at.desc()).all()
    history_list = []
    for h in histories:
        try:
            unames = json.loads(h.upload_names)
        except Exception:
            unames = []
        try:
            tags = json.loads(h.tags)
        except Exception:
            tags = []
        try:
            insights = json.loads(h.insights)
        except Exception:
            insights = {}

        history_list.append({
            'id': h.id,
            'upload_names': unames,
            'search_name': h.search_name,
            'output_format': h.output_format,
            'tags': tags,
            'summary': h.summary,
            'insights': insights,
            'created_at': h.created_at.strftime("%Y-%m-%d %H:%M"),
            'download_url': url_for('download_file', filename=h.output_filename) if h.output_filename else '#'
        })
    return jsonify({'history': history_list})


@app.route('/api/history/delete/<int:history_id>', methods=['DELETE'])
@login_required
def delete_history(history_id):
    history_item = History.query.filter_by(id=history_id, user_id=current_user.id).first()
    if history_item:
        if history_item.output_filename:
            filepath = os.path.join(app.config['PROCESSED_FOLDER'], history_item.output_filename)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception:
                    pass
        db.session.delete(history_item)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Not found'}), 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
