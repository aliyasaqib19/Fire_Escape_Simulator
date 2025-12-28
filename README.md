# 🔥 Fire Escape Simulator

An AI-powered pathfinding simulator that finds the fastest escape route from a building on fire using various search algorithms.

## 📋 Project Overview

**Course:** Artificial Intelligence  
**Project Type:** Semester Project  
**Algorithms Implemented:**
- BFS (Breadth-First Search)
- UCS (Uniform Cost Search)
- A* Search (with Manhattan & Euclidean heuristics)
- Greedy Best-First Search (Pure Heuristic)

## ✨ Features

- **Interactive Grid Builder**: Draw walls, place fire, set start position and exits
- **Multiple Search Algorithms**: Compare different pathfinding approaches
- **Visual Path Animation**: See the path discovery in real-time
- **Statistics Display**: View path length, nodes explored, and algorithm performance
- **Random Building Generator**: Quickly create test scenarios
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Technology Stack

- **Backend**: Python 3.x with Flask
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Algorithms**: Custom implementations of BFS, UCS, A*, and Greedy Best-First

## 📦 Installation

### Prerequisites
- Python 3.7 or higher
- pip (Python package installer)

### Setup Steps

1. **Clone or navigate to the project directory**
```bash
cd Ai_Project
```

2. **Install required dependencies**
```bash
pip install -r requirements.txt
```

3. **Run the application**
```bash
python app.py
```

4. **Open your browser**
Navigate to: `http://localhost:5000`

## 🎮 How to Use

### Building Setup
1. **Create Grid**: Set grid dimensions (rows × columns)
2. **Edit Mode**: Select what to place on the grid
   - **Empty**: Clear cells
   - **Wall**: Create obstacles
   - **Fire**: Place fire sources
   - **Exit**: Mark escape points
   - **Start**: Set starting position (person location)

### Finding the Path
1. Place at least one **Start** position (person)
2. Place at least one **Exit** (door/escape route)
3. Optionally add **Walls** and **Fire**
4. Select an **Algorithm** from the dropdown
5. Click **"Find Path"** to see the escape route

### Controls
- **Random Building**: Generate a random scenario
- **Clear Path**: Remove the current path visualization
- **Reset Grid**: Clear the entire grid

## 🧠 Algorithm Comparison

### BFS (Breadth-First Search)
- **Type**: Uninformed search
- **Guarantee**: Finds shortest path (in terms of steps)
- **Speed**: Moderate
- **Use Case**: When all moves have equal cost

### UCS (Uniform Cost Search)
- **Type**: Uninformed search with cost consideration
- **Guarantee**: Finds lowest cost path
- **Speed**: Moderate
- **Use Case**: When moves have different costs

### A* Search
- **Type**: Informed search (uses heuristic)
- **Guarantee**: Finds optimal path (with admissible heuristic)
- **Speed**: Fast
- **Use Case**: When you want optimal solution quickly
- **Heuristics**: Manhattan distance or Euclidean distance

### Greedy Best-First Search
- **Type**: Pure heuristic search
- **Guarantee**: No guarantee of optimal path
- **Speed**: Very fast
- **Use Case**: When speed matters more than optimality

## 📁 Project Structure

```
Ai_Project/
│
├── app.py                  # Flask server and API endpoints
├── building.py             # Building grid and fire simulation
├── pathfinding.py          # Search algorithms implementation
├── requirements.txt        # Python dependencies
├── README.md              # Project documentation
│
└── static/
    ├── index.html         # Main HTML page
    ├── style.css          # Styling and animations
    └── script.js          # Frontend logic and interactions
```

## 🔍 Algorithm Implementation Details

### File: `pathfinding.py`
Contains implementations of all search algorithms:
- `bfs()`: Breadth-first search with queue
- `ucs()`: Uniform cost search with priority queue
- `a_star()`: A* search with f(n) = g(n) + h(n)
- `greedy_best_first()`: Pure heuristic search

### File: `building.py`
Manages the building grid:
- Cell types and state management
- Fire spreading simulation
- Neighbor generation for pathfinding
- Grid validation

## 🎨 Color Coding

- **White**: Empty space
- **Dark Gray**: Wall (obstacle)
- **Red (animated)**: Fire
- **Green**: Exit (🚪)
- **Blue**: Start position (🧍)
- **Orange**: Escape path

## 🚀 Future Enhancements

Possible improvements for the project:
- [ ] Dynamic fire spreading during pathfinding
- [ ] Multiple agents escaping simultaneously
- [ ] Different movement costs (stairs, corridors)
- [ ] 3D building visualization
- [ ] Real-time algorithm comparison
- [ ] Save/load building layouts
- [ ] Bidirectional search algorithms

## 📊 Testing Scenarios

Try these scenarios to test different algorithms:

1. **Simple Path**: Straight line with no obstacles
2. **Maze**: Complex wall layout
3. **Fire Surrounded**: Start position surrounded by fire
4. **Multiple Exits**: Compare which exit is chosen
5. **Long vs Short Path**: Test heuristic effectiveness

## 🐛 Troubleshooting

**Issue**: "No module named flask"
- **Solution**: Run `pip install -r requirements.txt`

**Issue**: "Port 5000 already in use"
- **Solution**: Change port in `app.py` (line: `app.run(debug=True, port=5000)`)

**Issue**: Path not appearing
- **Solution**: Ensure you have both Start position and at least one Exit

## 👨‍💻 Author

**AI Semester Project**  
Developed for AI course curriculum

## 📝 License

This project is created for educational purposes.

## 🙏 Acknowledgments

- AI course instructors and materials
- Flask and Python communities
- Pathfinding algorithm research papers

---

**Enjoy escaping from virtual fires! 🔥🚪**
