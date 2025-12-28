"""
Building Module - Represents the building grid and fire simulation
"""

class Building:
    def __init__(self, rows, cols):
        """
        Initialize building grid
        :param rows: Number of rows in the building
        :param cols: Number of columns in the building
        """
        self.rows = rows
        self.cols = cols
        self.grid = [[0 for _ in range(cols)] for _ in range(rows)]
        self.fire_cells = set()
        self.exits = []
        self.start_position = None
        
    def set_cell(self, row, col, value):
        """Set cell value (0=empty, 1=wall, 2=fire, 3=exit, 4=start)"""
        if 0 <= row < self.rows and 0 <= col < self.cols:
            self.grid[row][col] = value
            if value == 2:
                self.fire_cells.add((row, col))
            elif value == 3:
                if (row, col) not in self.exits:
                    self.exits.append((row, col))
            elif value == 4:
                self.start_position = (row, col)
    
    def get_cell(self, row, col):
        """Get cell value"""
        if 0 <= row < self.rows and 0 <= col < self.cols:
            return self.grid[row][col]
        return -1  # Out of bounds
    
    def is_walkable(self, row, col):
        """Check if cell is walkable (not wall or fire)"""
        if not (0 <= row < self.rows and 0 <= col < self.cols):
            return False
        cell_value = self.grid[row][col]
        return cell_value not in [1, 2]  # Not wall or fire
    
    def get_neighbors(self, row, col):
        """Get valid walkable neighbors (up, down, left, right)"""
        neighbors = []
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]  # Up, Down, Left, Right
        
        for dr, dc in directions:
            new_row, new_col = row + dr, col + dc
            if self.is_walkable(new_row, new_col):
                neighbors.append((new_row, new_col))
        
        return neighbors
    
    def spread_fire(self):
        """Simulate fire spreading to adjacent cells"""
        new_fire_cells = set()
        for fire_row, fire_col in self.fire_cells:
            # Fire spreads to adjacent cells (not diagonally)
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                new_row, new_col = fire_row + dr, fire_col + dc
                if (0 <= new_row < self.rows and 0 <= new_col < self.cols):
                    cell_value = self.grid[new_row][new_col]
                    # Fire spreads to empty cells and exits (not walls or existing fire)
                    if cell_value in [0, 3, 4]:
                        new_fire_cells.add((new_row, new_col))
        
        # Update grid with new fire cells
        for row, col in new_fire_cells:
            if (row, col) not in self.fire_cells:
                self.grid[row][col] = 2
                self.fire_cells.add((row, col))
    
    def get_grid_data(self):
        """Return grid as list for serialization"""
        return self.grid
    
    def reset_path(self):
        """Reset path markers (value 5) back to empty"""
        for i in range(self.rows):
            for j in range(self.cols):
                if self.grid[i][j] == 5:  # Path marker
                    self.grid[i][j] = 0
