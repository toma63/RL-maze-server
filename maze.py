# defines Maze and MazeCell classes
class Maze:
    "represent and manipulate 2D mazes"
    def __init__(self, definition):
        "definition is a diction containing row (rows) and column (cols) count"
        self.rows = definition['rows']
        self.cols = definition['cols']