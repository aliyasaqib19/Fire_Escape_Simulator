"""
Pathfinding Module - Implements BFS, UCS, A*, and Heuristic search algorithms
"""

from collections import deque
import heapq
import math


def manhattan_distance(pos1, pos2):
    """Calculate Manhattan distance between two positions"""
    return abs(pos1[0] - pos2[0]) + abs(pos1[1] - pos2[1])


def euclidean_distance(pos1, pos2):
    """Calculate Euclidean distance between two positions"""
    return math.sqrt((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2)


def bfs(building, start, goals):
    """
    Breadth-First Search
    :param building: Building object
    :param start: Starting position (row, col)
    :param goals: List of goal positions (exits)
    :return: (path, nodes_explored)
    """
    if not start or not goals:
        return None, 0
    
    queue = deque([(start, [start])])
    visited = {start}
    nodes_explored = 0
    
    while queue:
        current, path = queue.popleft()
        nodes_explored += 1
        
        # Check if we reached any exit
        if current in goals:
            return path, nodes_explored
        
        # Explore neighbors
        for neighbor in building.get_neighbors(current[0], current[1]):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))
    
    return None, nodes_explored  # No path found


def ucs(building, start, goals):
    """
    Uniform Cost Search
    :param building: Building object
    :param start: Starting position (row, col)
    :param goals: List of goal positions (exits)
    :return: (path, nodes_explored, cost)
    """
    if not start or not goals:
        return None, 0, 0
    
    # Priority queue: (cost, position, path)
    heap = [(0, start, [start])]
    visited = {start: 0}
    nodes_explored = 0
    
    while heap:
        cost, current, path = heapq.heappop(heap)
        nodes_explored += 1
        
        # Check if we reached any exit
        if current in goals:
            return path, nodes_explored, cost
        
        # Skip if we've found a better path to this node
        if current in visited and visited[current] < cost:
            continue
        
        # Explore neighbors (uniform cost = 1 per step)
        for neighbor in building.get_neighbors(current[0], current[1]):
            new_cost = cost + 1
            
            if neighbor not in visited or new_cost < visited[neighbor]:
                visited[neighbor] = new_cost
                heapq.heappush(heap, (new_cost, neighbor, path + [neighbor]))
    
    return None, nodes_explored, 0  # No path found


def a_star(building, start, goals, heuristic='manhattan'):
    """
    A* Search Algorithm
    :param building: Building object
    :param start: Starting position (row, col)
    :param goals: List of goal positions (exits)
    :param heuristic: Type of heuristic ('manhattan' or 'euclidean')
    :return: (path, nodes_explored, cost)
    """
    if not start or not goals:
        return None, 0, 0
    
    # Choose heuristic function
    h_func = manhattan_distance if heuristic == 'manhattan' else euclidean_distance
    
    # Find the minimum heuristic to any goal
    def min_heuristic(pos):
        return min(h_func(pos, goal) for goal in goals)
    
    # Priority queue: (f_score, g_score, position, path)
    initial_h = min_heuristic(start)
    heap = [(initial_h, 0, start, [start])]
    visited = {}
    nodes_explored = 0
    
    while heap:
        f_score, g_score, current, path = heapq.heappop(heap)
        nodes_explored += 1
        
        # Check if we reached any exit
        if current in goals:
            return path, nodes_explored, g_score
        
        # Skip if we've already visited this node with better cost
        if current in visited and visited[current] <= g_score:
            continue
        
        visited[current] = g_score
        
        # Explore neighbors
        for neighbor in building.get_neighbors(current[0], current[1]):
            new_g_score = g_score + 1
            
            if neighbor not in visited or new_g_score < visited[neighbor]:
                h_score = min_heuristic(neighbor)
                new_f_score = new_g_score + h_score
                heapq.heappush(heap, (new_f_score, new_g_score, neighbor, path + [neighbor]))
    
    return None, nodes_explored, 0  # No path found


def greedy_best_first(building, start, goals, heuristic='manhattan'):
    """
    Greedy Best-First Search (Pure Heuristic)
    :param building: Building object
    :param start: Starting position (row, col)
    :param goals: List of goal positions (exits)
    :param heuristic: Type of heuristic ('manhattan' or 'euclidean')
    :return: (path, nodes_explored)
    """
    if not start or not goals:
        return None, 0
    
    # Choose heuristic function
    h_func = manhattan_distance if heuristic == 'manhattan' else euclidean_distance
    
    # Find the minimum heuristic to any goal
    def min_heuristic(pos):
        return min(h_func(pos, goal) for goal in goals)
    
    # Priority queue: (heuristic, position, path)
    heap = [(min_heuristic(start), start, [start])]
    visited = set()
    nodes_explored = 0
    
    while heap:
        h_score, current, path = heapq.heappop(heap)
        
        if current in visited:
            continue
        
        visited.add(current)
        nodes_explored += 1
        
        # Check if we reached any exit
        if current in goals:
            return path, nodes_explored
        
        # Explore neighbors
        for neighbor in building.get_neighbors(current[0], current[1]):
            if neighbor not in visited:
                h_score = min_heuristic(neighbor)
                heapq.heappush(heap, (h_score, neighbor, path + [neighbor]))
    
    return None, nodes_explored  # No path found


def find_path(building, algorithm='bfs', heuristic='manhattan'):
    """
    Find escape path using specified algorithm
    :param building: Building object
    :param algorithm: 'bfs', 'ucs', 'astar', or 'greedy'
    :param heuristic: 'manhattan' or 'euclidean' (for A* and Greedy)
    :return: Dictionary with path and statistics
    """
    start = building.start_position
    goals = building.exits
    
    if algorithm == 'bfs':
        path, nodes_explored = bfs(building, start, goals)
        return {
            'path': path,
            'nodes_explored': nodes_explored,
            'path_length': len(path) if path else 0,
            'algorithm': 'BFS'
        }
    
    elif algorithm == 'ucs':
        path, nodes_explored, cost = ucs(building, start, goals)
        return {
            'path': path,
            'nodes_explored': nodes_explored,
            'path_length': len(path) if path else 0,
            'cost': cost,
            'algorithm': 'UCS'
        }
    
    elif algorithm == 'astar':
        path, nodes_explored, cost = a_star(building, start, goals, heuristic)
        return {
            'path': path,
            'nodes_explored': nodes_explored,
            'path_length': len(path) if path else 0,
            'cost': cost,
            'algorithm': f'A* ({heuristic})',
            'heuristic': heuristic
        }
    
    elif algorithm == 'greedy':
        path, nodes_explored = greedy_best_first(building, start, goals, heuristic)
        return {
            'path': path,
            'nodes_explored': nodes_explored,
            'path_length': len(path) if path else 0,
            'algorithm': f'Greedy Best-First ({heuristic})',
            'heuristic': heuristic
        }
    
    else:
        return {'error': 'Unknown algorithm'}
