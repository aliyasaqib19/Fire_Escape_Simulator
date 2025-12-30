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
        
        # Fire physics arrays (initialized to None, can be set later)
        self.fire_intensity = None
        self.smoke_density = None
        self.heat_level = None
        
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
    
    def set_fire_physics(self, fire_intensity, smoke_density, heat_level):
        """
        Set fire physics arrays from frontend
        :param fire_intensity: 2D array of fire intensity values (0-10)
        :param smoke_density: 2D array of smoke density values (0-10)
        :param heat_level: 2D array of heat level values (0-10)
        """
        self.fire_intensity = fire_intensity
        self.smoke_density = smoke_density
        self.heat_level = heat_level
    
    def get_cell_cost(self, row, col):
        """
        Calculate movement cost for a cell based on fire physics
        :param row: Row index
        :param col: Column index
        :return: Cost value (higher = more dangerous)
        """
        if not (0 <= row < self.rows and 0 <= col < self.cols):
            return float('inf')  # Out of bounds
        
        cell_value = self.grid[row][col]
        
        # Walls are impassable
        if cell_value == 1:
            return float('inf')
        
        # Direct fire cells are extremely dangerous
        if cell_value == 2:
            return 1000
        
        # If fire physics is enabled, calculate enhanced cost
        if self.fire_intensity and self.smoke_density and self.heat_level:
            base_cost = 1
            fire_cost = self.fire_intensity[row][col] * 10
            smoke_cost = self.smoke_density[row][col] * 5
            heat_cost = self.heat_level[row][col] * 3
            return base_cost + fire_cost + smoke_cost + heat_cost
        
        # Default cost for normal cells
        return 1
    
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
