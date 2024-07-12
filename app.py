from flask import Flask, request, jsonify, abort
from maze import Maze

app = Flask(__name__)

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
    return jsonify(maze.__dict__), 201

# Get Maze
@app.route('/maze', methods=['GET'])
def get_maze():
    if not maze:
        abort(400)
    return jsonify(maze.__dict__)


if __name__ == '__main__':
    app.run(debug=True)
