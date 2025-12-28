# 🔥 Fire Escape Simulator - Complete Technical Explanation

## 📋 Table of Contents
1. [Project Architecture Overview](#project-architecture-overview)
2. [Building Module Explained](#building-module-explained)
3. [Search Algorithms Deep Dive](#search-algorithms-deep-dive)
4. [Frontend Architecture](#frontend-architecture)
5. [Agent Animation System](#agent-animation-system)
6. [Algorithm Comparison System](#algorithm-comparison-system)
7. [Communication Flow](#communication-flow)
8. [Design Decisions & Trade-offs](#design-decisions--trade-offs)

---

## 🏗️ Project Architecture Overview

### **What is this project?**
A web-based AI pathfinding simulator that helps people escape from a building on fire by finding the fastest/safest route to exits using different search algorithms.

### **Why this architecture?**
- **Backend (Python)**: Handles complex algorithm logic and computations
- **Frontend (HTML/CSS/JS)**: Provides interactive visual interface
- **Flask Server**: Bridges backend and frontend via REST API

### **How do components connect?**
```
User Interface (Browser)
    ↓ (HTTP Request)
Flask Server (app.py)
    ↓ (Function Call)
Pathfinding Algorithms (pathfinding.py)
    ↓ (Uses)
Building Grid (building.py)
    ↓ (Returns Path)
Flask Server
    ↓ (JSON Response)
User Interface (Visualizes Path)
```

---

## 🏢 Building Module Explained

**File:** `building.py`

### **What does it do?**
Represents a building as a 2D grid where each cell can be:
- 0 = Empty space (walkable)
- 1 = Wall (obstacle)
- 2 = Fire (danger)
- 3 = Exit (goal)
- 4 = Start (person's location)
- 5 = Path (calculated route)

### **Why use a grid?**
- Simple to represent complex building layouts
- Easy to visualize
- Each cell represents a physical location
- Algorithms can navigate cell-by-cell

### **How does it work?**

#### 1. **Grid Initialization**
```python
def __init__(self, rows, cols):
    self.grid = [[0 for _ in range(cols)] for _ in range(rows)]
```
**Why:** Creates a 2D array (list of lists) representing the building floor plan

#### 2. **Setting Cell Values**
```python
def set_cell(self, row, col, value):
    if 0 <= row < self.rows and 0 <= col < self.cols:
        self.grid[row][col] = value
```
**Why:** Validates boundaries to prevent errors and updates cell type

#### 3. **Getting Valid Neighbors**
```python
def get_neighbors(self, row, col):
    neighbors = []
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]  # Up, Down, Left, Right
```
**Why:** 
- Only returns cells you can actually walk to
- Uses 4-directional movement (no diagonal)
- Checks if neighbor is walkable (not wall/fire)

**How it works:**
1. Starts from current position (row, col)
2. Checks 4 adjacent cells (up, down, left, right)
3. Returns only walkable neighbors
4. Used by pathfinding algorithms to explore the grid

#### 4. **Fire Spreading (Optional Feature)**
```python
def spread_fire(self):
    for fire_row, fire_col in self.fire_cells:
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            new_row, new_col = fire_row + dr, fire_col + dc
```
**Why:** Simulates realistic fire spreading to adjacent cells
**How:** Fire spreads to orthogonally adjacent empty cells

---

## 🧠 Search Algorithms Deep Dive

**File:** `pathfinding.py`

### **1. BFS (Breadth-First Search)**

#### **What is it?**
An uninformed search that explores all nodes at distance k before exploring nodes at distance k+1.

#### **Why use BFS?**
- **Guarantees shortest path** (in terms of number of steps)
- Complete (will find solution if it exists)
- Simple and reliable

#### **How does it work?**

```python
def bfs(building, start, goals):
    queue = deque([(start, [start])])
    visited = {start}
    
    while queue:
        current, path = queue.popleft()
        
        if current in goals:
            return path, nodes_explored
        
        for neighbor in building.get_neighbors(current[0], current[1]):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))
```

**Step-by-Step Execution:**
1. **Initialize:** 
   - Queue with starting position
   - Visited set to track explored cells
   
2. **Loop:**
   - Take the first item from queue (FIFO - First In First Out)
   - Check if it's an exit → if yes, DONE!
   - Get all walkable neighbors
   - Add unvisited neighbors to queue
   
3. **Why Queue?**
   - Ensures we explore level by level
   - Nearest cells are checked first
   - Guarantees shortest path

**Example:**
```
Start (S) → Exit (E)

Step 1: Explore S
Step 2: Explore all neighbors of S (distance 1)
Step 3: Explore all neighbors at distance 2
...until we find E
```

**Pros:**
✅ Always finds shortest path
✅ Complete and optimal
✅ Easy to understand

**Cons:**
❌ Explores many unnecessary nodes
❌ No sense of direction (uninformed)
❌ Memory intensive for large spaces

---

### **2. UCS (Uniform Cost Search)**

#### **What is it?**
Similar to BFS but considers the **cost** of each step, not just the number of steps.

#### **Why use UCS?**
- When different moves have different costs
- Example: Walking through smoke costs more than clear path
- Finds path with lowest total cost

#### **How does it work?**

```python
def ucs(building, start, goals):
    heap = [(0, start, [start])]  # (cost, position, path)
    visited = {start: 0}
    
    while heap:
        cost, current, path = heapq.heappop(heap)
        
        if current in goals:
            return path, nodes_explored, cost
        
        for neighbor in building.get_neighbors(current[0], current[1]):
            new_cost = cost + 1  # Each step costs 1
            
            if neighbor not in visited or new_cost < visited[neighbor]:
                visited[neighbor] = new_cost
                heapq.heappush(heap, (new_cost, neighbor, path + [neighbor]))
```

**Key Differences from BFS:**
1. **Priority Queue (Heap):** Not FIFO, explores lowest cost first
2. **Cost Tracking:** Each node stores its total cost from start
3. **Cost Comparison:** Can revisit nodes if we find a cheaper path

**Why Heap?**
- Automatically sorts by cost
- Always explores cheapest unexplored node
- Guarantees optimal cost path

**Example:**
```
All moves cost 1:
UCS behaves like BFS

Variable costs:
Path 1: Cost 10 (through clear area)
Path 2: Cost 15 (through smoke)
UCS chooses Path 1
```

**Pros:**
✅ Finds optimal cost path
✅ Handles variable costs
✅ Complete and optimal

**Cons:**
❌ Slower than A*
❌ Explores more nodes than A*
❌ No heuristic guidance

---

### **3. A* Search (A-Star)**

#### **What is it?**
An informed search that uses a **heuristic** to estimate distance to goal, making it much faster than BFS/UCS.

#### **Why use A*?**
- Combines benefits of UCS (optimal) and Greedy (fast)
- Uses heuristic to guide search toward goal
- Most popular pathfinding algorithm in games/robotics

#### **How does it work?**

```python
def a_star(building, start, goals, heuristic='manhattan'):
    # f(n) = g(n) + h(n)
    # g(n) = actual cost from start to n
    # h(n) = estimated cost from n to goal
    
    initial_h = min_heuristic(start)
    heap = [(initial_h, 0, start, [start])]  # (f_score, g_score, position, path)
    visited = {}
    
    while heap:
        f_score, g_score, current, path = heapq.heappop(heap)
        
        if current in goals:
            return path, nodes_explored, g_score
        
        for neighbor in building.get_neighbors(current[0], current[1]):
            new_g_score = g_score + 1
            h_score = min_heuristic(neighbor)
            new_f_score = new_g_score + h_score
            
            heapq.heappush(heap, (new_f_score, new_g_score, neighbor, path + [neighbor]))
```

**The Magic Formula: f(n) = g(n) + h(n)**

- **g(n):** Actual cost from start to current node
- **h(n):** Estimated cost from current to goal (heuristic)
- **f(n):** Total estimated cost of path through this node

**Example:**
```
Start → Current → Goal

g(n) = 5 (already walked 5 steps)
h(n) = 3 (estimated 3 steps to goal)
f(n) = 8 (total estimated path length)

A* explores nodes with lowest f(n) first
```

#### **Heuristics Explained:**

##### **Manhattan Distance (L1)**
```python
def manhattan_distance(pos1, pos2):
    return abs(pos1[0] - pos2[0]) + abs(pos1[1] - pos2[1])
```
**What:** Sum of horizontal and vertical distances
**Why:** Perfect for grid-based movement (no diagonals)
**Example:** From (0,0) to (3,4) = 3 + 4 = 7 steps

##### **Euclidean Distance (L2)**
```python
def euclidean_distance(pos1, pos2):
    return math.sqrt((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2)
```
**What:** Straight-line "as the crow flies" distance
**Why:** More accurate for open spaces
**Example:** From (0,0) to (3,4) = √(3² + 4²) = 5

**Which to use?**
- **Manhattan:** Grid-based movement (our case) ✅
- **Euclidean:** When diagonal movement allowed

#### **Why A* is Optimal:**
If heuristic is **admissible** (never overestimates), A* guarantees shortest path.

Manhattan distance is admissible because:
- Actual path length ≥ Manhattan distance
- It's optimistic (never overestimates)

**Pros:**
✅ Optimal with admissible heuristic
✅ Much faster than BFS/UCS
✅ Explores fewer nodes
✅ Industry standard for pathfinding

**Cons:**
❌ Requires good heuristic
❌ More complex to implement
❌ Slightly more memory usage

---

### **4. Greedy Best-First Search**

#### **What is it?**
Uses **only the heuristic** h(n), ignoring actual cost g(n). Pure estimation.

#### **Why use Greedy?**
- **Fastest** algorithm
- Good when speed > optimality
- Works well in simple scenarios

#### **How does it work?**

```python
def greedy_best_first(building, start, goals, heuristic='manhattan'):
    heap = [(min_heuristic(start), start, [start])]  # Only h(n), no g(n)
    visited = set()
    
    while heap:
        h_score, current, path = heapq.heappop(heap)
        
        if current in goals:
            return path, nodes_explored
        
        for neighbor in building.get_neighbors(current[0], current[1]):
            if neighbor not in visited:
                h_score = min_heuristic(neighbor)
                heapq.heappush(heap, (h_score, neighbor, path + [neighbor]))
```

**Key Difference from A*:**
- **A*:** f(n) = g(n) + h(n) [actual + estimated]
- **Greedy:** Only uses h(n) [estimated only]

**Why is it called "Greedy"?**
Always chooses the path that *looks* closest to goal, even if it's not optimal.

**Example:**
```
S → → → ↓
↓   W W ↓
→ → → → E

S = Start, E = Exit, W = Wall

Greedy goes straight toward E, hits wall, has to backtrack
A* would route around the wall from the start
```

**Pros:**
✅ Very fast
✅ Low memory usage
✅ Good for simple mazes

**Cons:**
❌ Not optimal (may find longer path)
❌ Can get stuck in dead ends
❌ Completely heuristic-dependent

---

## 🎨 Frontend Architecture

**Files:** `index.html`, `style.css`, `script.js`

### **HTML Structure**

#### **What does HTML do?**
Defines the structure and layout of the page.

#### **Key Components:**

##### **1. Control Panel (Left Side)**
```html
<div class="controls">
    <div class="control-section">
        <h3>Building Setup</h3>
        <!-- Grid size inputs and create button -->
    </div>
    
    <div class="control-section">
        <h3>Edit Mode</h3>
        <!-- Buttons to select what to place -->
    </div>
    
    <div class="control-section">
        <h3>Algorithm</h3>
        <!-- Dropdown to select algorithm -->
    </div>
</div>
```

**Why this structure?**
- Logical grouping of related controls
- Easy to navigate
- Clear visual hierarchy

##### **2. Grid Container (Right Side)**
```html
<div class="canvas-wrapper">
    <div id="grid"></div>
    <canvas id="agentCanvas"></canvas>
</div>
```

**Why two layers?**
- **Grid div:** Static cells (walls, fire, exits)
- **Canvas:** Dynamic agents (animated on top)
- Canvas has `pointer-events: none` so you can click through it

---

### **CSS Styling**

#### **What makes it look realistic?**

##### **1. Fire Animation**
```css
.cell.fire {
    background: radial-gradient(circle, #ff4444, #cc0000);
    animation: fireFlicker 0.3s infinite alternate;
    box-shadow: 0 0 15px rgba(255, 68, 68, 0.8);
}

@keyframes fireFlicker {
    0% { background: radial-gradient(circle, #ff4444, #cc0000); }
    50% { background: radial-gradient(circle, #ff6666, #dd1111); }
    100% { background: radial-gradient(circle, #ff2222, #aa0000); }
}
```

**Why this works:**
- **Radial gradient:** Creates depth (brighter center)
- **Animation:** Flickers between shades
- **Box shadow:** Glow effect
- **0.3s alternate:** Smooth, realistic flicker

##### **2. Exit Glow**
```css
.cell.exit {
    background: radial-gradient(circle, #00ff88, #00cc66);
    animation: exitGlow 2s infinite;
}

@keyframes exitGlow {
    0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 136, 0.6); }
    50% { box-shadow: 0 0 20px rgba(0, 255, 136, 1); }
}
```

**Why:** Draws attention to exits, looks like emergency lighting

##### **3. Path Animation**
```css
.cell.path {
    background: rgba(255, 200, 87, 0.6);
    animation: pathAppear 0.3s ease-out;
}

@keyframes pathAppear {
    from { transform: scale(0.8); }
    to { transform: scale(1); }
}
```

**Why:** Cells "pop in" for visual feedback

---

### **JavaScript Logic**

#### **Grid Creation**

```javascript
function createGrid() {
    rows = parseInt(document.getElementById('rows').value);
    cols = parseInt(document.getElementById('cols').value);
    
    grid = Array(rows).fill().map(() => Array(cols).fill(0));
```

**What happens:**
1. Reads grid dimensions from input fields
2. Creates 2D array (JavaScript version of Python's grid)
3. Creates HTML div for each cell
4. Attaches event listeners for mouse interaction

**Why `.fill().map()`?**
```javascript
// Wrong: Creates references to same array
Array(5).fill([0, 0, 0])  // All rows share same array!

// Correct: Creates new array for each row
Array(5).fill().map(() => [0, 0, 0])  // Each row is independent
```

#### **Mouse Drawing**

```javascript
cell.addEventListener('mousedown', () => {
    isMouseDown = true;
    setCellValue(i, j);
});

cell.addEventListener('mouseenter', () => {
    if (isMouseDown) {
        setCellValue(i, j);
    }
});
```

**Why this pattern?**
- **mousedown:** User starts drawing
- **mouseenter:** Continue drawing while mouse held
- **mouseup:** Stop drawing
- Allows "paint brush" style building creation

---

## 🏃 Agent Animation System

**File:** `script.js`

### **Agent Class**

```javascript
class Agent {
    constructor(id, startPos, path) {
        this.x = startPos[1] * cellSize + cellSize / 2;
        this.y = startPos[0] * cellSize + cellSize / 2;
        this.path = path;
        this.pathIndex = 0;
        this.speed = 2;
        this.radius = 8;
    }
```

**What:** Each agent is an independent object with:
- **Position:** x, y coordinates in pixels
- **Path:** Array of grid positions to follow
- **PathIndex:** Current step in the path
- **Speed:** Pixels moved per frame

### **Movement Logic**

```javascript
update() {
    const target = this.path[this.pathIndex];
    const targetX = target[1] * cellSize + cellSize / 2;
    const targetY = target[0] * cellSize + cellSize / 2;
    
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < this.speed) {
        this.pathIndex++;  // Reached target, move to next
    } else {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
    }
}
```

**How it works:**
1. **Get target:** Next cell in path
2. **Calculate direction:** Vector from current to target
3. **Calculate distance:** How far to target
4. **Move or advance:**
   - If close to target → move to next cell
   - Otherwise → move toward target at constant speed

**Why normalize direction?**
```javascript
// Without normalization:
this.x += dx;  // Speed depends on distance!

// With normalization:
this.x += (dx / distance) * this.speed;  // Constant speed
```

### **Animation Loop**

```javascript
function animate() {
    if (!simulationRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear canvas
    
    agents.forEach(agent => {
        agent.update();  // Move agent
        agent.draw(ctx);  // Draw agent
    });
    
    animationFrame = requestAnimationFrame(animate);  // Next frame
}
```

**Why `requestAnimationFrame`?**
- Synchronized with monitor refresh (60 FPS)
- Pauses when tab not visible (saves CPU)
- Smoother than `setInterval`

**How drawing works:**
1. Clear entire canvas
2. Update all agent positions
3. Draw all agents at new positions
4. Schedule next frame
5. Repeat forever

---

## ⚖️ Algorithm Comparison System

### **Scoring Logic**

```javascript
const shortestPath = Math.min(...Object.values(results).map(r => r.path_length));

for (const [algo, result] of Object.entries(results)) {
    const pathPenalty = (result.path_length - shortestPath) * 10;
    const efficiencyScore = result.nodes_explored;
    const score = pathPenalty + efficiencyScore;
}
```

**Why this scoring?**

#### **Priority 1: Path Optimality (10x weight)**
```javascript
pathPenalty = (result.path_length - shortestPath) * 10
```
- Finding the shortest path is MOST important
- Each extra step heavily penalized
- Example: 2 extra steps = 20 penalty points

#### **Priority 2: Efficiency**
```javascript
efficiencyScore = result.nodes_explored
```
- Among algorithms with same path length, prefer fewer explorations
- Example: BFS and A* both find 12-step path
  - BFS explores 50 nodes
  - A* explores 20 nodes
  - A* wins (more efficient)

**Final Score = Path Penalty + Efficiency**
- Lower score = better algorithm
- Balances optimality and speed

### **Recommendation Logic**

```javascript
function getAlgoAdvice(algo, result, allResults, shortestPath) {
    const isOptimal = result.path_length === shortestPath;
    const efficiency = result.path_length / result.nodes_explored;
```

**Different advice for different scenarios:**

#### **BFS:**
- Optimal + Few nodes → "Perfect!"
- Optimal + Many nodes → "Found optimal but explored too much"
- Not optimal → "Should find optimal, check for bugs"

#### **A*:**
- Optimal + High efficiency → "Outstanding!"
- Optimal + Low efficiency → "Optimal but heuristic could improve"
- Not optimal → "Heuristic needs improvement"

#### **Greedy:**
- Optimal → "Lucky! Found optimal by chance"
- Close to optimal → "Close but not guaranteed"
- Far from optimal → "Use A* for optimal paths"

---

## 🔄 Communication Flow

### **Frontend → Backend Request**

```javascript
const response = await fetch('/find_path', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        grid: grid,
        algorithm: 'astar',
        heuristic: 'manhattan'
    })
});
```

**What happens:**
1. User clicks "Find Path"
2. JavaScript collects grid data and settings
3. Converts to JSON string
4. Sends HTTP POST request to Flask server

### **Flask Server Processing**

```python
@app.route('/find_path', methods=['POST'])
def find_path_endpoint():
    data = request.json
    grid_data = data.get('grid')
    algorithm = data.get('algorithm')
    
    # Create building from grid
    building = Building(rows, cols)
    for i in range(rows):
        for j in range(cols):
            building.set_cell(i, j, grid_data[i][j])
    
    # Run pathfinding
    result = find_path(building, algorithm, heuristic)
    
    return jsonify(result)
```

**What happens:**
1. Flask receives HTTP request
2. Parses JSON data
3. Recreates building grid
4. Runs selected algorithm
5. Returns result as JSON

### **Backend → Frontend Response**

```javascript
const result = await response.json();

if (result.path) {
    escapePath = result.path;
    
    result.path.forEach((pos, index) => {
        setTimeout(() => {
            const [row, col] = pos;
            grid[row][col] = 5;
            updateCellDisplay(row, col);
        }, index * 30);
    });
}
```

**What happens:**
1. Frontend receives JSON response
2. Extracts path array
3. Animates path cell by cell with delays
4. Updates statistics display

---

## 🎯 Design Decisions & Trade-offs

### **1. Grid-Based vs Continuous Space**

**Decision:** Grid-based (discrete)

**Why:**
✅ Simple to implement
✅ Easy to visualize
✅ Clear cell states
✅ Standard for pathfinding education

**Trade-off:**
❌ Less realistic than continuous space
❌ Limited to 4 directions
❌ Can't represent exact building layout

### **2. Client-Side vs Server-Side Rendering**

**Decision:** Hybrid approach

**Client-Side (JavaScript):**
- Grid drawing
- Agent animation
- User interaction

**Server-Side (Python):**
- Algorithm computation
- Path calculation

**Why:**
✅ Offload heavy computation to server
✅ Keep UI responsive
✅ Easier to implement algorithms in Python
✅ Can handle larger grids

### **3. Canvas vs DOM for Agents**

**Decision:** Canvas for agents, DOM for grid

**Why Canvas:**
✅ Smooth animation
✅ Better performance for many agents
✅ Can draw circles, shadows, etc.

**Why DOM for Grid:**
✅ Easier click detection
✅ CSS styling
✅ Accessibility

### **4. Manhattan vs Euclidean Heuristic**

**Decision:** Manhattan as default

**Why:**
✅ More accurate for grid movement
✅ Admissible (guarantees A* optimality)
✅ Faster to compute (no square root)

**When Euclidean:**
✅ When allowing diagonal movement
✅ When grid is just approximation
✅ For educational comparison

### **5. Synchronous vs Asynchronous Comparison**

**Decision:** Sequential algorithm execution

**Why:**
✅ Simpler implementation
✅ Consistent timing
✅ Easier to debug

**Trade-off:**
❌ Slower than parallel execution
❌ User waits for all algorithms

**Could improve:**
- Run algorithms in parallel
- Use Web Workers for client-side execution

---

## 🎓 Key Concepts for Your Presentation

### **1. Algorithm Comparison Summary**

| Algorithm | Optimal? | Fast? | Memory | Best Use Case |
|-----------|----------|-------|--------|---------------|
| BFS | ✅ Yes | ❌ Slow | 😐 Medium | Simple mazes, guarantee optimal |
| UCS | ✅ Yes | ❌ Slow | 😐 Medium | Variable costs, need optimal |
| A* | ✅ Yes* | ✅ Fast | 😐 Medium | **General pathfinding (BEST)** |
| Greedy | ❌ No | ✅ Very Fast | ✅ Low | Time-critical, simple scenarios |

*with admissible heuristic

### **2. Time Complexity**

- **BFS/UCS:** O(V + E) where V = vertices, E = edges
- **A*:** O(E) but explores fewer nodes with good heuristic
- **Greedy:** O(E) but can explore wrong paths

### **3. Space Complexity**

All algorithms: O(V) for storing visited nodes

### **4. Why A* Usually Wins**

1. **Optimal:** Finds shortest path (like BFS/UCS)
2. **Efficient:** Explores fewer nodes (like Greedy)
3. **Informed:** Uses heuristic to guide search
4. **Proven:** f(n) = g(n) + h(n) balances actual + estimated cost

### **5. Real-World Applications**

- **BFS:** Social networks (friend connections)
- **UCS:** GPS navigation (roads have different costs)
- **A*:** Video games (NPC pathfinding), robotics
- **Greedy:** Quick approximations, real-time systems

---

## 📝 Common Questions & Answers

### **Q: Why is A* better than BFS?**
**A:** A* uses a heuristic to guide the search toward the goal, exploring far fewer nodes while still guaranteeing an optimal path. BFS blindly explores in all directions.

### **Q: When would Greedy beat A*?**
**A:** When the heuristic is very accurate and the environment is simple. Greedy might find the path faster by chance, but A* guarantees optimality.

### **Q: What if there's no path to exit?**
**A:** All algorithms will explore all reachable cells and return None/null, indicating no path exists.

### **Q: Why use Flask instead of pure JavaScript?**
**A:** Python is better for algorithm implementation (cleaner syntax, better for teaching). Flask provides clean API between frontend and backend.

### **Q: How do you handle multiple exits?**
**A:** Algorithms find the nearest exit by checking if current position is in the list of goal positions (exits).

### **Q: What makes a heuristic "admissible"?**
**A:** A heuristic that never overestimates the actual cost to the goal. Manhattan distance is admissible because you can't reach a point in fewer steps than the Manhattan distance.

---

## 🚀 Extension Ideas (For Extra Credit)

1. **Dynamic Fire Spreading:** Fire spreads during pathfinding
2. **Multi-Agent Coordination:** Agents avoid each other
3. **Bidirectional Search:** Search from both start and goal
4. **Jump Point Search:** Optimization of A* for uniform grids
5. **3D Building:** Multiple floors with stairs
6. **Real-Time Replanning:** Path updates as fire spreads
7. **Cost-Based Movement:** Different terrain costs
8. **Benchmark Mode:** Compare algorithm performance graphs

---

## 📚 Study Tips for Presentation

### **What to Memorize:**

1. **Algorithm names and main differences**
2. **Time/space complexity basics**
3. **Why A* is optimal (f = g + h)**
4. **What makes heuristics admissible**
5. **One real-world use case per algorithm**

### **What to Demonstrate:**

1. **Create random building**
2. **Compare all algorithms**
3. **Show recommendation system**
4. **Start simulation**
5. **Explain why certain algorithm won**

### **Questions You'll Likely Get:**

1. "Explain how A* works" → f(n) = g(n) + h(n)
2. "Why not just use Greedy?" → Not optimal
3. "What's the difference between BFS and A*?" → Informed vs uninformed
4. "How do you prevent infinite loops?" → Visited set
5. "Can you add diagonal movement?" → Yes, change neighbors function

---

## 🎉 Final Checklist

- [ ] Understand grid representation
- [ ] Know each algorithm's logic
- [ ] Explain heuristic functions
- [ ] Understand frontend-backend communication
- [ ] Know agent animation basics
- [ ] Explain scoring system
- [ ] Practice live demo
- [ ] Prepare for "what if" questions
- [ ] Have backup scenarios ready
- [ ] Test all features work

---

**Good luck with your project! You've got this! 🔥🚀**
