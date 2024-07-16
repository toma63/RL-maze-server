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
    maze = Maze(data)
    maze.make_maze(MazeCell(0, 0, maze))
    return jsonify(maze.dict_for_json()), 201

# Get Maze
@app.route('/maze', methods=['GET'])
def get_maze():
    if not maze:
        abort(400)
    return jsonify(maze.dict_for_json())


if __name__ == '__main__':
    app.run(debug=True)
