let grid = [];
let rows = 15;
let cols = 20;
let currentMode = 0;
let isMouseDown = false;
let agents = [];
let simulationRunning = false;
let animationFrame = null;
let canvas = null;
let ctx = null;
let cellSize = 30;
let escapePath = null;

// Agent class
class Agent {
    constructor(id, startPos, path) {
        this.id = id;
        this.x = startPos[1] * cellSize + cellSize / 2;
        this.y = startPos[0] * cellSize + cellSize / 2;
        this.path = path;
        this.pathIndex = 0;
        this.speed = 2;
        this.radius = 8;
        this.color = `hsl(${210 + Math.random() * 30}, 80%, 50%)`;
        this.reached = false;
    }

    update() {
        if (this.reached || !this.path || this.pathIndex >= this.path.length) {
            this.reached = true;
            return;
        }

        const target = this.path[this.pathIndex];
        const targetX = target[1] * cellSize + cellSize / 2;
        const targetY = target[0] * cellSize + cellSize / 2;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.pathIndex++;
            if (this.pathIndex >= this.path.length) {
                this.reached = true;
            }
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    draw(ctx) {
        if (this.reached) return;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x + 2, this.y + 2, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Agent body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, this.radius / 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize on load
window.onload = function() {
    createGrid();
    updateHeuristicVisibility();
    document.getElementById('algorithm').addEventListener('change', updateHeuristicVisibility);
    
    // Setup canvas
    canvas = document.getElementById('agentCanvas');
    ctx = canvas.getContext('2d');
    updateCanvasSize();
};

function updateHeuristicVisibility() {
    const algorithm = document.getElementById('algorithm').value;
    const heuristicSelect = document.getElementById('heuristicSelect');
    
    if (algorithm === 'astar' || algorithm === 'greedy') {
        heuristicSelect.style.display = 'block';
    } else {
        heuristicSelect.style.display = 'none';
    }
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
}

function createGrid() {
    rows = parseInt(document.getElementById('rows').value);
    cols = parseInt(document.getElementById('cols').value);
    
    grid = Array(rows).fill().map(() => Array(cols).fill(0));
    
    const gridElement = document.getElementById('grid');
    gridElement.innerHTML = '';
    gridElement.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    gridElement.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell empty';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            cell.addEventListener('mousedown', () => {
                isMouseDown = true;
                setCellValue(i, j);
            });
            
            cell.addEventListener('mouseenter', () => {
                if (isMouseDown) {
                    setCellValue(i, j);
                }
            });
            
            gridElement.appendChild(cell);
        }
    }
    
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
    
    updateCanvasSize();
    stopSimulation();
}

function setCellValue(row, col) {
    // If setting start (4), clear previous start
    if (currentMode === 4) {
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (grid[i][j] === 4) {
                    grid[i][j] = 0;
                    updateCellDisplay(i, j);
                }
            }
        }
    }
    
    grid[row][col] = currentMode;
    updateCellDisplay(row, col);
}

function updateCellDisplay(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cell.className = 'cell';
    
    switch(grid[row][col]) {
        case 0: cell.classList.add('empty'); break;
        case 1: cell.classList.add('wall'); break;
        case 2: cell.classList.add('fire'); break;
        case 3: cell.classList.add('exit'); break;
        case 4: cell.classList.add('start'); break;
        case 5: cell.classList.add('path'); break;
    }
}

function resetGrid() {
    grid = Array(rows).fill().map(() => Array(cols).fill(0));
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            updateCellDisplay(i, j);
        }
    }
    document.getElementById('statsContent').innerHTML = '<p>Grid reset. Click "Find Path" to see results.</p>';
    stopSimulation();
    escapePath = null;
}

function updateCanvasSize() {
    if (canvas) {
        canvas.width = cols * cellSize;
        canvas.height = rows * cellSize;
    }
}

function startSimulation() {
    if (!escapePath || escapePath.length === 0) {
        alert('Please find a path first!');
        return;
    }

    stopSimulation();
    
    const agentCount = parseInt(document.getElementById('agentCount').value);
    const speed = parseInt(document.getElementById('speedControl').value);
    
    agents = [];
    
    // Create agents starting from the actual start position
    const startPos = escapePath[0];
    
    for (let i = 0; i < agentCount; i++) {
        const agent = new Agent(i, startPos, [...escapePath]); // Clone the path
        agent.speed = speed / 2;
        
        // Stagger agents along the path
        if (i > 0) {
            agent.pathIndex = Math.min(i, escapePath.length - 1);
            const pos = escapePath[agent.pathIndex];
            agent.x = pos[1] * cellSize + cellSize / 2;
            agent.y = pos[0] * cellSize + cellSize / 2;
        }
        
        agents.push(agent);
    }
    
    simulationRunning = true;
    animate();
}

function stopSimulation() {
    simulationRunning = false;
    agents = [];
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function animate() {
    if (!simulationRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let allReached = true;
    agents.forEach(agent => {
        agent.update();
        agent.draw(ctx);
        if (!agent.reached) allReached = false;
    });
    
    if (allReached && agents.length > 0) {
        setTimeout(() => {
            document.getElementById('statsContent').innerHTML += 
                '<p style=\"color: green;\">✅ All agents evacuated safely!</p>';
        }, 500);
        simulationRunning = false;
        return;
    }
    
    animationFrame = requestAnimationFrame(animate);
}

function clearPath() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 5) {
                grid[i][j] = 0;
                updateCellDisplay(i, j);
            }
        }
    }
    stopSimulation();
}

function randomBuilding() {
    resetGrid();
    
    // Add random walls
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (Math.random() < 0.2) {
                grid[i][j] = 1;
                updateCellDisplay(i, j);
            }
        }
    }
    
    // Add fire (2-4 spots)
    const fireCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < fireCount; i++) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        if (grid[row][col] === 0) {
            grid[row][col] = 2;
            updateCellDisplay(row, col);
        }
    }
    
    // Add start position (random)
    let startPlaced = false;
    while (!startPlaced) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        if (grid[row][col] === 0) {
            grid[row][col] = 4;
            updateCellDisplay(row, col);
            startPlaced = true;
        }
    }
    
    // Add exits (2-3 on edges)
    const exitCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < exitCount; i++) {
        let exitPlaced = false;
        while (!exitPlaced) {
            const edge = Math.floor(Math.random() * 4);
            let row, col;
            
            switch(edge) {
                case 0: row = 0; col = Math.floor(Math.random() * cols); break;
                case 1: row = rows - 1; col = Math.floor(Math.random() * cols); break;
                case 2: row = Math.floor(Math.random() * rows); col = 0; break;
                case 3: row = Math.floor(Math.random() * rows); col = cols - 1; break;
            }
            
            if (grid[row][col] === 0 || grid[row][col] === 1) {
                grid[row][col] = 3;
                updateCellDisplay(row, col);
                exitPlaced = true;
            }
        }
    }
}

async function findPath() {
    clearPath();
    stopSimulation();
    
    const algorithm = document.getElementById('algorithm').value;
    const heuristic = document.getElementById('heuristic').value;
    
    const data = {
        grid: grid,
        algorithm: algorithm,
        heuristic: heuristic
    };
    
    try {
        const response = await fetch('/find_path', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.error) {
            document.getElementById('statsContent').innerHTML = 
                `<p style="color: red;">❌ ${result.error}</p>`;
            document.getElementById('recommendation').style.display = 'none';
            return;
        }
        
        if (result.path) {
            escapePath = result.path;
            
            // Draw path with animation
            result.path.forEach((pos, index) => {
                setTimeout(() => {
                    const [row, col] = pos;
                    if (grid[row][col] === 0) {
                        grid[row][col] = 5;
                        updateCellDisplay(row, col);
                    }
                }, index * 30);
            });
            
            // Display statistics
            displayStats(result);
            
            // Show recommendation for single algorithm
            showSingleAlgoRecommendation(algorithm, result);
        } else {
            escapePath = null;
            document.getElementById('statsContent').innerHTML = 
                `<p style="color: red;">❌ No path found!</p>
                 <p><strong>Nodes Explored:</strong> ${result.nodes_explored}</p>`;
            document.getElementById('recommendation').style.display = 'none';
        }
    } catch (error) {
        document.getElementById('statsContent').innerHTML = 
            `<p style="color: red;">❌ Error: ${error.message}</p>`;
        document.getElementById('recommendation').style.display = 'none';
    }
}

function displayStats(result) {
    const statsHtml = `
        <p><strong>Algorithm:</strong> ${result.algorithm}</p>
        <p><strong>Path Found:</strong> ✅ Yes</p>
        <p><strong>Path Length:</strong> ${result.path_length} steps</p>
        <p><strong>Nodes Explored:</strong> ${result.nodes_explored}</p>
        ${result.cost !== undefined ? `<p><strong>Total Cost:</strong> ${result.cost}</p>` : ''}
        ${result.heuristic ? `<p><strong>Heuristic:</strong> ${result.heuristic}</p>` : ''}
        <p><strong>Efficiency:</strong> ${(result.path_length / result.nodes_explored * 100).toFixed(1)}%</p>
        <p style="color: #667eea; margin-top: 10px;">💡 Click "Start Simulation" to see agents evacuate!</p>
    `;
    document.getElementById('statsContent').innerHTML = statsHtml;
}

function showSingleAlgoRecommendation(algorithm, result) {
    const recommendations = {
        'bfs': {
            name: 'BFS (Breadth-First Search)',
            pros: ['Guarantees shortest path', 'Complete (will find solution if exists)', 'Simple to understand'],
            cons: ['Explores many unnecessary nodes', 'Memory intensive', 'No cost consideration'],
            bestFor: 'When all moves have equal cost and you need guaranteed shortest path'
        },
        'ucs': {
            name: 'UCS (Uniform Cost Search)',
            pros: ['Finds optimal cost path', 'Handles variable costs', 'Complete and optimal'],
            cons: ['Slower than A*', 'Explores more nodes than A*', 'No heuristic guidance'],
            bestFor: 'When moves have different costs and you need optimal solution'
        },
        'astar': {
            name: 'A* Search',
            pros: ['Fast and efficient', 'Optimal with good heuristic', 'Best of both worlds'],
            cons: ['Requires good heuristic', 'More complex', 'Heuristic dependent'],
            bestFor: 'When you want optimal path quickly with informed search'
        },
        'greedy': {
            name: 'Greedy Best-First Search',
            pros: ['Very fast', 'Low memory usage', 'Good for time-critical scenarios'],
            cons: ['Not optimal', 'May get stuck', 'Heuristic dependent'],
            bestFor: 'When speed is more important than optimality'
        }
    };

    const info = recommendations[algorithm];
    const efficiency = (result.path_length / result.nodes_explored * 100).toFixed(1);
    
    let recHtml = `
        <div class="algo-comparison">
            <h4>${info.name}</h4>
            <p><strong>Efficiency:</strong> ${efficiency}%</p>
            <p class="pros">✅ <strong>Pros:</strong></p>
            <ul>${info.pros.map(p => `<li class="pros">${p}</li>`).join('')}</ul>
            <p class="cons">❌ <strong>Cons:</strong></p>
            <ul>${info.cons.map(c => `<li class="cons">${c}</li>`).join('')}</ul>
            <p><strong>💡 Best For:</strong> ${info.bestFor}</p>
        </div>
    `;
    
    document.getElementById('recommendationContent').innerHTML = recHtml;
    document.getElementById('recommendation').style.display = 'block';
}

async function compareAlgorithms() {
    clearPath();
    stopSimulation();
    
    // Check if building is valid
    let hasStart = false, hasExit = false;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 4) hasStart = true;
            if (grid[i][j] === 3) hasExit = true;
        }
    }
    
    if (!hasStart || !hasExit) {
        alert('Please set a start position and at least one exit first!');
        return;
    }
    
    document.getElementById('statsContent').innerHTML = '<p>⏳ Comparing all algorithms...</p>';
    
    const algorithms = ['bfs', 'ucs', 'astar', 'greedy'];
    const results = {};
    
    try {
        // Run all algorithms
        for (const algo of algorithms) {
            const data = {
                grid: grid,
                algorithm: algo,
                heuristic: 'manhattan'
            };
            
            const response = await fetch('/find_path', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            if (!result.error && result.path) {
                results[algo] = result;
            }
        }
        
        // Display comparison
        displayComparison(results);
        
    } catch (error) {
        document.getElementById('statsContent').innerHTML = 
            `<p style="color: red;">❌ Error: ${error.message}</p>`;
    }
}

function displayComparison(results) {
    if (Object.keys(results).length === 0) {
        document.getElementById('statsContent').innerHTML = 
            '<p style="color: red;">❌ No algorithms found a path!</p>';
        return;
    }
    
    // Find best algorithm based on multiple criteria
    let bestAlgo = null;
    let bestScore = Infinity;
    
    // First find the shortest path length
    const shortestPath = Math.min(...Object.values(results).map(r => r.path_length));
    
    for (const [algo, result] of Object.entries(results)) {
        // Scoring: Lower is better
        // Priority: 1. Path optimality 2. Efficiency (fewer nodes explored)
        const pathPenalty = (result.path_length - shortestPath) * 10; // Heavily penalize longer paths
        const efficiencyScore = result.nodes_explored; // Prefer fewer explored nodes
        const score = pathPenalty + efficiencyScore;
        
        if (score < bestScore) {
            bestScore = score;
            bestAlgo = algo;
        }
    }
    
    // Create comparison table
    let tableHtml = `
        <table class="comparison-table">
            <tr>
                <th>Algorithm</th>
                <th>Path Length</th>
                <th>Nodes Explored</th>
                <th>Efficiency</th>
                <th>Optimal</th>
            </tr>
    `;
    
    const algoNames = {
        'bfs': 'BFS',
        'ucs': 'UCS',
        'astar': 'A*',
        'greedy': 'Greedy'
    };
    
    for (const [algo, result] of Object.entries(results)) {
        const efficiency = (result.path_length / result.nodes_explored * 100).toFixed(1);
        const isWinner = algo === bestAlgo;
        const isOptimal = result.path_length === shortestPath;
        
        tableHtml += `
            <tr class="${isWinner ? 'winner' : ''}">
                <td>${algoNames[algo]} ${isWinner ? '🏆' : ''}</td>
                <td>${result.path_length}</td>
                <td>${result.nodes_explored}</td>
                <td>${efficiency}%</td>
                <td>${isOptimal ? '✅' : '❌'}</td>
            </tr>
        `;
    }
    
    tableHtml += '</table>';
    
    document.getElementById('statsContent').innerHTML = `
        <h4>📊 Algorithm Comparison</h4>
        ${tableHtml}
        <p style="margin-top: 10px;"><strong>Winner:</strong> ${algoNames[bestAlgo]} 🏆</p>
        <p><small>Best algorithm balances path optimality and efficiency</small></p>
    `;
    
    // Show detailed recommendation
    showDetailedRecommendation(results, bestAlgo);
    
    // Draw the best path
    if (results[bestAlgo] && results[bestAlgo].path) {
        escapePath = results[bestAlgo].path;
        results[bestAlgo].path.forEach((pos, index) => {
            setTimeout(() => {
                const [row, col] = pos;
                if (grid[row][col] === 0) {
                    grid[row][col] = 5;
                    updateCellDisplay(row, col);
                }
            }, index * 20);
        });
    }
}

function showDetailedRecommendation(results, bestAlgo) {
    const algoInfo = {
        'bfs': {
            name: 'BFS (Breadth-First Search)',
            emoji: '🌊',
            strength: 'Guarantees shortest path in unweighted graphs'
        },
        'ucs': {
            name: 'UCS (Uniform Cost Search)',
            emoji: '💰',
            strength: 'Finds optimal path considering costs'
        },
        'astar': {
            name: 'A* Search',
            emoji: '⭐',
            strength: 'Optimal and efficient with good heuristic'
        },
        'greedy': {
            name: 'Greedy Best-First',
            emoji: '⚡',
            strength: 'Fastest but not always optimal'
        }
    };
    
    const winner = results[bestAlgo];
    const info = algoInfo[bestAlgo];
    const shortestPath = Math.min(...Object.values(results).map(r => r.path_length));
    const isOptimal = winner.path_length === shortestPath;
    
    let recHtml = `
        <div class="best-algo">
            ${info.emoji} RECOMMENDED: ${info.name}
        </div>
        <p><strong>Why this is best for this scenario:</strong></p>
        <ul>
            <li>✅ Path Length: ${winner.path_length} steps ${isOptimal ? '(OPTIMAL ⭐)' : ''}</li>
            <li>✅ Nodes Explored: ${winner.nodes_explored}</li>
            <li>✅ Efficiency: ${(winner.path_length / winner.nodes_explored * 100).toFixed(1)}%</li>
            <li>✅ ${info.strength}</li>
        </ul>
        
        <p style="margin-top: 10px;"><strong>📋 Detailed Analysis:</strong></p>
    `;
    
    // Sort algorithms by performance
    const sortedAlgos = Object.entries(results).sort((a, b) => {
        const scoreA = (a[1].path_length - shortestPath) * 10 + a[1].nodes_explored;
        const scoreB = (b[1].path_length - shortestPath) * 10 + b[1].nodes_explored;
        return scoreA - scoreB;
    });
    
    // Add analysis for each algorithm
    for (const [algo, result] of sortedAlgos) {
        const aInfo = algoInfo[algo];
        const efficiency = (result.path_length / result.nodes_explored * 100).toFixed(1);
        const isBest = algo === bestAlgo;
        const pathOptimal = result.path_length === shortestPath;
        
        recHtml += `
            <div class="algo-comparison" style="${isBest ? 'border-left-color: #2ecc71; border-left-width: 6px;' : ''}">
                <strong>${aInfo.emoji} ${aInfo.name}</strong> ${isBest ? '👑' : ''}
                <br>Path: ${result.path_length} ${pathOptimal ? '✅' : '❌'} | Explored: ${result.nodes_explored} | Efficiency: ${efficiency}%
                <br><small>${getAlgoAdvice(algo, result, results, shortestPath)}</small>
            </div>
        `;
    }
    
    document.getElementById('recommendationContent').innerHTML = recHtml;
    document.getElementById('recommendation').style.display = 'block';
}

function getAlgoAdvice(algo, result, allResults, shortestPath) {
    const efficiency = result.path_length / result.nodes_explored;
    const isOptimal = result.path_length === shortestPath;
    const fewestNodes = Math.min(...Object.values(allResults).map(r => r.nodes_explored));
    
    const advice = {
        'bfs': 
            isOptimal && result.nodes_explored === fewestNodes ? 
                '✅ Perfect! Found optimal path with minimal exploration.' :
            isOptimal ? 
                '✅ Found optimal path, but explored many nodes.' :
                '⚠️ Path is not optimal. Check for obstacles.',
        
        'ucs': 
            isOptimal && result.nodes_explored < Object.values(allResults).find(r => r.algorithm?.includes('BFS'))?.nodes_explored ? 
                '✅ Excellent! Optimal path with good efficiency.' :
            isOptimal ? 
                '✅ Optimal path found!' :
                '⚠️ Should find optimal path. Check implementation.',
        
        'astar': 
            isOptimal && efficiency > 0.5 ? 
                '✅ Outstanding! Optimal path with best efficiency!' :
            isOptimal && efficiency > 0.3 ? 
                '✅ Great! Optimal path found efficiently.' :
            isOptimal ?
                '✅ Optimal path, but could be more efficient.' :
                '⚠️ Heuristic may need improvement.',
        
        'greedy': 
            isOptimal ? 
                '✅ Lucky! Found optimal path despite being greedy!' :
            result.path_length <= shortestPath + 2 ?
                '⚠️ Path is close to optimal but not guaranteed.' :
                '❌ Path is suboptimal. Use A* or BFS for optimal paths.'
    };
    
    return advice[algo] || '';
}
