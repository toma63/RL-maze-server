from flask import Flask, request, jsonify, abort

app = Flask(__name__)

# In-memory data store
items = []
next_id = 1

# Create
@app.route('/items', methods=['POST'])
def create_item():
    global next_id
    data = request.get_json()
    if not data or 'name' not in data:
        abort(400)
    item = {
        'id': next_id,
        'name': data['name'],
        'description': data.get('description', '')
    }
    items.append(item)
    next_id += 1
    return jsonify(item), 201

# Read All
@app.route('/items', methods=['GET'])
def get_items():
    return jsonify(items)

# Read One
@app.route('/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    item = next((item for item in items if item['id'] == item_id), None)
    if item is None:
        abort(404)
    return jsonify(item)

# Update
@app.route('/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    data = request.get_json()
    if not data:
        abort(400)
    item = next((item for item in items if item['id'] == item_id), None)
    if item is None:
        abort(404)
    item['name'] = data.get('name', item['name'])
    item['description'] = data.get('description', item['description'])
    return jsonify(item)

# Delete
@app.route('/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    global items
    item = next((item for item in items if item['id'] == item_id), None)
    if item is None:
        abort(404)
    items = [item for item in items if item['id'] != item_id]
    return '', 204

if __name__ == '__main__':
    app.run(debug=True)
