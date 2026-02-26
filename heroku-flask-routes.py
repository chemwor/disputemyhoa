# Flask routes to add to your Heroku backend for case outputs
# Add these routes to your main Flask application file
#
# IMPORTANT: The /api/read-outputs endpoint MUST return fine_per_day and fine_start_date
# from the dmhoa_case_outputs table for the fine accrual widget to work.
#
# The frontend expects this response format from /api/read-outputs:
# {
#     "status": "ready",
#     "outputs": {...},
#     "fine_per_day": 100,        <-- REQUIRED for fine widget
#     "fine_start_date": "2025-12-27"  <-- REQUIRED for fine widget
# }

from flask import Flask, request, jsonify
import json

@app.route('/api/read-outputs', methods=['GET', 'OPTIONS'])
def read_outputs():
    """Read case outputs from the database."""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,apikey')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response

    try:
        token = request.args.get('token')
        if not token:
            return jsonify({'error': 'Token is required'}), 400

        # Query the dmhoa_case_outputs table for this token
        # This is pseudocode - replace with your actual database query
        cursor = get_db_cursor()  # Replace with your DB connection method
        cursor.execute(
            "SELECT outputs, status, fine_per_day, fine_start_date, created_at, updated_at FROM dmhoa_case_outputs WHERE case_token = %s",
            (token,)
        )
        result = cursor.fetchone()

        if not result:
            return jsonify({'error': 'Outputs not found'}), 404

        # Return the outputs in the expected format, including fine tracking data
        response_data = {
            'status': result['status'],
            'result': json.loads(result['outputs']) if result['outputs'] else None,
            'outputs': json.loads(result['outputs']) if result['outputs'] else None,
            'fine_per_day': float(result['fine_per_day']) if result['fine_per_day'] is not None else None,
            'fine_start_date': str(result['fine_start_date']) if result['fine_start_date'] is not None else None,
            'created_at': result['created_at'],
            'updated_at': result['updated_at']
        }

        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f'Read outputs error: {e}')
        response = jsonify({'error': 'Internal server error'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/api/case-analysis', methods=['POST', 'OPTIONS'])
def case_analysis():
    """Trigger case analysis/output generation."""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,apikey')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response

    try:
        data = request.get_json()
        token = data.get('token')

        if not token:
            return jsonify({'error': 'Token is required'}), 400

        # Check if the case exists and is unlocked
        cursor = get_db_cursor()  # Replace with your DB connection method
        cursor.execute(
            "SELECT * FROM dmhoa_cases WHERE token = %s AND unlocked = true",
            (token,)
        )
        case = cursor.fetchone()

        if not case:
            return jsonify({'error': 'Case not found or not unlocked'}), 404

        # Check if outputs already exist
        cursor.execute(
            "SELECT * FROM dmhoa_outputs WHERE case_token = %s",
            (token,)
        )
        existing_outputs = cursor.fetchone()

        if existing_outputs and existing_outputs['status'] == 'ready':
            # Outputs already exist
            response_data = {
                'status': 'ready',
                'message': 'Outputs already generated',
                'outputs': json.loads(existing_outputs['outputs']) if existing_outputs['outputs'] else None
            }
        else:
            # Mark as processing (or generate outputs if you have the AI pipeline ready)
            cursor.execute(
                """
                INSERT INTO dmhoa_outputs (case_token, case_id, status, model, prompt_version, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (case_token) DO UPDATE SET
                    status = EXCLUDED.status,
                    updated_at = NOW()
                """,
                (token, case['id'], 'processing', 'gpt-4o-mini', 'v4_post_payment')
            )

            response_data = {
                'status': 'processing',
                'message': 'Output generation started',
                'token': token
            }

        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f'Case analysis error: {e}')
        response = jsonify({'error': 'Internal server error'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/api/case-data', methods=['GET', 'OPTIONS'])
def get_case_data():
    """Get case data by token (alternative to read-case)."""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,apikey')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response

    try:
        token = request.args.get('token')
        if not token:
            return jsonify({'error': 'Token is required'}), 400

        # Query the dmhoa_cases table for this token
        cursor = get_db_cursor()  # Replace with your DB connection method
        cursor.execute(
            "SELECT * FROM dmhoa_cases WHERE token = %s",
            (token,)
        )
        result = cursor.fetchone()

        if not result:
            return jsonify({'error': 'Case not found'}), 404

        # Also fetch outputs with fine tracking data from dmhoa_case_outputs
        outputs_data = None
        outputs_status = None
        fine_per_day = None
        fine_start_date = None

        try:
            cursor.execute(
                "SELECT outputs, status, fine_per_day, fine_start_date FROM dmhoa_case_outputs WHERE case_token = %s",
                (token,)
            )
            outputs_result = cursor.fetchone()
            if outputs_result:
                outputs_data = json.loads(outputs_result['outputs']) if outputs_result['outputs'] else None
                outputs_status = outputs_result['status']
                fine_per_day = float(outputs_result['fine_per_day']) if outputs_result['fine_per_day'] is not None else None
                fine_start_date = str(outputs_result['fine_start_date']) if outputs_result['fine_start_date'] is not None else None
        except Exception as outputs_err:
            print(f'Error fetching outputs: {outputs_err}')
            # Continue without outputs - table may not exist yet

        # Return the case data in the expected format
        response_data = {
            'id': result['id'],
            'token': result['token'],
            'unlocked': result['unlocked'],
            'status': result['status'],
            'payload': json.loads(result['payload']) if result['payload'] else {},
            'created_at': result['created_at'],
            'updated_at': result['updated_at'],
            # Include outputs and fine tracking data
            'outputs': outputs_data,
            'outputs_status': outputs_status,
            'fine_per_day': fine_per_day,
            'fine_start_date': fine_start_date
        }

        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f'Get case data error: {e}')
        response = jsonify({'error': 'Internal server error'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500
