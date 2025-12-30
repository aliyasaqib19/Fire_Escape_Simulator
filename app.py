"""
Flask Server - Fire Escape Simulator API
"""

from flask import Flask, render_template, request, jsonify
from building import Building
from pathfinding import find_path

app = Flask(__name__, static_folder='static', template_folder='static')


@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')


@app.route('/find_path', methods=['POST'])
def find_path_endpoint():
    """
    Find escape path endpoint
    Expects JSON: {
        "grid": 2D array,
        "algorithm": "bfs"|"ucs"|"astar"|"greedy",
        "heuristic": "manhattan"|"euclidean",
        "firePhysics": {
            "enabled": boolean,
            "fireIntensity": 2D array (0-10),
            "smokeDensity": 2D array (0-10),
            "heatLevel": 2D array (0-10)
        } (optional)
    }
    """
    try:
        data = request.json
        grid_data = data.get('grid')
        algorithm = data.get('algorithm', 'bfs')
        heuristic = data.get('heuristic', 'manhattan')
        fire_physics = data.get('firePhysics')
        
        if not grid_data:
            return jsonify({'error': 'No grid data provided'}), 400
        
        # Create building from grid data
        rows = len(grid_data)
        cols = len(grid_data[0]) if rows > 0 else 0
        
        building = Building(rows, cols)
        
        # Populate building
        for i in range(rows):
            for j in range(cols):
                building.set_cell(i, j, grid_data[i][j])
        
        # Set fire physics if provided
        if fire_physics and fire_physics.get('enabled'):
            building.set_fire_physics(
                fire_physics.get('fireIntensity'),
                fire_physics.get('smokeDensity'),
                fire_physics.get('heatLevel')
            )
        
        # Validate building has start and exit
        if not building.start_position:
            return jsonify({'error': 'No start position set'}), 400
        
        if not building.exits:
            return jsonify({'error': 'No exits set'}), 400
        
        # Find path using selected algorithm
        result = find_path(building, algorithm, heuristic)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/spread_fire', methods=['POST'])
def spread_fire_endpoint():
    """
    Spread fire simulation endpoint
    Expects JSON: {"grid": 2D array}
    """
    try:
        data = request.json
        grid_data = data.get('grid')
        
        if not grid_data:
            return jsonify({'error': 'No grid data provided'}), 400
        
        # Create building from grid data
        rows = len(grid_data)
        cols = len(grid_data[0]) if rows > 0 else 0
        
        building = Building(rows, cols)
        
        # Populate building
        for i in range(rows):
            for j in range(cols):
                building.set_cell(i, j, grid_data[i][j])
        
        # Spread fire
        building.spread_fire()
        
        return jsonify({
            'grid': building.get_grid_data(),
            'fire_cells': len(building.fire_cells)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/find_all_paths', methods=['POST'])
def find_all_paths_endpoint():
    """
    Find all shortest escape paths endpoint
    Expects JSON: {
        "grid": 2D array,
        "algorithm": "bfs" (only BFS supported for all paths)
    }
    """
    try:
        data = request.json
        grid_data = data.get('grid')
        if not grid_data:
            return jsonify({'error': 'No grid data provided'}), 400
        rows = len(grid_data)
        cols = len(grid_data[0]) if rows > 0 else 0
        building = Building(rows, cols)
        for i in range(rows):
            for j in range(cols):
                building.set_cell(i, j, grid_data[i][j])
        if not building.start_position:
            return jsonify({'error': 'No start position set'}), 400
        if not building.exits:
            return jsonify({'error': 'No exits set'}), 400
        # Import the new function
        from pathfinding import bfs_all_shortest_paths
        paths, nodes_explored = bfs_all_shortest_paths(building, building.start_position, building.exits)
        return jsonify({
            'paths': paths,
            'nodes_explored': nodes_explored,
            'path_count': len(paths),
            'path_length': len(paths[0]) if paths else 0
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("🔥 Fire Escape Simulator Server Starting...")
    print("📍 Navigate to: http://localhost:5000")
    app.run(debug=True, port=5000)
