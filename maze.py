import random

# defines Maze and MazeCell classes

class RLHyperP:
    "a set of hyperparameters for reinforcement learning"

    def __init__(self, epsilon = 0.3, 
                epsilon_decay = 0.99, 
                min_epsilon = 0.1,
                alpha = 0.5, 
                gamma = 0.9, 
                rIllegal = -0.75, 
                rLegal = -0.1, 
                rGoal = 10,
                hiddenSize = 64):
        self.epsilon = epsilon
        self.epsilon_decay = epsilon_decay
        self.min_epsilon = min_epsilon
        self.alpha = alpha
        self.gamma = gamma
        self.rIllegal = rIllegal
        self.rLegal = rLegal
        self.rGoal = rGoal
        self.hiddenSize = hiddenSize
        
class MazeCell:
    "represent the content of a single maze cell"   
    
    # static moves
    # moves_by_name = { 's' : (0, 1), 'e' : (1, 0), 'n' : (0, -1), 'w' : (-1, 0) }
    move_names = {(0, 1): 's', (1, 0): 'e', (0, -1): 'n', (-1, 0): 'w'}
    moves = [(0, 1), (1, 0), (0, -1), (-1, 0)] # use the tuples as keys
    reverse_moves = {(0, 1): (0, -1), (0, -1): (0, 1), (1, 0): (-1, 0), (-1, 0): (1, 0)}

    def __init__(self, x, y, maze, hp = RLHyperP()):
        self.x = x
        self.y = y
        self.maze = maze
        self.hp = hp
        self.legal = {(0, -1): False, (0, 1): False, (1, 0): False, (-1, 0): False}
        self.q = {(0, -1) : 0, (0, 1) : 0, (1, 0) : 0, (-1, 0) : 0}
        self.goal = False # goal cell

    def dict_for_json(self):
        """
        Create a dictionary for conversion to json.
        Omit the maze object.
        Convert the RLHyperP to a dictionary.
        Convert legal and q keys to names (can't use tuples for json)
        """
        result = self.__dict__.copy()
        del(result['maze'])
        result['hp'] = self.hp.__dict__
        result['legal'] = {MazeCell.move_names[k]: v for k, v in result['legal'].items()}
        result['q'] = {MazeCell.move_names[k]: v for k, v in result['q'].items()}
        return result

    def loc(self):
        "return a tuple for the location of the cell"
        return (self.x, self.y)
    
    def step(self, move):
        "apply a legal move tuple to the current cell"
        self.legal[move] = True # update legality
        new_cell = MazeCell(self.x + move[0], self.y + move[1], self.maze)
        new_cell.legal[MazeCell.reverse_moves[move]] = True
        return new_cell
        
    def random_step(self):
        "move at random to an adjacent cell, return False if no move available"    

        if self.enclosed():
            return False
        
        move = self.get_random_move()
        while self.out_of_bounds_or_occupied(move):
            move = self.get_random_move()
        new_cell = self.step(move)
        return new_cell

    def out_of_bounds_or_occupied(self, move):
        "check whether a potential move is in bounds and unoccupied"
        new_x = self.x + move[0]
        new_y = self.y + move[1]
        if (new_x < 0 or
            new_y < 0 or
            new_x >= self.maze.cols or
            new_y >= self.maze.rows or
            self.maze.cell_matrix[new_y][new_x] != 0):
            return True
        else:
            return False

    def enclosed(self):
        "return True if no moves are possible due to boundaries or occupancy"
        return ((self.x == 0 or self.maze.cell_matrix[self.y][self.x - 1]) and
                (self.x == self.maze.cols - 1 or self.maze.cell_matrix[self.y][self.x + 1]) and
                (self.y == 0 or self.maze.cell_matrix[self.y - 1][self.x]) and
                (self.y == self.maze.rows - 1 or self.maze.cell_matrix[self.y + 1][self.x]))

    
    # methods for Q learning follow
    ###############################

    def get_random_move(self):
        "select a random move"
        return random.choice(MazeCell.moves)

    def get_random_legal_move(self):
        "select a random move, but make sure it's legal"
        return random.choice([move for move in MazeCell.moves if self.legal[move]])
    
    def best_move(self, force_legal = False):
        """
        Select the best move based on q values.
        If all q values are 0, select at random.
        If force_legal is true, only legal values are selected when selecting randomly.
        """
                # return a random selection of all q's are zero
        if all(val == 0 for val in self.q.values()):
            if force_legal:
                return self.get_random_legal_move()
            else:
                return self.get_random_move()
        else:
            return max(self.q, key=self.q.get)
        
    def next_state(self, move):
        "apply a move to get the next state (cell).  Moves are tuples (x, y)"
        return self.maze.cell_matrix[self.y + move[1]][self.x + move[0]]
    
    def update_state(self):
        """
        Update the state based on the Bellman equation and epsilon greedy.
        Return the new cell.
        """

        # select a move based on epsilon greedy
        if random.random() < self.hp.epsilon:
            # explore
            move = self.get_random_move()
        else:
            # exploit
            move = self.best_move()

        # update epsilon
        self.hp.epsilon *= self.hp.epsilon_decay

        # compute reward
        if self.legal[move]:
            new_state = self.next_state(move)
            if new_state.goal:
                reward = self.hp.rGoal
            else:
                reward = self.hp.rLegal
        else:
            new_state = self # don't apply an illegal move
            reward = self.hp.rIllegal

        # update q
        current_q = self.q[move]
        new_state_q = new_state.q[new_state.best_move()]
        new_q = current_q + self.hp.alpha * (reward + (self.hp.gamma * new_state_q) - current_q)
        self.q[move] = new_q

        return new_state

class Maze:
    "represent and manipulate 2D mazes"
    def __init__(self, definition = {'cols': 10, 'rows': 10}):
        "definition is a diction containing row (rows) and column (cols) count"
        self.rows = definition['rows']
        self.cols = definition['cols']
        "initialize the cell matrix to all zeros.  Each cell can be 0 or a MazeCell."
        self.cell_matrix = [[0 for _ in range(self.cols)] for _ in range(self.rows)]
        "record the paths (sequences of cell locations) in the maze"
        self.paths = []
        self.total_training_passes = 0
        self.generated = False
        self.solve_path = [] # list of (x, y) tuples

    def dict_for_json(self):
        """
        Create a dictionary for use with flask jasonify.
        Convert MazeCells in cell_matrix to dictionaries.
        """
        result = self.__dict__.copy()
        result['cell_matrix'] = [[cell.dict_for_json() for cell in row] for row in self.cell_matrix]
        return result

    def place_cell(self, maze_cell):
        "place a MazeCell in the cell_matrix at its x, y coordinates"
        self.cell_matrix[maze_cell.y][maze_cell.x] = maze_cell
        #print(f'placed cell at {maze_cell.x}, {maze_cell.y}')

    def get_new_start(self):
        "get a new starting point for a maze path from among occupied, unenclosed cells"
        candidates = [cell for row in self.cell_matrix for cell in row if (cell != 0 and not cell.enclosed())]
        if len(candidates) > 0:
            return random.choice(candidates)
        else:
            return False

    def make_maze_path(self, start):
        "save the path"
        path = []

        "given a mazeCell, create a random path until it becomes enclosed"
        current_cell = start

        # loop until enclosed
        while current_cell:
            self.place_cell(current_cell)
            path.append(current_cell.loc())
            current_cell = current_cell.random_step()

        self.paths.append(path)

    def make_maze(self, start):
        "reinitialize the cell_matrix"
        self.cell_matrix = [[0 for _ in range(self.cols)] for _ in range(self.rows)]
        "fill the entire maze extending unenclosed points until none remain"
        self.make_maze_path(start)
        new_start = self.get_new_start()
        while new_start:
            self.make_maze_path(new_start)
            new_start = self.get_new_start()
        # mark the goal cell, always lr corner for now
        self.cell_matrix[self.cols - 1][self.rows - 1].goal = True
        self.generated = True

    # methods for Q learning follow
    ###############################

    def get_random_cell(self):
        "return a random cell from the cell_matrix"
        return random.choice(random.choice(self.cell_matrix))
    
    
    # run training by starting multiple passes at random places
    # for each pass:
    #   update q values until the goal is reached
    def rl_train(self, passes = 10):
        "run training for the specified number of passes"
        for _ in range(passes):
        
            cell = self.get_random_cell()
            steps = 0

            while (not cell.goal):
                cell = cell.update_state()
                steps += 1

        # track the total number of passes
        self.total_training_passes += passes

    def solve_from(self, x = 0, y = 0, max_steps = 1000):
        """
        Solve the maze using the learned policy by selecting the move with the maximum q value.
        quit if max_steps is reached.
        """

        # clear previous solutions
        self.solve_path = []

        steps = 0
        cell = self.cell_matrix[y][x]
        self.solve_path.append((cell.x, cell.y))
        while ((not cell.goal) and (steps < max_steps)):
            cell = cell.next_state(cell.best_move(True)) # only allows legal moves
            self.solve_path.append((cell.x, cell.y))
            steps += 1

    








    
        
