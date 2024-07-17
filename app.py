from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from maze import Maze, MazeCell

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*", "allow_headers": "Content-Type"}})

# persistent data
maze = None # maze object when created

# Create
@app.route('/create', methods=['POST'])
def create_maze():
    global maze
    data = request.get_json()
    if not data:
        abort(400)
    maze = Maze(data) # rows and cols
    maze.make_maze(MazeCell(0, 0, maze))
    return jsonify(maze.dict_for_json()), 201

# Get Maze
@app.route('/maze', methods=['GET'])
def get_maze():
    if not maze:
        abort(400)
    return jsonify(maze.dict_for_json())

# Run training
@app.route('/train', methods=['POST'])
def run_q_learning():
    global maze
    data = request.get_json()
    if not data:
        abort(400)
    maze.rl_train(data['passes']) # number of passes to run
    return jsonify({'total_training_passes': maze.total_training_passes}), 200 # returns total training passes

# Solve based on learned policy, max q
# receives starting x, y, and maximum steps
# returns the solution path as a list  of x, y pairs
@app.route('/solve', methods=['POST'])
def solve():
    global maze
    data = request.get_json()
    if not data:
        abort(400)
    maze.solve_from(data['x'], data['y'], data['max_steps']) # 
    return jsonify({'solve_path': maze.solve_path}), 200 # returns solution path

if __name__ == '__main__':
    app.run(debug=True)
