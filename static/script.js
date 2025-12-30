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
let allFoundPaths = []; // Store all paths found to all exits

// 🎮 3D VISUALIZATION SYSTEM
let view3D = {
    enabled: false,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    building: null,
    agents3D: [],
    fires3D: [],
    particles: [],
    animationId: null
};

// 🔥 FIRE PHYSICS SYSTEM - Simplified fire simulation
let firePhysics = {
    enabled: true,
    fireIntensity: [],      // 0-10 scale per cell
    spreadRate: 1.0         // Fire spread multiplier
};
let fireSpreadInterval = null; // For automatic fire spread

// AI Reasoning variables
let reasoningMode = 'none'; // 'none', 'deductive', 'inductive', 'probabilistic'
let fireSpreadHistory = []; // For inductive reasoning
let pathRiskScores = {}; // For probabilistic reasoning

// 🧠 MACHINE LEARNING SYSTEM - Pattern Learning from Evacuations
let evacuationHistory = []; // Stores all evacuation attempts
let learningStats = {
    totalEvacuations: 0,
    algorithmSuccessRates: { bfs: [], ucs: [], astar: [], greedy: [] },
    buildingPatterns: [],
    lastUpdated: null
};

// Agent class
// ==================== SIMPLIFIED AGENT SYSTEM ====================

class Agent {
    constructor(id, startPos, path) {
        this.id = id;
        this.x = startPos[1] * cellSize + cellSize / 2;
        this.y = startPos[0] * cellSize + cellSize / 2;
        this.path = path;
        this.pathIndex = 0;
        this.reached = false;
        
        // Simple attributes
        this.speed = 2.0;
        this.radius = 8;
        this.color = '#3498db'; // Blue
        
        // Statistics
        this.evacuationTime = 0;
    }
    
    update(allAgents) {
        if (this.reached || !this.path || this.pathIndex >= this.path.length) {
            this.reached = true;
            return;
        }
        
        this.evacuationTime++;
        
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
            const moveX = (dx / distance) * this.speed;
            const moveY = (dy / distance) * this.speed;
            this.x += moveX;
            this.y += moveY;
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

        // White outline
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
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
    
    // 🧠 Initialize Machine Learning System
    loadLearningData();
    updateLearningStats();
};

// ==================== MACHINE LEARNING SYSTEM ====================

// Load learning data from localStorage
function loadLearningData() {
    try {
        const savedHistory = localStorage.getItem('evacuationHistory');
        const savedStats = localStorage.getItem('learningStats');
        
        if (savedHistory) {
            evacuationHistory = JSON.parse(savedHistory);
            console.log(`📚 Loaded ${evacuationHistory.length} evacuation records from memory`);
        }
        
        if (savedStats) {
            learningStats = JSON.parse(savedStats);
            console.log(`📊 Learning system initialized: ${learningStats.totalEvacuations} total evacuations analyzed`);
        }
    } catch (error) {
        console.error('Error loading learning data:', error);
        evacuationHistory = [];
        learningStats = {
            totalEvacuations: 0,
            algorithmSuccessRates: { bfs: [], ucs: [], astar: [], greedy: [] },
            buildingPatterns: [],
            lastUpdated: null
        };
    }
}

// Save learning data to localStorage
function saveLearningData() {
    try {
        localStorage.setItem('evacuationHistory', JSON.stringify(evacuationHistory));
        localStorage.setItem('learningStats', JSON.stringify(learningStats));
        console.log('💾 Learning data saved successfully');
    } catch (error) {
        console.error('Error saving learning data:', error);
    }
}

// 📊 LOGISTIC REGRESSION: Survival probability prediction
function logisticRegressionSurvival(features, fireIntensity = 0, timeElapsed = 0) {
    // Simplified logistic regression model
    // P(survival) = 1 / (1 + e^(-z))
    // where z = β0 + β1*x1 + β2*x2 + ...
    
    // Learned weights (would be trained on real data, here using reasonable estimates)
    const weights = {
        intercept: 2.5,
        fireDistance: 0.4,      // Positive correlation
        fireDensity: -0.15,      // Negative correlation
        // Removed smoke for performance
        pathLength: -0.02,       // Slight negative (longer = more risk)
        wallDensity: -0.05,      // Obstacles reduce survival
        timeElapsed: -0.03       // Time increases risk
    };
    
    // Calculate z (linear combination)
    let z = weights.intercept;
    z += weights.fireDistance * features.minFireDistance;
    z += weights.fireDensity * features.fireDensity;
    // Removed smoke calculation
    z += weights.pathLength * features.estimatedPathLength;
    z += weights.wallDensity * features.wallDensity;
    z += weights.timeElapsed * timeElapsed;
    
    // Apply sigmoid function
    const survivalProbability = 1 / (1 + Math.exp(-z));
    
    // Classify risk level
    let riskLevel, riskColor;
    if (survivalProbability >= 0.8) {
        riskLevel = 'LOW RISK';
        riskColor = '#2ecc71';
    } else if (survivalProbability >= 0.6) {
        riskLevel = 'MODERATE RISK';
        riskColor = '#f39c12';
    } else if (survivalProbability >= 0.4) {
        riskLevel = 'HIGH RISK';
        riskColor = '#e67e22';
    } else {
        riskLevel = 'CRITICAL RISK';
        riskColor = '#e74c3c';
    }
    
    return {
        survivalProbability: (survivalProbability * 100).toFixed(1),
        riskLevel,
        riskColor,
        factors: {
            fireProximity: features.minFireDistance > 5 ? 'Positive' : 'Negative',
            // Removed smoke factor
            pathComplexity: features.pathComplexity < 0.5 ? 'Positive' : 'Negative',
            timeWindow: timeElapsed < 30 ? 'Positive' : 'Negative'
        }
    };
}

// 🔮 UNIFIED ML PREDICTION: Combines all models
function predictEvacuationOutcome(exitPositions, firePositions, buildingProfile) {
    if (!exitPositions || exitPositions.length === 0) {
        return { error: 'No exits to analyze' };
    }
    
    const predictions = [];
    
    exitPositions.forEach((exitPos, index) => {
        const features = extractExitFeatures(exitPos, firePositions, buildingProfile);
        
        // Decision Tree Classification
        const decisionTree = decisionTreeClassifier(exitPos, firePositions, buildingProfile);
        
        // KNN Similar Scenarios
        const knnFeatures = {
            fireDensity: parseFloat(buildingProfile.fireDensity),
            wallDensity: parseFloat(buildingProfile.wallDensity),
            exitCount: buildingProfile.exitCount,
            fireCount: buildingProfile.fireCount
        };
        const knn = knnSimilarScenarios(knnFeatures, 5);
        
        // Logistic Regression Survival
        const logistic = logisticRegressionSurvival(features, features.avgFireIntensity, 0);
        
        predictions.push({
            exitPosition: exitPos,
            exitLabel: `Exit ${index + 1} (${exitPos[0]}, ${exitPos[1]})`,
            decisionTree,
            knn,
            logistic,
            overallScore: calculateOverallScore(decisionTree, logistic)
        });
    });
    
    // Sort by overall score (safest first)
    predictions.sort((a, b) => b.overallScore - a.overallScore);
    
    return {
        predictions,
        totalExits: exitPositions.length,
        recommendedExit: predictions[0],
        timestamp: new Date().toISOString()
    };
}

// Helper: Extract features for an exit
function extractExitFeatures(exitPos, firePositions, buildingProfile) {
    // Calculate minimum distance to any fire
    let minFireDistance = Infinity;
    let avgFireIntensity = 0;
    
    firePositions.forEach(fire => {
        const dist = Math.abs(exitPos[0] - fire[0]) + Math.abs(exitPos[1] - fire[1]);
        minFireDistance = Math.min(minFireDistance, dist);
        
        if (firePhysics.enabled && firePhysics.fireIntensity[fire[0]][fire[1]]) {
            avgFireIntensity += firePhysics.fireIntensity[fire[0]][fire[1]];
        }
    });
    
    avgFireIntensity = firePositions.length > 0 ? avgFireIntensity / firePositions.length : 0;
    
    // Check if exit is on building edge
    const isEdgeExit = exitPos[0] === 0 || exitPos[0] === rows - 1 || 
                       exitPos[1] === 0 || exitPos[1] === cols - 1;
    
    // Estimate path complexity (wall density in area)
    const pathComplexity = parseFloat(buildingProfile.wallDensity) / 100;
    
    // Estimate path length (Manhattan distance * complexity factor)
    let estimatedPathLength = minFireDistance * (1 + pathComplexity);
    
    return {
        minFireDistance,
        avgFireIntensity,
        isEdgeExit,
        pathComplexity,
        estimatedPathLength,
        fireDensity: parseFloat(buildingProfile.fireDensity),
        wallDensity: parseFloat(buildingProfile.wallDensity)
    };
}

// Helper: Euclidean distance for KNN
function euclideanDistance(features1, features2) {
    const diff1 = features1.fireDensity - features2.fireDensity;
    const diff2 = features1.wallDensity - features2.wallDensity;
    const diff3 = features1.exitCount - features2.exitCount;
    const diff4 = features1.fireCount - features2.fireCount;
    
    return Math.sqrt(diff1 * diff1 + diff2 * diff2 + diff3 * diff3 + diff4 * diff4);
}

// Helper: Find best algorithm in KNN neighbors
function findBestAlgorithmInNeighbors(neighbors) {
    const algoCount = {};
    neighbors.forEach(n => {
        if (n.record.success) {
            algoCount[n.record.algorithm] = (algoCount[n.record.algorithm] || 0) + 1;
        }
    });
    
    let bestAlgo = 'astar';
    let maxCount = 0;
    for (const [algo, count] of Object.entries(algoCount)) {
        if (count > maxCount) {
            maxCount = count;
            bestAlgo = algo;
        }
    }
    return bestAlgo;
}

// Helper: Calculate overall safety score
function calculateOverallScore(decisionTree, logistic) {
    let score = 0;
    
    // Decision tree contributes 40%
    if (decisionTree.classification.includes('SAFE')) {
        score += 40 * decisionTree.confidence;
    } else if (decisionTree.classification.includes('RISKY')) {
        score += 20 * decisionTree.confidence;
    }
    
    // Logistic regression contributes 60%
    score += parseFloat(logistic.survivalProbability) * 0.6;
    
    return score;
}

// ==================== END ADVANCED ML PREDICTION MODELS ====================

// ==================== MACHINE LEARNING UI & DISPLAY ====================

function showMLPredictions() {
    const firePositions = [];
    const exitPositions = [];
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 2) firePositions.push([i, j]);
            if (grid[i][j] === 3) exitPositions.push([i, j]);
        }
    }
    
    if (exitPositions.length === 0) {
        alert('⚠️ No exits found! Add exit points first.');
        return;
    }
    
    const buildingProfile = getBuildingProfile();
    const mlPredictions = predictEvacuationOutcome(exitPositions, firePositions, buildingProfile);
    
    if (mlPredictions.error) {
        alert(mlPredictions.error);
        return;
    }
    
    // Display predictions in stats panel
    let html = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 8px; color: white; margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px 0;">🤖 AI PREDICTION ANALYSIS</h4>
            <p style="margin: 0; font-size: 0.9em;">Machine Learning Models: Decision Tree | KNN | Logistic Regression</p>
        </div>
    `;
    
    mlPredictions.predictions.forEach((pred, index) => {
        const isRecommended = index === 0;
        const borderColor = isRecommended ? '#2ecc71' : '#95a5a6';
        
        html += `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 3px solid ${borderColor};">
                ${isRecommended ? '<div style="background: #2ecc71; color: white; padding: 5px 10px; border-radius: 5px; margin-bottom: 10px; text-align: center; font-weight: bold;">⭐ RECOMMENDED EXIT</div>' : ''}
                
                <h4 style="margin: 0 0 10px 0; color: #2c3e50;">${pred.exitLabel}</h4>
                
                <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                    <strong>🌳 Decision Tree:</strong> ${pred.decisionTree.classification}
                    <div style="font-size: 0.85em; color: #555; margin-top: 5px;">
                        Confidence: ${(pred.decisionTree.confidence * 100).toFixed(0)}%<br>
                        ${pred.decisionTree.reasoning.join('<br>')}
                    </div>
                </div>
                
                <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                    <strong>📊 Logistic Regression:</strong>
                    <div style="margin-top: 5px;">
                        <div style="font-size: 1.2em; font-weight: bold; color: ${pred.logistic.riskColor};">
                            ${pred.logistic.survivalProbability}% Survival Probability
                        </div>
                        <div style="font-size: 0.85em; color: #555; margin-top: 3px;">
                            Risk Level: ${pred.logistic.riskLevel}
                        </div>
                    </div>
                </div>
                
                ${pred.knn.found ? `
                <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                    <strong>🎯 KNN (${pred.knn.k} Similar Scenarios):</strong>
                    <div style="font-size: 0.85em; color: #555; margin-top: 5px;">
                        Success Rate: ${pred.knn.successRate}%<br>
                        Avg Path Length: ${pred.knn.avgPathLength} steps<br>
                        Recommended Algorithm: <strong>${pred.knn.recommendedAlgorithm.toUpperCase()}</strong>
                    </div>
                </div>
                ` : `
                <div style="background: #fff3cd; padding: 8px; border-radius: 5px; font-size: 0.85em;">
                    ℹ️ ${pred.knn.message}
                </div>
                `}
                
                <div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #eee;">
                    <strong>Overall Safety Score: ${pred.overallScore.toFixed(0)}/100</strong>
                </div>
            </div>
        `;
    });
    
    document.getElementById('statsContent').innerHTML = html;
}

// ==================== END MACHINE LEARNING UI ====================

// ==================== END MACHINE LEARNING SYSTEM ====================

// ==================== FIRE PHYSICS SYSTEM ====================

// Initialize fire physics arrays
function initializeFirePhysics() {
    firePhysics.fireIntensity = Array(rows).fill().map(() => Array(cols).fill(0));
    
    console.log('🔥 Fire physics system initialized');
}

// Start fire spread simulation
function startFireSpread() {
    if (fireSpreadInterval) return; // Already running
    
    fireSpreadInterval = setInterval(() => {
        spreadFire();
        updateFireVisuals();
    }, 1000); // Spread every second
    
    console.log('🔥 Fire spread simulation started');
}

// Stop fire spread simulation
function stopFireSpread() {
    if (fireSpreadInterval) {
        clearInterval(fireSpreadInterval);
        fireSpreadInterval = null;
        console.log('🔥 Fire spread simulation stopped');
    }
}

// Clear all fire from the grid
function clearFireSpread() {
    // Stop fire spread if running
    stopFireSpread();
    
    // Remove all fire cells and reset fire physics
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 2) {
                grid[i][j] = 0;
                updateCellDisplay(i, j);
            }
            // Reset fire intensity
            if (firePhysics.fireIntensity[i]) {
                firePhysics.fireIntensity[i][j] = 0;
            }
        }
    }
    
    // Rebuild 3D view if active
    if (view3D.enabled) {
        build3DBuilding();
    }
    
    console.log('🧹 All fire cleared from the grid');
}

// Spread fire to adjacent cells
function spreadFire() {
    const newIntensity = firePhysics.fireIntensity.map(row => [...row]);
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 2 && firePhysics.fireIntensity[i][j] > 0) {
                // Fire spreads to adjacent cells
                const neighbors = getNeighbors(i, j);
                
                neighbors.forEach(([ni, nj]) => {
                    if (grid[ni][nj] === 0 || grid[ni][nj] === 5 || (grid[ni][nj] >= 51 && grid[ni][nj] <= 56)) {
                        // Spread fire based on current intensity
                        const spreadChance = Math.random();
                        const spreadThreshold = 0.3 * firePhysics.spreadRate;
                        
                        if (spreadChance < spreadThreshold) {
                            // Cell catches fire
                            grid[ni][nj] = 2;
                            newIntensity[ni][nj] = Math.min(10, firePhysics.fireIntensity[i][j] * 0.8);
                            updateCellDisplay(ni, nj);
                        } else {
                            // Increase fire intensity gradually
                            newIntensity[ni][nj] = Math.min(10, newIntensity[ni][nj] + 0.5);
                        }
                    }
                });
            }
        }
    }
    
    firePhysics.fireIntensity = newIntensity;
}

// Get adjacent neighbors (4-directional)
function getNeighbors(row, col) {
    const neighbors = [];
    const directions = [[0,1], [1,0], [0,-1], [-1,0]];
    
    directions.forEach(([dr, dc]) => {
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
            neighbors.push([newRow, newCol]);
        }
    });
    
    return neighbors;
}

// Get all neighbors including diagonals (8-directional)
function getAllNeighbors(row, col) {
    const neighbors = [];
    const directions = [[0,1], [1,0], [0,-1], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
    
    directions.forEach(([dr, dc]) => {
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
            neighbors.push([newRow, newCol]);
        }
    });
    
    return neighbors;
}

// Update visual representation of fire physics
// Get fire intensity color (Orange → Red gradient based on intensity 0-10)
function getFireIntensityColor(intensity) {
    if (intensity <= 0) return null;
    
    // Intensity scale: 0-10
    // 0-3: Orange tones
    // 4-7: Red-orange tones
    // 8-10: Deep red tones
    
    const normalized = Math.min(10, Math.max(0, intensity)) / 10; // 0.0 to 1.0
    
    // Color progression: Light Orange → Orange → Red-Orange → Red → Dark Red
    let r, g, b;
    
    if (normalized < 0.3) {
        // Light Orange to Orange (0-3 intensity)
        const t = normalized / 0.3;
        r = 255;
        g = Math.floor(200 - (t * 70)); // 200→130
        b = Math.floor(100 - (t * 50)); // 100→50
    } else if (normalized < 0.6) {
        // Orange to Red-Orange (4-6 intensity)
        const t = (normalized - 0.3) / 0.3;
        r = 255;
        g = Math.floor(130 - (t * 80)); // 130→50
        b = Math.floor(50 - (t * 50)); // 50→0
    } else {
        // Red-Orange to Deep Red (7-10 intensity)
        const t = (normalized - 0.6) / 0.4;
        r = Math.floor(255 - (t * 55)); // 255→200
        g = Math.floor(50 - (t * 50)); // 50→0
        b = 0;
    }
    
    return `rgb(${r}, ${g}, ${b})`;
}

// Get smoke overlay effect
function getSmokeOverlay(smokeDensity) {
    if (smokeDensity <= 0) return null;
    
    const opacity = Math.min(0.8, smokeDensity / 12);
    const darkness = Math.floor(100 - (smokeDensity * 4)); // Gets darker with more smoke
    
    return {
        background: `rgba(${darkness}, ${darkness}, ${darkness}, ${opacity})`,
        boxShadow: `inset 0 0 15px rgba(0, 0, 0, ${opacity * 0.8}), 0 0 10px rgba(100, 100, 100, ${opacity * 0.5})`
    };
}

// Get heat glow effect
function getHeatGlow(heatLevel) {
    if (heatLevel <= 0) return null;
    
    const intensity = Math.min(10, heatLevel) / 10;
    const glowOpacity = intensity * 0.6;
    const glowSize = Math.floor(8 + intensity * 12); // 8-20px
    
    return {
        boxShadow: `0 0 ${glowSize}px rgba(255, 100, 0, ${glowOpacity}), inset 0 0 10px rgba(255, 150, 0, ${glowOpacity * 0.5})`,
        filter: `brightness(${1 + intensity * 0.3})`
    };
}

function updateFireVisuals() {
    if (!firePhysics.enabled) return;
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
            if (!cell) continue;
            
            const cellType = grid[i][j];
            const fireIntensity = firePhysics.fireIntensity[i][j];
            
            // Reset inline styles for non-affected cells
            if (fireIntensity <= 0) {
                cell.style.background = '';
                cell.style.boxShadow = '';
                cell.style.filter = '';
                cell.removeAttribute('data-intensity');
                continue;
            }
            
            // Fire cells: Show intensity gradient
            if (cellType === 2) {
                const fireColor = getFireIntensityColor(fireIntensity);
                if (fireColor) {
                    cell.style.background = fireColor;
                    cell.style.boxShadow = `0 0 20px ${fireColor}, inset 0 0 10px rgba(255, 200, 0, 0.5)`;
                    
                    // Add intensity indicator
                    cell.setAttribute('data-intensity', fireIntensity.toFixed(1));
                    
                    // Pulsing effect for high intensity
                    if (fireIntensity >= 7) {
                        cell.style.animation = 'firePulse 0.8s ease-in-out infinite';
                    } else {
                        cell.style.animation = 'firePulse 1.5s ease-in-out infinite';
                    }
                }
            }
        }
    }
}

// Calculate pathfinding cost with fire physics
function getFirePhysicsCost(row, col) {
    if (grid[row][col] === 1) return Infinity; // Wall
    if (grid[row][col] === 2) return 1000; // Direct fire - extremely dangerous
    
    // Base cost (Manhattan distance component handled by pathfinding)
    let cost = 1;
    
    // Add fire intensity cost (0-100)
    cost += firePhysics.fireIntensity[row][col] * 10;
    
    // Add smoke density cost (0-50)
    cost += firePhysics.smokeDensity[row][col] * 5;
    
    // Add heat cost (0-30)
    cost += firePhysics.heatLevel[row][col] * 3;
    
    return cost;
}

// ==================== END FIRE PHYSICS SYSTEM ====================

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

// ============================================
// AI REASONING FUNCTIONS
// ============================================

// Set reasoning mode
function setReasoningMode(mode) {
    reasoningMode = mode;
    document.querySelectorAll('[data-reasoning]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-reasoning="${mode}"]`).classList.add('active');
    
    const infoTexts = {
        'none': '<strong>Standard Mode:</strong> Traditional pathfinding without AI reasoning',
        'deductive': '<strong>Deductive Reasoning:</strong> Applies IF-THEN logical rules (e.g., IF fire nearby THEN danger high). When comparing algorithms, each algorithm\'s path is evaluated with rule-based analysis.',
        'inductive': '<strong>Inductive Reasoning:</strong> Learns patterns from observations (observes fire at 3→5→7 cells, predicts continued spread). Compares patterns across different algorithm paths.',
        'probabilistic': '<strong>Probabilistic Reasoning:</strong> Calculates success probability using statistical analysis P(safe)=e^(-d/3). Each algorithm gets a probability score for comparison.',
        'fuzzy': '🌫️ <strong>Fuzzy Logic:</strong> Handles uncertainty with linguistic variables ("very close", "moderately safe") using membership degrees (0-1). Each algorithm path receives fuzzy safety assessment.'
    };
    document.getElementById('reasoningInfo').innerHTML = infoTexts[mode];
}

// DEDUCTIVE REASONING: Rule-based logical inference
// ==================== ENHANCED DEDUCTIVE REASONING (SOP-Based Rules) ====================

function deductiveReasoning(path) {
    const analysis = {
        rules: [],
        inferences: [],
        safetyScore: 100,
        criticalWarnings: [],
        sopViolations: []
    };
    
    // Get all fire cells
    const fireCells = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 2) {
                fireCells.push([i, j]);
            }
        }
    }
    
    // RULE 1: Fire Safety SOP - Minimum Safe Distance
    analysis.rules.push("SOP-001: Maintain minimum 3-cell distance from active fire");
    path.forEach((pos, index) => {
        fireCells.forEach(fire => {
            const distance = Math.abs(pos[0] - fire[0]) + Math.abs(pos[1] - fire[1]);
            if (distance <= 3) {
                const penalty = (4 - distance) * 10;
                analysis.safetyScore -= penalty;
                
                if (distance === 1) {
                    analysis.criticalWarnings.push(`🚨 CRITICAL: Path cell (${pos[0]},${pos[1]}) adjacent to fire`);
                    analysis.sopViolations.push("Violated SOP-001: Less than minimum safe distance");
                    analysis.inferences.push(`⚠️ HIGH RISK at step ${index + 1}: Adjacent to fire - ${penalty}% safety penalty`);
                } else if (distance === 2) {
                    analysis.inferences.push(`⚠️ WARNING at step ${index + 1}: Near fire (${distance} cells) - ${penalty}% penalty`);
                } else {
                    analysis.inferences.push(`⚠️ CAUTION at step ${index + 1}: Fire proximity - ${penalty}% penalty`);
                }
            }
        });
    });
    
    // RULE 2: Fire Safety SOP - Path Efficiency
    analysis.rules.push("SOP-002: Use shortest safe path available");
    
    // RULE 3: Fire Safety SOP - Evacuation Time Limit
    analysis.rules.push("SOP-003: Complete evacuation within 30 steps (optimal time limit)");
    if (path.length > 30) {
        const penalty = (path.length - 30) * 2;
        analysis.safetyScore -= penalty;
        analysis.sopViolations.push(`Violated SOP-003: Evacuation time ${path.length} > 30 steps`);
        analysis.inferences.push(`⏱️ DELAYED EVACUATION: ${path.length} steps exceeds 30-step limit - ${penalty}% penalty`);
        analysis.inferences.push(`⚠️ Prolonged exposure increases risk of fire spread`);
    } else if (path.length <= 20) {
        analysis.inferences.push(`✅ EXCELLENT: Fast evacuation (${path.length} steps) - well within safe time limit`);
        analysis.safetyScore += 5;
    } else {
        analysis.inferences.push(`✅ ACCEPTABLE: Evacuation time (${path.length} steps) within safe limit`);
    }
    
    // RULE 4: Fire Safety SOP - Path Efficiency
    const startPos = path[0];
    const endPos = path[path.length - 1];
    const straightLine = Math.abs(endPos[0] - startPos[0]) + Math.abs(endPos[1] - startPos[1]);
    const actualPath = path.length - 1;
    const efficiency = (straightLine / actualPath * 100).toFixed(1);
    
    analysis.rules.push("SOP-004: Prefer direct routes (>70% efficiency) to minimize exposure");
    if (efficiency > 80) {
        analysis.inferences.push(`✅ DIRECT ROUTE: ${efficiency}% efficiency - minimal detours (+10% safety bonus)`);
        analysis.safetyScore += 10;
    } else if (efficiency > 70) {
        analysis.inferences.push(`✅ EFFICIENT ROUTE: ${efficiency}% efficiency - acceptable path`);
    } else {
        const penalty = Math.floor((70 - efficiency) / 2);
        analysis.safetyScore -= penalty;
        analysis.inferences.push(`⚠️ INDIRECT ROUTE: ${efficiency}% efficiency - significant detours (${penalty}% penalty)`);
    }
    
    // RULE 5: Fire Safety SOP - Building Fire Density Assessment
    const totalCells = rows * cols;
    const firePercentage = (fireCells.length / totalCells * 100).toFixed(1);
    analysis.rules.push("SOP-005: Assess building fire density for evacuation urgency");
    
    if (firePercentage > 15) {
        analysis.criticalWarnings.push(`🚨 CRITICAL FIRE DENSITY: ${firePercentage}% of building affected`);
        analysis.inferences.push(`🚨 EMERGENCY: High fire density (${firePercentage}%) - IMMEDIATE evacuation required`);
        analysis.safetyScore -= 20;
    } else if (firePercentage > 10) {
        analysis.inferences.push(`⚠️ ELEVATED RISK: Fire density ${firePercentage}% - expedite evacuation (-15% safety)`);
        analysis.safetyScore -= 15;
    } else if (firePercentage > 5) {
        analysis.inferences.push(`⚠️ MODERATE RISK: Fire density ${firePercentage}% - maintain caution`);
        analysis.safetyScore -= 8;
    } else {
        analysis.inferences.push(`✅ LOW FIRE DENSITY: ${firePercentage}% - controlled situation`);
    }
    
    // RULE 7: Fire Safety SOP - Multi-Floor Considerations (simulate floor level)
    const avgRow = path.reduce((sum, pos) => sum + pos[0], 0) / path.length;
    const simulatedFloor = Math.ceil(avgRow / 5); // Every 5 rows = 1 floor
    analysis.rules.push("SOP-007: Floor-specific evacuation protocols");
    
    if (simulatedFloor > 3) {
        analysis.inferences.push(`🏢 HIGH FLOOR: Simulated floor ${simulatedFloor} - stairwell evacuation required`);
        analysis.inferences.push(`⚠️ Note: In real building, elevators would be disabled (SOP)`);
    } else {
        analysis.inferences.push(`🏢 LOW FLOOR: Simulated floor ${simulatedFloor} - ground exit accessible`);
    }
    
    // Final safety score normalization
    analysis.safetyScore = Math.max(0, Math.min(100, analysis.safetyScore));
    
    // Overall assessment
    if (analysis.safetyScore >= 80) {
        analysis.inferences.unshift(`🟢 OVERALL ASSESSMENT: SAFE (${analysis.safetyScore}% safety score)`);
    } else if (analysis.safetyScore >= 60) {
        analysis.inferences.unshift(`🟡 OVERALL ASSESSMENT: ACCEPTABLE (${analysis.safetyScore}% safety score)`);
    } else if (analysis.safetyScore >= 40) {
        analysis.inferences.unshift(`🟠 OVERALL ASSESSMENT: RISKY (${analysis.safetyScore}% safety score)`);
    } else {
        analysis.inferences.unshift(`🔴 OVERALL ASSESSMENT: DANGEROUS (${analysis.safetyScore}% safety score)`);
    }
    
    if (analysis.sopViolations.length > 0) {
        analysis.inferences.push(`⚠️ SOP VIOLATIONS: ${analysis.sopViolations.length} safety protocols violated`);
    }
    
    return analysis;
}

// ==================== ENHANCED INDUCTIVE REASONING (Learning from Patterns) ====================

function inductiveReasoning(path) {
    const analysis = {
        observations: [],
        patterns: [],
        predictions: [],
        learnedRules: [],
        confidence: 0
    };
    
    // STEP 1: Observe current state
    const fireCells = [];
    const exitPosition = path[path.length - 1];
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 2) {
                fireCells.push([i, j]);
            }
        }
    }
    
    analysis.observations.push(`📊 Observed ${fireCells.length} active fire cells in building`);
    analysis.observations.push(`📍 Exit used: (${exitPosition[0]}, ${exitPosition[1]})`);
    
    // STEP 2: Record in history with detailed context
    fireSpreadHistory.push({
        timestamp: Date.now(),
        count: fireCells.length,
        positions: [...fireCells],
        pathLength: path.length
    });
    
    // Keep last 10 observations
    if (fireSpreadHistory.length > 10) {
        fireSpreadHistory.shift();
    }
    
    analysis.observations.push(`Fire history contains ${fireSpreadHistory.length} data points`);
    
    // STEP 3: Detect patterns (need at least 3 observations)
    if (fireSpreadHistory.length >= 3) {
        const recent = fireSpreadHistory.slice(-3);
        const counts = recent.map(h => h.count);
        
        // Pattern: Growing fire
        if (counts[0] < counts[1] && counts[1] < counts[2]) {
            analysis.patterns.push(`📈 GROWING PATTERN: Fire spread ${counts[0]}→${counts[1]}→${counts[2]} cells (consistent increase)`);
            const growthRate = ((counts[2] - counts[0]) / counts[0] * 100).toFixed(1);
            analysis.predictions.push(`⚠️ Fire growth rate: ${growthRate}% - Predict continued rapid spread`);
            analysis.predictions.push(`⚠️ Estimated next state: ~${Math.ceil(counts[2] * 1.4)} fire cells`);
            analysis.confidence = 0.85;
        }
        // Pattern: Stable fire
        else if (Math.abs(counts[0] - counts[1]) <= 1 && Math.abs(counts[1] - counts[2]) <= 1) {
            analysis.patterns.push(`📊 STABLE PATTERN: Fire maintained ~${counts[1]} cells (±1)`);
            analysis.predictions.push(`✅ Fire spread is contained - stable conditions expected`);
            analysis.predictions.push(`✅ Current escape route should remain viable`);
            analysis.confidence = 0.75;
        }
        // Pattern: Declining fire
        else if (counts[0] > counts[1] && counts[1] > counts[2]) {
            analysis.patterns.push(`📉 DECLINING PATTERN: Fire reduced ${counts[0]}→${counts[1]}→${counts[2]} cells`);
            analysis.predictions.push(`✅ Fire is being contained - evacuation risk decreasing`);
            analysis.confidence = 0.70;
        }
        // Pattern: Erratic
        else {
            analysis.patterns.push(`📉 ERRATIC PATTERN: Fire behavior unpredictable (${counts.join('→')} cells)`);
            analysis.predictions.push(`⚠️ Unpredictable fire - evacuation urgency HIGH`);
            analysis.confidence = 0.50;
        }
        
        // Additional pattern: Fire location clustering
        const allPositions = recent.flatMap(h => h.positions);
        const avgRow = allPositions.reduce((sum, pos) => sum + pos[0], 0) / allPositions.length;
        const avgCol = allPositions.reduce((sum, pos) => sum + pos[1], 0) / allPositions.length;
        analysis.observations.push(`Fire cluster center approximately at (${avgRow.toFixed(1)}, ${avgCol.toFixed(1)})`);
        
    } else {
        analysis.patterns.push(`⏳ Insufficient data: Need ${3 - fireSpreadHistory.length} more observation(s) for pattern analysis`);
        analysis.predictions.push(`📊 Continue monitoring to establish fire spread patterns`);
        analysis.confidence = 0.30;
    }
    
    // STEP 4: Predict adjacent cell spread
    let spreadableCells = 0;
    fireCells.forEach(fire => {
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
        dirs.forEach(([dr, dc]) => {
            const nr = fire[0] + dr;
            const nc = fire[1] + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0) {
                spreadableCells++;
            }
        });
    });
    
    if (spreadableCells > 0) {
        analysis.predictions.push(`🔥 Immediate spread risk: ${spreadableCells} empty cells adjacent to fire`);
    }
    
    return analysis;
}

// PROBABILISTIC REASONING: Calculate mathematical probabilities
function probabilisticReasoning(path) {
    const analysis = {
        pathProbability: 1.0,
        cellProbabilities: [],
        riskFactors: [],
        expectedSafety: 100
    };
    
    // Get fire cells
    const fireCells = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 2) {
                fireCells.push([i, j]);
            }
        }
    }
    
    // Calculate probability for each path cell
    path.forEach((pos, step) => {
        let cellSafety = 1.0;
        
        // FACTOR 1: Fire distance (exponential decay)
        // Formula: threat = e^(-distance/3)
        let totalThreat = 0;
        fireCells.forEach(fire => {
            const distance = Math.abs(pos[0] - fire[0]) + Math.abs(pos[1] - fire[1]);
            const threat = Math.exp(-distance / 3);
            totalThreat += threat;
        });
        cellSafety *= (1 - Math.min(totalThreat * 0.5, 0.9));
        
        // FACTOR 2: Time risk (later in path = more exposure)
        const timeRisk = (step / path.length) * 0.20;
        cellSafety *= (1 - timeRisk);
        
        // FACTOR 3: Wall protection
        let wallCount = 0;
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
        dirs.forEach(([dr, dc]) => {
            const nr = pos[0] + dr;
            const nc = pos[1] + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
                wallCount++;
            }
        });
        const wallBonus = Math.min(wallCount * 0.05, 0.15);
        cellSafety = Math.min(1, cellSafety + wallBonus);
        
        analysis.cellProbabilities.push({
            position: pos,
            step: step + 1,
            probability: (cellSafety * 100).toFixed(1),
            fireDistance: fireCells.length > 0 ? Math.min(...fireCells.map(f => 
                Math.abs(pos[0] - f[0]) + Math.abs(pos[1] - f[1])
            )) : 99
        });
        
        analysis.pathProbability *= cellSafety;
    });
    
    // Overall path probability
    analysis.pathProbability = (analysis.pathProbability * 100).toFixed(1);
    analysis.expectedSafety = parseFloat(analysis.pathProbability);
    
    // RISK FACTOR ANALYSIS
    if (fireCells.length > 5) {
        const impact = fireCells.length * 2;
        analysis.riskFactors.push(`🔥 High fire density: ${fireCells.length} cells reduce safety by ~${impact}%`);
    }
    
    if (path.length > 20) {
        analysis.riskFactors.push(`⏱️ Long evacuation path: ${path.length} steps increase time-based risk by ${((path.length - 20) * 2)}%`);
    }
    
    const avgCellSafety = analysis.cellProbabilities.reduce((sum, c) => sum + parseFloat(c.probability), 0) / path.length;
    if (avgCellSafety < 70) {
        analysis.riskFactors.push(`⚠️ Low average cell safety: ${avgCellSafety.toFixed(1)}% indicates dangerous route`);
    } else if (avgCellSafety > 85) {
        analysis.riskFactors.push(`✅ High average cell safety: ${avgCellSafety.toFixed(1)}% indicates safe route`);
    }
    
    // Find most dangerous cells
    const dangerousCells = analysis.cellProbabilities.filter(c => parseFloat(c.probability) < 60);
    if (dangerousCells.length > 0) {
        analysis.riskFactors.push(`⚠️ Critical zones: ${dangerousCells.length} cells with <60% safety (steps: ${dangerousCells.map(c => c.step).join(', ')})`);
    }
    
    return analysis;
}

// Fuzzy Logic Reasoning - Handles uncertainty with linguistic variables
function fuzzyReasoning(path) {
    // Get all fire cells
let fireCells = [];
for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
        if (grid[r][c] === 2) { // 2 means fire
            fireCells.push([r, c]);
        }
    }
}
if (fireCells.length === 0) {
    return {
        overallSafety: 100,
        linguisticSafety: 'VERY_SAFE',
        fuzzyRules: ['No fire present on grid'],
        membershipDegrees: [],
        defuzzifiedScore: 100,
        inputs: {
            minFireDistance: 'N/A',
            pathLength: path.length,
            fireDensity: 0
        }
    };
}
    
    // Define fuzzy membership functions
    const fuzzyMembership = {
        fireProximity: {
            VERY_CLOSE: (d) => d <= 2 ? 1 : (d <= 4 ? (4-d)/2 : 0),
            CLOSE: (d) => d <= 2 ? 0 : (d <= 4 ? (d-2)/2 : (d <= 6 ? (6-d)/2 : 0)),
            MODERATE: (d) => d <= 4 ? 0 : (d <= 6 ? (d-4)/2 : (d <= 9 ? (9-d)/3 : 0)),
            FAR: (d) => d <= 6 ? 0 : (d <= 9 ? (d-6)/3 : 1)
        },
        pathLength: {
            VERY_SHORT: (l) => l <= 10 ? 1 : (l <= 15 ? (15-l)/5 : 0),
            SHORT: (l) => l <= 10 ? 0 : (l <= 15 ? (l-10)/5 : (l <= 25 ? (25-l)/10 : 0)),
            MEDIUM: (l) => l <= 15 ? 0 : (l <= 25 ? (l-15)/10 : (l <= 40 ? (40-l)/15 : 0)),
            LONG: (l) => l <= 25 ? 0 : (l <= 40 ? (l-25)/15 : 1)
        },
        riskLevel: {
            VERY_SAFE: (r) => r >= 80 ? 1 : (r >= 60 ? (r-60)/20 : 0),
            SAFE: (r) => r <= 60 ? 0 : (r <= 80 ? (r-60)/20 : (r <= 90 ? (90-r)/10 : 0)),
            RISKY: (r) => r <= 30 ? 0 : (r <= 50 ? (r-30)/20 : (r <= 70 ? (70-r)/20 : 0)),
            VERY_RISKY: (r) => r <= 30 ? 1 : (r <= 50 ? (50-r)/20 : 0)
        }
    };
    
    // Calculate fuzzy inputs
    let minFireDist = Infinity;
    
    // Get fire cells once (more efficient)
    path.forEach(([row, col]) => {
        fireCells.forEach(([fireRow, fireCol]) => {
            const dist = Math.abs(row - fireRow) + Math.abs(col - fireCol);
            minFireDist = Math.min(minFireDist, dist);
        });
    });
    
    const pathLen = path.length;
    const fireDensity = (fireCells.length / (grid.length * grid[0].length)) * 100;
    
    // Evaluate membership degrees for fire proximity
    const fireProxDegrees = {
        VERY_CLOSE: fuzzyMembership.fireProximity.VERY_CLOSE(minFireDist),
        CLOSE: fuzzyMembership.fireProximity.CLOSE(minFireDist),
        MODERATE: fuzzyMembership.fireProximity.MODERATE(minFireDist),
        FAR: fuzzyMembership.fireProximity.FAR(minFireDist)
    };
    
    // Evaluate membership degrees for path length
    const pathLenDegrees = {
        VERY_SHORT: fuzzyMembership.pathLength.VERY_SHORT(pathLen),
        SHORT: fuzzyMembership.pathLength.SHORT(pathLen),
        MEDIUM: fuzzyMembership.pathLength.MEDIUM(pathLen),
        LONG: fuzzyMembership.pathLength.LONG(pathLen)
    };
    
    // Apply fuzzy rules (IF-THEN with membership degrees)
    const fuzzyRules = [];
    const ruleOutputs = [];
    
    // Rule 1: IF fire is VERY_CLOSE THEN risk is VERY_RISKY
    if (fireProxDegrees.VERY_CLOSE > 0) {
        const degree = fireProxDegrees.VERY_CLOSE;
        fuzzyRules.push(`IF fire is VERY_CLOSE (${(degree*100).toFixed(0)}%) THEN risk is VERY_RISKY`);
        ruleOutputs.push({ safety: 15, weight: degree });
    }
    
    // Rule 2: IF fire is CLOSE AND path is LONG THEN risk is RISKY
    if (fireProxDegrees.CLOSE > 0 && pathLenDegrees.LONG > 0) {
        const degree = Math.min(fireProxDegrees.CLOSE, pathLenDegrees.LONG);
        fuzzyRules.push(`IF fire is CLOSE (${(fireProxDegrees.CLOSE*100).toFixed(0)}%) AND path is LONG (${(pathLenDegrees.LONG*100).toFixed(0)}%) THEN risk is RISKY`);
        ruleOutputs.push({ safety: 35, weight: degree });
    }
    
    // Rule 3: IF fire is MODERATE AND path is SHORT THEN risk is SAFE
    if (fireProxDegrees.MODERATE > 0 && pathLenDegrees.SHORT > 0) {
        const degree = Math.min(fireProxDegrees.MODERATE, pathLenDegrees.SHORT);
        fuzzyRules.push(`IF fire is MODERATE (${(fireProxDegrees.MODERATE*100).toFixed(0)}%) AND path is SHORT (${(pathLenDegrees.SHORT*100).toFixed(0)}%) THEN risk is SAFE`);
        ruleOutputs.push({ safety: 70, weight: degree });
    }
    
    // Rule 4: IF fire is FAR THEN risk is VERY_SAFE
    if (fireProxDegrees.FAR > 0) {
        const degree = fireProxDegrees.FAR;
        fuzzyRules.push(`IF fire is FAR (${(degree*100).toFixed(0)}%) THEN risk is VERY_SAFE`);
        ruleOutputs.push({ safety: 90, weight: degree });
    }
    
    // Rule 5: IF path is VERY_SHORT AND fire is NOT VERY_CLOSE THEN risk is SAFE
    if (pathLenDegrees.VERY_SHORT > 0 && fireProxDegrees.VERY_CLOSE < 0.5) {
        const degree = pathLenDegrees.VERY_SHORT * (1 - fireProxDegrees.VERY_CLOSE);
        fuzzyRules.push(`IF path is VERY_SHORT (${(pathLenDegrees.VERY_SHORT*100).toFixed(0)}%) AND fire is NOT VERY_CLOSE THEN risk is SAFE`);
        ruleOutputs.push({ safety: 75, weight: degree });
    }
    
    // Rule 6: IF fire is CLOSE AND path is VERY_SHORT THEN risk is RISKY
    if (fireProxDegrees.CLOSE > 0 && pathLenDegrees.VERY_SHORT > 0) {
        const degree = Math.min(fireProxDegrees.CLOSE, pathLenDegrees.VERY_SHORT);
        fuzzyRules.push(`IF fire is CLOSE (${(fireProxDegrees.CLOSE*100).toFixed(0)}%) AND path is VERY_SHORT (${(pathLenDegrees.VERY_SHORT*100).toFixed(0)}%) THEN risk is RISKY`);
        ruleOutputs.push({ safety: 40, weight: degree });
    }
    
    // Defuzzification using weighted average (Center of Gravity method)
    let numerator = 0;
    let denominator = 0;
    ruleOutputs.forEach(output => {
        numerator += output.safety * output.weight;
        denominator += output.weight;
    });
    
    const defuzzifiedScore = denominator > 0 ? numerator / denominator : 50;
    
    // Determine linguistic safety level
    let linguisticSafety = 'UNKNOWN';
    if (defuzzifiedScore >= 80) linguisticSafety = 'VERY_SAFE';
    else if (defuzzifiedScore >= 60) linguisticSafety = 'SAFE';
    else if (defuzzifiedScore >= 40) linguisticSafety = 'MODERATELY_RISKY';
    else if (defuzzifiedScore >= 20) linguisticSafety = 'RISKY';
    else linguisticSafety = 'VERY_DANGEROUS';
    
    // Prepare membership degrees for display
    const membershipDegrees = [
        { variable: 'Fire Proximity', set: 'VERY_CLOSE', degree: fireProxDegrees.VERY_CLOSE },
        { variable: 'Fire Proximity', set: 'CLOSE', degree: fireProxDegrees.CLOSE },
        { variable: 'Fire Proximity', set: 'MODERATE', degree: fireProxDegrees.MODERATE },
        { variable: 'Fire Proximity', set: 'FAR', degree: fireProxDegrees.FAR },
        { variable: 'Path Length', set: 'VERY_SHORT', degree: pathLenDegrees.VERY_SHORT },
        { variable: 'Path Length', set: 'SHORT', degree: pathLenDegrees.SHORT },
        { variable: 'Path Length', set: 'MEDIUM', degree: pathLenDegrees.MEDIUM },
        { variable: 'Path Length', set: 'LONG', degree: pathLenDegrees.LONG }
    ].filter(m => m.degree > 0).sort((a, b) => b.degree - a.degree);
    
    return {
        overallSafety: Math.round(defuzzifiedScore),
        linguisticSafety,
        fuzzyRules,
        membershipDegrees,
        defuzzifiedScore: defuzzifiedScore.toFixed(2),
        inputs: {
            minFireDistance: minFireDist,
            pathLength: pathLen,
            fireDensity: fireDensity.toFixed(1)
        }
    };
}

// Display reasoning analysis
function displayReasoningAnalysis(path, mode) {
    let analysis;
    let html = '';
    
    if (mode === 'deductive') {
        analysis = deductiveReasoning(path);
        const safetyColor = analysis.safetyScore > 70 ? '#2ecc71' : analysis.safetyScore > 40 ? '#f39c12' : '#e74c3c';
        html = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 8px; color: white; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0;">🔍 DEDUCTIVE REASONING</h4>
                <p style="margin: 5px 0;"><strong>Method:</strong> IF-THEN logical rules</p>
                <p style="margin: 5px 0; font-size: 2em; font-weight: bold;">Safety: <span style="color: ${safetyColor}">${analysis.safetyScore}%</span></p>
            </div>
            
            <div style="background: #fff; padding: 12px; border-left: 4px solid #2196f3; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #2196f3;">📋 Applied Rules (${analysis.rules.length}):</strong>
                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.9em;">
                    ${analysis.rules.slice(0, 6).map(r => `<li style="margin: 4px 0;">${r}</li>`).join('')}
                    ${analysis.rules.length > 6 ? `<li style="margin: 4px 0; font-style: italic;">...and ${analysis.rules.length - 6} more rules</li>` : ''}
                </ul>
            </div>
            
            <div style="background: #fff; padding: 12px; border-left: 4px solid #ff9800; border-radius: 4px;">
                <strong style="color: #ff9800;">💡 Logical Inferences (${analysis.inferences.length}):</strong>
                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.9em;">
                    ${analysis.inferences.map(i => `<li style="margin: 4px 0;">${i}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    else if (mode === 'inductive') {
        analysis = inductiveReasoning(path);
        const confColor = analysis.confidence > 0.7 ? '#2ecc71' : analysis.confidence > 0.5 ? '#f39c12' : '#e74c3c';
        html = `
            <div style="background: linear-gradient(135deg, #8e24aa 0%, #5e35b1 100%); padding: 15px; border-radius: 8px; color: white; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0;">📊 INDUCTIVE REASONING</h4>
                <p style="margin: 5px 0;"><strong>Method:</strong> Pattern learning from observations</p>
                <p style="margin: 5px 0; font-size: 2em; font-weight: bold;">Confidence: <span style="color: ${confColor}">${(analysis.confidence * 100).toFixed(0)}%</span></p>
            </div>
            
            <div style="background: #fff; padding: 12px; border-left: 4px solid #9c27b0; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #9c27b0;">👁️ Observations (${analysis.observations.length}):</strong>
                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.9em;">
                    ${analysis.observations.map(o => `<li style="margin: 4px 0;">${o}</li>`).join('')}
                </ul>
            </div>
            
            <div style="background: #fff; padding: 12px; border-left: 4px solid #673ab7; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #673ab7;">🔍 Detected Patterns (${analysis.patterns.length}):</strong>
                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.9em;">
                    ${analysis.patterns.map(p => `<li style="margin: 4px 0;">${p}</li>`).join('')}
                </ul>
            </div>
            
            <div style="background: #fff; padding: 12px; border-left: 4px solid #4caf50; border-radius: 4px;">
                <strong style="color: #4caf50;">🔮 Predictions (${analysis.predictions.length}):</strong>
                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.9em;">
                    ${analysis.predictions.map(p => `<li style="margin: 4px 0;">${p}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    else if (mode === 'probabilistic') {
        analysis = probabilisticReasoning(path);
        const probColor = analysis.pathProbability > 70 ? '#2ecc71' : analysis.pathProbability > 40 ? '#f39c12' : '#e74c3c';
        html = `
            <div style="background: linear-gradient(135deg, #ff6f00 0%, #ff9800 100%); padding: 15px; border-radius: 8px; color: white; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0;">📈 PROBABILISTIC REASONING</h4>
                <p style="margin: 5px 0;"><strong>Method:</strong> Statistical probability calculation</p>
                <p style="margin: 5px 0; font-size: 2em; font-weight: bold;">P(Success): <span style="color: ${probColor}">${analysis.pathProbability}%</span></p>
            </div>
            
            <div style="background: #fff; padding: 12px; border-left: 4px solid #ff9800; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #ff9800;">📊 Cell-by-Cell Probabilities:</strong>
                <div style="max-height: 180px; overflow-y: auto; margin-top: 8px; font-size: 0.85em; background: #fafafa; padding: 8px; border-radius: 4px;">
                    ${analysis.cellProbabilities.slice(0, 12).map(c => {
                        const color = c.probability > 80 ? '#2ecc71' : c.probability > 60 ? '#f39c12' : '#e74c3c';
                        return `<div style="padding: 4px 0; border-bottom: 1px solid #eee;">
                            <strong>Step ${c.step}</strong> at (${c.position[0]},${c.position[1]}): 
                            <span style="color: ${color}; font-weight: bold; font-size: 1.1em;">${c.probability}%</span>
                            <span style="color: #999; font-size: 0.9em;">(${c.fireDistance} cells from fire)</span>
                        </div>`;
                    }).join('')}
                    ${analysis.cellProbabilities.length > 12 ? `<div style="padding: 8px; text-align: center; font-style: italic; color: #666;">...and ${analysis.cellProbabilities.length - 12} more steps</div>` : ''}
                </div>
            </div>
            
            <div style="background: #fff; padding: 12px; border-left: 4px solid #f44336; border-radius: 4px; margin-bottom: 10px;">
                <strong style="color: #f44336;">⚠️ Risk Factors (${analysis.riskFactors.length}):</strong>
                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.9em;">
                    ${analysis.riskFactors.map(r => `<li style="margin: 4px 0;">${r}</li>`).join('')}
                </ul>
            </div>
            
            <div style="background: ${analysis.pathProbability > 70 ? '#e8f5e9' : analysis.pathProbability > 50 ? '#fff3e0' : '#ffebee'}; padding: 12px; border-radius: 6px; border: 2px solid ${analysis.pathProbability > 70 ? '#4caf50' : analysis.pathProbability > 50 ? '#ff9800' : '#f44336'};">
                <strong style="color: #333;">💡 Interpretation:</strong><br>
                <span style="font-size: 0.95em;">
                    ${analysis.pathProbability > 80 ? '✅ <strong>High probability</strong> of safe passage. Route strongly recommended.' : 
                      analysis.pathProbability > 60 ? '⚠️ <strong>Moderate risk</strong>. Route viable but exercise caution.' :
                      analysis.pathProbability > 40 ? '⚠️ <strong>Significant risk</strong>. Alternative routes recommended if available.' :
                      '❌ <strong>High risk</strong>. Strongly advise finding alternative evacuation route.'}
                </span>
            </div>
        `;
    }
    else if (mode === 'fuzzy') {
        analysis = fuzzyReasoning(path);
        const safetyColor = analysis.overallSafety > 70 ? '#2ecc71' : analysis.overallSafety > 40 ? '#f39c12' : '#e74c3c';
        const linguisticColors = {
            'VERY_SAFE': '#2ecc71',
            'SAFE': '#27ae60',
            'MODERATELY_RISKY': '#f39c12',
            'RISKY': '#e67e22',
            'VERY_DANGEROUS': '#e74c3c'
        };

        // Only show the highest membership for fire proximity and path length
        const fireProx = analysis.membershipDegrees.filter(m => m.variable === 'Fire Proximity');
        const pathLen = analysis.membershipDegrees.filter(m => m.variable === 'Path Length');
        const maxFireProx = fireProx.length > 0 ? fireProx.reduce((a, b) => b.degree > a.degree ? b : a) : null;
        const maxPathLen = pathLen.length > 0 ? pathLen.reduce((a, b) => b.degree > a.degree ? b : a) : null;

        html = `
            <div style="background: linear-gradient(135deg, #00bcd4 0%, #009688 100%); padding: 15px; border-radius: 8px; color: white; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0;">🌫️ FUZZY LOGIC REASONING</h4>
                <p style="margin: 5px 0;"><strong>Method:</strong> Handles uncertainty with linguistic variables & degrees of membership</p>
                <p style="margin: 5px 0; font-size: 1.8em; font-weight: bold;">
                    Safety: <span style="color: ${safetyColor}">${analysis.overallSafety}%</span>
                    <span style="font-size: 0.6em; display: block; margin-top: 5px; color: ${linguisticColors[analysis.linguisticSafety]};">${analysis.linguisticSafety.replace(/_/g, ' ')}</span>
                </p>
            </div>
            
            <div style="background: #fff; padding: 12px; border-left: 4px solid #00bcd4; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #00bcd4;">📊 Crisp Inputs:</strong>
                <div style="margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 0.9em;">
                    <div style="padding: 3px 0;">🔥 <strong>Min Fire Distance:</strong> ${analysis.inputs.minFireDistance} cells</div>
                    <div style="padding: 3px 0;">📏 <strong>Path Length:</strong> ${analysis.inputs.pathLength} steps</div>
                    <div style="padding: 3px 0;">🌡️ <strong>Fire Density:</strong> ${analysis.inputs.fireDensity}%</div>
                </div>
            </div>
            
            <div style="background: #fff; padding: 12px; border-left: 4px solid #009688; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #009688;">🎯 Membership Degrees (Fuzzification):</strong>
                <div style="margin: 8px 0; font-size: 0.85em;">
                    ${maxFireProx ? (() => {
                        const barWidth = (maxFireProx.degree * 100).toFixed(0);
                        const barColor = maxFireProx.degree > 0.7 ? '#00bcd4' : maxFireProx.degree > 0.4 ? '#ffa726' : '#ef5350';
                        return `<div style="margin: 8px 0; padding: 6px; background: #fafafa; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span><strong>${maxFireProx.variable}:</strong> ${maxFireProx.set.replace(/_/g, ' ')}</span>
                                <span style="font-weight: bold; color: ${barColor};">${(maxFireProx.degree * 100).toFixed(0)}%</span>
                            </div>
                            <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                                <div style="background: ${barColor}; width: ${barWidth}%; height: 100%; transition: width 0.3s;"></div>
                            </div>
                        </div>`;
                    })() : ''}
                    ${maxPathLen ? (() => {
                        const barWidth = (maxPathLen.degree * 100).toFixed(0);
                        const barColor = maxPathLen.degree > 0.7 ? '#00bcd4' : maxPathLen.degree > 0.4 ? '#ffa726' : '#ef5350';
                        return `<div style="margin: 8px 0; padding: 6px; background: #fafafa; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span><strong>${maxPathLen.variable}:</strong> ${maxPathLen.set.replace(/_/g, ' ')}</span>
                                <span style="font-weight: bold; color: ${barColor};">${(maxPathLen.degree * 100).toFixed(0)}%</span>
                            </div>
                            <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                                <div style="background: ${barColor}; width: ${barWidth}%; height: 100%; transition: width 0.3s;"></div>
                            </div>
                        </div>`;
                    })() : ''}
                </div>
            </div>
            
            <div style="background: #fff; padding: 12px; border-left: 4px solid #26a69a; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #26a69a;">⚡ Fuzzy Rules Applied (${analysis.fuzzyRules.length}):</strong>
                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.85em;">
                    ${analysis.fuzzyRules.map(r => `<li style="margin: 6px 0; line-height: 1.4;">${r}</li>`).join('')}
                </ul>
            </div>
            
            <div style="background: #fff; padding: 12px; border-left: 4px solid #ff7043; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #ff7043;">🎲 Defuzzification (Center of Gravity):</strong>
                <p style="margin: 8px 0; font-size: 0.9em;">
                    Weighted average of fuzzy rule outputs: <strong>${analysis.defuzzifiedScore}</strong>
                </p>
            </div>
            
            <div style="background: ${analysis.overallSafety > 70 ? '#e8f5e9' : analysis.overallSafety > 50 ? '#fff3e0' : '#ffebee'}; padding: 12px; border-radius: 6px; border: 2px solid ${safetyColor};">
                <strong style="color: #333;">💡 Fuzzy Interpretation:</strong><br>
                <span style="font-size: 0.95em;">
                    The path has a <strong style="color: ${safetyColor};">${analysis.linguisticSafety.replace(/_/g, ' ')}</strong> level with ${analysis.overallSafety}% safety score.
                    ${analysis.overallSafety > 80 ? '✅ Fuzzy rules strongly recommend this route.' : 
                      analysis.overallSafety > 60 ? '⚠️ Moderate uncertainty detected. Proceed with caution.' :
                      analysis.overallSafety > 40 ? '⚠️ High uncertainty and risk factors present.' :
                      '❌ Fuzzy analysis indicates dangerous conditions.'}
                </span>
            </div>
        `;
    }
    
    document.getElementById('reasoningContent').innerHTML = html;
    document.getElementById('reasoning-analysis').style.display = 'block';
}

function createGrid() {
    rows = parseInt(document.getElementById('rows').value);
    cols = parseInt(document.getElementById('cols').value);
    
    grid = Array(rows).fill().map(() => Array(cols).fill(0));
    
    // 🔥 Initialize fire physics arrays
    initializeFirePhysics();
    
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
    
    // 🔥 If placing fire, set initial fire physics values
    if (currentMode === 2 && firePhysics.fireIntensity[row] && firePhysics.fireIntensity[row][col] !== undefined) {
        firePhysics.fireIntensity[row][col] = 10; // Maximum intensity
    }
    
    updateCellDisplay(row, col);
}

function updateCellDisplay(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cell.className = 'cell';
    
    switch(grid[row][col]) {
        case 0: cell.classList.add('empty'); break;
        case 1: cell.classList.add('wall'); break;
        case 2: 
            cell.classList.add('fire');
            // Apply fire intensity gradient if physics enabled
            if (firePhysics.enabled && firePhysics.fireIntensity[row][col] > 0) {
                const fireColor = getFireIntensityColor(firePhysics.fireIntensity[row][col]);
                if (fireColor) {
                    cell.style.background = fireColor;
                    cell.style.boxShadow = `0 0 20px ${fireColor}, inset 0 0 10px rgba(255, 200, 0, 0.5)`;
                }
            }
            break;
        case 3: cell.classList.add('exit'); break;
        case 4: cell.classList.add('start'); break;
        case 5: cell.classList.add('path'); break;
        case 51: cell.classList.add('path1'); break;
        case 52: cell.classList.add('path2'); break;
        case 53: cell.classList.add('path3'); break;
        case 54: cell.classList.add('path4'); break;
        case 55: cell.classList.add('path5'); break;
        case 56: cell.classList.add('path6'); break;
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
    let evacuatedCount = 0;
    
    // Update all agents
    agents.forEach(agent => {
        agent.update(agents);
        if (!agent.reached) {
            allReached = false;
        } else {
            evacuatedCount++;
        }
    });
    
    // Draw all agents
    agents.forEach(agent => {
        agent.draw(ctx);
    });
    
    if (allReached && agents.length > 0) {
        // Calculate statistics
        const avgTime = agents.reduce((sum, a) => sum + a.evacuationTime, 0) / agents.length;
        const slowest = Math.max(...agents.map(a => a.evacuationTime));
        const fastest = Math.min(...agents.map(a => a.evacuationTime));
        
        setTimeout(() => {
            document.getElementById('statsContent').innerHTML += 
                `<div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #2ecc71;">
                    <p style="color: #27ae60; font-weight: bold; font-size: 1.1em; margin: 0 0 10px 0;">
                        ✅ ALL ${agents.length} AGENTS EVACUATED SUCCESSFULLY!
                    </p>
                    <div style="font-size: 0.9em; color: #333;">
                        <strong>⏱️ Evacuation Times:</strong><br>
                        Average: ${avgTime.toFixed(0)} frames | Fastest: ${fastest} | Slowest: ${slowest}
                    </div>
                </div>`;
        }, 500);
        simulationRunning = false;
        return;
    }
    
    animationFrame = requestAnimationFrame(animate);
}

function clearPath() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 5 || (grid[i][j] >= 51 && grid[i][j] <= 56)) {
                grid[i][j] = 0;
                updateCellDisplay(i, j);
            }
        }
    }
    stopSimulation();
}

function showOptimalPath() {
    if (allFoundPaths.length === 0) {
        alert('Please click "Find Path" first to discover all escape routes!');
        return;
    }
    
    // Clear existing paths
    clearPath();
    
    // Get the shortest path (already sorted in findPath function)
    const optimalPath = allFoundPaths[0];
    escapePath = optimalPath.path;
    
    // Draw only the optimal path with animation in bright green/gold color
    optimalPath.path.forEach((pos, index) => {
        setTimeout(() => {
            const [row, col] = pos;
            // Don't overwrite start or exit cells
            if (grid[row][col] === 0) {
                grid[row][col] = 5; // Use the original path color
                updateCellDisplay(row, col);
            }
        }, index * 30);
    });
    
    // Display optimal path statistics
    const statsHtml = `
        <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 15px; border-radius: 8px; color: white; margin-bottom: 15px; box-shadow: 0 4px 8px rgba(255,165,0,0.3);">
            <h4 style="margin: 0 0 10px 0;">⭐ OPTIMAL PATH (SHORTEST)</h4>
            <p style="margin: 5px 0; font-size: 1.5em; font-weight: bold;">✅ ${optimalPath.length} STEPS</p>
            <p style="margin: 5px 0;"><strong>Exit Location:</strong> (${optimalPath.exitPosition[0]}, ${optimalPath.exitPosition[1]})</p>
            <p style="margin: 5px 0;"><strong>Nodes Explored:</strong> ${optimalPath.nodesExplored}</p>
        </div>
        <div style="background: #fff; padding: 12px; border-left: 4px solid #FFD700; border-radius: 4px; margin-bottom: 10px;">
            <strong style="color: #FF8C00;">🎯 Why This Path is Optimal:</strong>
            <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.9em;">
                <li>Shortest distance: Only <strong>${optimalPath.length} steps</strong></li>
                <li>Most efficient route among ${allFoundPaths.length} possible paths</li>
                <li>Minimizes evacuation time and fire exposure</li>
                <li>Best path for emergency evacuation</li>
            </ul>
        </div>
        <p style="color: #667eea; margin-top: 10px;">💡 Click "Start Simulation" to see agents evacuate via this optimal path!</p>
    `;
    
    document.getElementById('statsContent').innerHTML = statsHtml;
    document.getElementById('recommendation').style.display = 'none';
    
    console.log(`Optimal path: ${optimalPath.length} steps to exit at (${optimalPath.exitPosition[0]}, ${optimalPath.exitPosition[1]})`);
}

function randomBuilding() {
    resetGrid();
    
    // Add random walls
    let wallCount = 0;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (Math.random() < 0.2) {
                grid[i][j] = 1;
                updateCellDisplay(i, j);
                wallCount++;
            }
        }
    }
    
    // Add fire (2-4 spots) - ensure they're placed
    const fireCount = Math.floor(Math.random() * 3) + 2;
    const firePositions = [];
    let fireAttempts = 0;
    while (firePositions.length < fireCount && fireAttempts < 100) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        if (grid[row][col] === 0) {
            grid[row][col] = 2;
            // Initialize fire intensity
            if (firePhysics.fireIntensity[row]) {
                firePhysics.fireIntensity[row][col] = 10;
            }
            updateCellDisplay(row, col);
            firePositions.push([row, col]);
        }
        fireAttempts++;
    }
    
    // Ensure at least 1 fire exists
    if (firePositions.length === 0) {
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (grid[i][j] === 0) {
                    grid[i][j] = 2;
                    // Initialize fire intensity
                    if (firePhysics.fireIntensity[i]) {
                        firePhysics.fireIntensity[i][j] = 10;
                    }
                    updateCellDisplay(i, j);
                    firePositions.push([i, j]);
                    break;
                }
            }
            if (firePositions.length > 0) break;
        }
    }
    
    // Add start position (random)
    let startPos = null;
    let startPlaced = false;
    while (!startPlaced) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        if (grid[row][col] === 0) {
            grid[row][col] = 4;
            updateCellDisplay(row, col);
            startPos = [row, col];
            startPlaced = true;
        }
    }
    
    // Add exits (2-3 on edges)
    const exitCount = Math.floor(Math.random() * 2) + 2;
    const exitPositions = [];
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
                exitPositions.push([row, col]);
                exitPlaced = true;
            }
        }
    }
    
    // Analyze building and recommend best algorithm
    analyzeBuildingAndRecommend(startPos, exitPositions, firePositions, wallCount);
}

function analyzeBuildingAndRecommend(startPos, exitPositions, firePositions, wallCount) {
    // Validate inputs
    if (!startPos || exitPositions.length === 0) {
        console.error('Invalid building: missing start or exits');
        return;
    }
    
    // Calculate building characteristics
    const totalCells = rows * cols;
    const wallDensity = (wallCount / totalCells) * 100;
    const fireDensity = (firePositions.length / totalCells) * 100;
    
    // Calculate average distance to exits
    let totalDistance = 0;
    let minDistance = Infinity;
    exitPositions.forEach(exit => {
        const dist = Math.abs(startPos[0] - exit[0]) + Math.abs(startPos[1] - exit[1]);
        totalDistance += dist;
        if (dist < minDistance) minDistance = dist;
    });
    const avgExitDistance = totalDistance / exitPositions.length;
    
    // Calculate minimum distance to fire
    let minFireDistance = Infinity;
    if (firePositions.length > 0) {
        firePositions.forEach(fire => {
            const dist = Math.abs(startPos[0] - fire[0]) + Math.abs(startPos[1] - fire[1]);
            if (dist < minFireDistance) minFireDistance = dist;
        });
    } else {
        minFireDistance = 20; // No fire, use large value
    }
    
    // Algorithm scoring based on characteristics
    const scores = {
        bfs: 0,
        ucs: 0,
        astar: 0,
        greedy: 0
    };
    
    // Factor 1: Path Optimality Priority (most important - matches Compare logic)
    // BFS and A* guarantee optimal paths, UCS too
    scores.bfs += 30;
    scores.ucs += 30;
    scores.astar += 35; // Slight edge for efficiency
    scores.greedy += 10; // Greedy often not optimal
    
    // Factor 2: Building Complexity (walls)
    if (wallDensity > 25) {
        // High complexity - A* and UCS excel with guidance
        scores.astar += 30;
        scores.ucs += 20;
        scores.greedy += 25; // Greedy can be fast here
        scores.bfs += 15;
    } else if (wallDensity > 15) {
        // Medium complexity
        scores.astar += 25;
        scores.ucs += 20;
        scores.greedy += 20;
        scores.bfs += 20;
    } else {
        // Low complexity - BFS and Greedy shine
        scores.bfs += 25;
        scores.greedy += 25;
        scores.astar += 20;
        scores.ucs += 15;
    }
    
    // Factor 3: Distance to exit (efficiency matters on long paths)
    if (avgExitDistance > 15) {
        // Long distance - heuristic algorithms win
        scores.astar += 25;
        scores.greedy += 30; // Greedy very fast on long paths
        scores.ucs += 15;
        scores.bfs += 10;
    } else if (avgExitDistance > 8) {
        // Medium distance
        scores.astar += 20;
        scores.greedy += 20;
        scores.bfs += 15;
        scores.ucs += 15;
    } else {
        // Short distance - all work well
        scores.bfs += 20;
        scores.astar += 15;
        scores.ucs += 15;
        scores.greedy += 20;
    }
    
    // Factor 4: Fire proximity - BUT Greedy can still win if path is good
    if (minFireDistance < 5) {
        // Close to fire - optimal path critical, but don't over-penalize Greedy
        scores.astar += 20;
        scores.ucs += 20;
        scores.bfs += 15;
        scores.greedy += 5; // Small penalty
    } else if (minFireDistance < 10) {
        // Moderate fire distance
        scores.astar += 15;
        scores.ucs += 15;
        scores.bfs += 15;
        scores.greedy += 15;
    } else {
        // Far from fire - Greedy advantage
        scores.greedy += 20;
        scores.astar += 15;
        scores.bfs += 10;
        scores.ucs += 10;
    }
    
    // Factor 5: Node exploration efficiency (Greedy explores least, A* second best)
    scores.greedy += 25; // Greedy explores fewest nodes
    scores.astar += 20;  // A* very efficient
    scores.bfs += 5;     // BFS explores many
    scores.ucs += 5;     // UCS explores many
    
    // Normalize scores to percentages
    const maxScore = Math.max(...Object.values(scores));
    const percentages = {};
    for (const [algo, score] of Object.entries(scores)) {
        percentages[algo] = Math.round((score / maxScore) * 100);
    }
    
    // Find best algorithm
    const bestAlgo = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    
    // Display recommendation
    displayBuildingRecommendation(percentages, bestAlgo, {
        wallDensity: wallDensity.toFixed(1),
        fireDensity: fireDensity.toFixed(1),
        avgExitDistance: avgExitDistance.toFixed(1),
        minFireDistance: minFireDistance.toFixed(1),
        exitCount: exitPositions.length,
        fireCount: firePositions.length
    });
}

function displayBuildingRecommendation(percentages, bestAlgo, stats) {
    const algoNames = {
        'bfs': 'BFS (Breadth-First Search)',
        'ucs': 'UCS (Uniform Cost Search)',
        'astar': 'A* Search',
        'greedy': 'Greedy Best-First'
    };
    
    const algoEmojis = {
        'bfs': '🌊',
        'ucs': '💰',
        'astar': '⭐',
        'greedy': '⚡'
    };
    
    const algoColors = {
        'bfs': '#2196F3',
        'ucs': '#9C27B0',
        'astar': '#FFD700',
        'greedy': '#4CAF50'
    };
    
    // Sort algorithms by percentage
    const sortedAlgos = Object.entries(percentages).sort((a, b) => b[1] - a[1]);
    
    let html = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 8px; color: white; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(102,126,234,0.4);">
            <h4 style="margin: 0 0 10px 0;">🏢 Building Analysis Complete</h4>
            <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 5px; margin: 10px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.9em;">
                    <div>🧱 Wall Density: <strong>${stats.wallDensity}%</strong></div>
                    <div>🔥 Fire Density: <strong>${stats.fireDensity}%</strong></div>
                    <div>📏 Avg Exit Dist: <strong>${stats.avgExitDistance}</strong></div>
                    <div>🚨 Min Fire Dist: <strong>${stats.minFireDistance}</strong></div>
                    <div>🚪 Exits: <strong>${stats.exitCount}</strong></div>
                    <div>🔥 Fire Spots: <strong>${stats.fireCount}</strong></div>
                </div>
            </div>
        </div>
        
        <div style="background: linear-gradient(135deg, ${algoColors[bestAlgo]} 0%, ${algoColors[bestAlgo]}dd 100%); padding: 15px; border-radius: 8px; color: white; margin-bottom: 15px; box-shadow: 0 6px 16px rgba(0,0,0,0.2);">
            <h4 style="margin: 0 0 10px 0; font-size: 1.3em;">${algoEmojis[bestAlgo]} RECOMMENDED: ${algoNames[bestAlgo]}</h4>
            <p style="margin: 5px 0; font-size: 1.8em; font-weight: bold;">Match Score: ${percentages[bestAlgo]}% 🎯</p>
            <p style="margin: 10px 0 0 0; font-size: 0.95em; opacity: 0.95;">Best choice for this building configuration</p>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h5 style="margin: 0 0 12px 0; color: #333;">📊 All Algorithm Suitability Scores:</h5>
    `;
    
    sortedAlgos.forEach(([algo, percentage]) => {
        const isWinner = algo === bestAlgo;
        const barColor = algoColors[algo];
        html += `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: ${isWinner ? 'bold' : 'normal'}; color: ${barColor};">
                        ${algoEmojis[algo]} ${algoNames[algo]} ${isWinner ? '🏆' : ''}
                    </span>
                    <span style="font-weight: bold; color: ${barColor}; font-size: 1.1em;">${percentage}%</span>
                </div>
                <div style="background: #e0e0e0; height: ${isWinner ? '12px' : '8px'}; border-radius: 10px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, ${barColor}, ${barColor}cc); width: ${percentage}%; height: 100%; transition: width 0.8s ease-out; box-shadow: ${isWinner ? '0 0 8px ' + barColor : 'none'};"></div>
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
        <p style="margin-top: 15px; color: #667eea; font-weight: 500; text-align: center;">
            💡 Click "Find Path" with the recommended algorithm for optimal results!
        </p>
    `;
    
    document.getElementById('statsContent').innerHTML = html;
    document.getElementById('recommendation').style.display = 'none';
    
    // Auto-select the recommended algorithm
    document.getElementById('algorithm').value = bestAlgo;
}

async function findPath() {
    clearPath();
    stopSimulation();
    
    const algorithm = document.getElementById('algorithm').value;
    const heuristic = document.getElementById('heuristic').value;
    
    // First, get all exits from the grid
    const exits = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 3) {
                exits.push([i, j]);
            }
        }
    }
    
    if (exits.length === 0) {
        alert('No exits found! Please add exit points.');
        return;
    }
    
    // Color palette for different exit paths
    const pathColors = [
        { code: 51, name: 'Path 1' },  // Light brown/tan
        { code: 52, name: 'Path 2' },  // Orange
        { code: 53, name: 'Path 3' },  // Yellow
        { code: 54, name: 'Path 4' },  // Light green
        { code: 55, name: 'Path 5' },  // Light blue
        { code: 56, name: 'Path 6' }   // Light purple
    ];
    
    let allPaths = [];
    let totalNodesExplored = 0;
    
    // Find path to each exit
    for (let exitIndex = 0; exitIndex < exits.length; exitIndex++) {
        const exit = exits[exitIndex];
        
        // Create a temporary grid where only this exit is active
        const tempGrid = grid.map(row => [...row]);
        for (let i = 0; i < exits.length; i++) {
            if (i !== exitIndex) {
                const [r, c] = exits[i];
                tempGrid[r][c] = 0; // Temporarily remove other exits
            }
        }
        
        const data = {
            grid: tempGrid,
            algorithm: algorithm,
            heuristic: heuristic,
            firePhysics: firePhysics.enabled ? {
                enabled: true,
                fireIntensity: firePhysics.fireIntensity,
                smokeDensity: firePhysics.smokeDensity,
                heatLevel: firePhysics.heatLevel
            } : { enabled: false }
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
            
            if (result.path) {
                allPaths.push({
                    path: result.path,
                    exitPosition: exit,
                    length: result.path_length,
                    nodesExplored: result.nodes_explored,
                    colorCode: pathColors[exitIndex % pathColors.length].code,
                    colorName: pathColors[exitIndex % pathColors.length].name
                });
                totalNodesExplored += result.nodes_explored;
            }
        } catch (error) {
            console.error('Error finding path to exit:', error);
        }
    }
    
    if (allPaths.length === 0) {
        document.getElementById('statsContent').innerHTML = 
            `<p style="color: red;">❌ No paths found to any exit!</p>`;
        document.getElementById('recommendation').style.display = 'none';
        return;
    }
    
    // Store all paths globally for optimal path button
    allFoundPaths = allPaths;
    
    // Draw all paths with different colors
    allPaths.forEach((pathObj, pathIndex) => {
        pathObj.path.forEach((pos, index) => {
            setTimeout(() => {
                const [row, col] = pos;
                // Don't overwrite start or exit cells
                if (grid[row][col] === 0 || grid[row][col] === 5 || (grid[row][col] >= 51 && grid[row][col] <= 56)) {
                    grid[row][col] = pathObj.colorCode;
                    updateCellDisplay(row, col);
                }
            }, (pathIndex * 500) + (index * 30)); // Stagger each path
        });
    });
    
    // Store the shortest path as escapePath for simulation
    allPaths.sort((a, b) => a.length - b.length);
    escapePath = allPaths[0].path;
    
    // 🧠 RECORD EVACUATION FOR MACHINE LEARNING
    const buildingProfile = getBuildingProfile();
    const bestResult = {
        path_length: allPaths[0].length,
        nodes_explored: allPaths[0].nodesExplored,
        algorithm: algorithm
    };
    recordEvacuation(buildingProfile, algorithm, bestResult);
    
    // Display statistics for all paths
    displayAllPathsStats(allPaths, totalNodesExplored, algorithm);
    
    // Show recommendation
    document.getElementById('recommendation').style.display = 'block';
}

function displayAllPathsStats(allPaths, totalNodesExplored, algorithm) {
    let pathsHtml = '<div style="margin-bottom: 15px;"><strong>📍 Paths to All Exits:</strong></div>';
    
    allPaths.forEach((pathObj, index) => {
        const colorStyle = getColorForCode(pathObj.colorCode);
        pathsHtml += `
            <div style="background: ${colorStyle}; padding: 10px; border-radius: 5px; margin-bottom: 8px;">
                <strong>Exit ${index + 1}</strong> at (${pathObj.exitPosition[0]}, ${pathObj.exitPosition[1]})<br>
                Length: <strong>${pathObj.length} steps</strong> | 
                Nodes Explored: ${pathObj.nodesExplored}
            </div>
        `;
    });
    
    pathsHtml += `
        <div style="margin-top: 15px; padding: 10px; background: #e8f5e9; border-radius: 5px;">
            <strong>✅ Shortest Path:</strong> Exit ${allPaths.findIndex(p => p === allPaths[0]) + 1} 
            (${allPaths[0].length} steps)<br>
            <strong>Total Nodes Explored:</strong> ${totalNodesExplored}<br>
            <strong>Algorithm:</strong> ${algorithm}
        </div>
        <p style="color: #667eea; margin-top: 10px;">💡 Click "Start Simulation" to see agents evacuate via shortest path!</p>
    `;
    
    document.getElementById('statsContent').innerHTML = pathsHtml;
}

function getColorForCode(code) {
    const colorMap = {
        51: '#C8A882',  // Light brown/tan
        52: '#FFB366',  // Orange
        53: '#FFE066',  // Yellow
        54: '#B3E6B3',  // Light green
        55: '#B3D9FF',  // Light blue
        56: '#D1B3FF'   // Light purple
    };
    return colorMap[code] || '#C8A882';
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
                heuristic: 'manhattan',
                firePhysics: firePhysics.enabled ? {
                    enabled: true,
                    fireIntensity: firePhysics.fireIntensity,
                    smokeDensity: firePhysics.smokeDensity,
                    heatLevel: firePhysics.heatLevel
                } : { enabled: false }
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
    
    // Add reasoning analysis if a mode is active
    let reasoningHtml = '';
    if (reasoningMode !== 'none') {
        reasoningHtml = '<div style="margin-top: 20px;"><h4>🧠 Reasoning Analysis per Algorithm</h4>';
        
        for (const [algo, result] of Object.entries(results)) {
            if (result.path) {
                const analysis = getReasoningAnalysisForAlgo(result.path, algo, algoNames[algo]);
                reasoningHtml += `
                    <div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 5px solid ${algo === bestAlgo ? '#FFD700' : '#667eea'};">
                        <h5 style="margin: 0 0 10px 0; color: #333;">${algoNames[algo]} ${algo === bestAlgo ? '🏆' : ''}</h5>
                        ${analysis}
                    </div>
                `;
            }
        }
        reasoningHtml += '</div>';
    }
    
    document.getElementById('statsContent').innerHTML = `
        <h4>📊 Algorithm Comparison</h4>
        ${tableHtml}
        <p style="margin-top: 10px;"><strong>Winner:</strong> ${algoNames[bestAlgo]} 🏆</p>
        <p><small>Best algorithm balances path optimality and efficiency</small></p>
        ${reasoningHtml}
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

// Helper function to generate reasoning analysis for each algorithm
function getReasoningAnalysisForAlgo(path, algoKey, algoName) {
    let analysis;
    let html = '';
    
    if (reasoningMode === 'deductive') {
        analysis = deductiveReasoning(path);
        const safetyColor = analysis.safetyScore > 70 ? '#2ecc71' : analysis.safetyScore > 40 ? '#f39c12' : '#e74c3c';
        html = `
            <div style="background: white; padding: 10px; border-radius: 5px; margin-top: 8px;">
                <p style="margin: 5px 0;"><strong>🔍 Deductive Analysis:</strong></p>
                <p style="margin: 5px 0;">Safety Score: <span style="color: ${safetyColor}; font-weight: bold; font-size: 1.2em;">${analysis.safetyScore}%</span></p>
                <p style="margin: 5px 0; font-size: 0.9em;"><strong>Rules Applied:</strong> ${analysis.rules.length}</p>
                <p style="margin: 5px 0; font-size: 0.9em;"><strong>Key Inference:</strong> ${analysis.inferences[0] || 'No major issues detected'}</p>
            </div>
        `;
    }
    else if (reasoningMode === 'inductive') {
        analysis = inductiveReasoning(path);
        const confColor = analysis.confidence > 0.7 ? '#2ecc71' : analysis.confidence > 0.5 ? '#f39c12' : '#e74c3c';
        html = `
            <div style="background: white; padding: 10px; border-radius: 5px; margin-top: 8px;">
                <p style="margin: 5px 0;"><strong>📊 Inductive Analysis:</strong></p>
                <p style="margin: 5px 0;">Confidence: <span style="color: ${confColor}; font-weight: bold; font-size: 1.2em;">${(analysis.confidence * 100).toFixed(0)}%</span></p>
                <p style="margin: 5px 0; font-size: 0.9em;"><strong>Patterns Detected:</strong> ${analysis.patterns.length}</p>
                <p style="margin: 5px 0; font-size: 0.9em;"><strong>Prediction:</strong> ${analysis.predictions[0] || 'Path appears safe based on patterns'}</p>
            </div>
        `;
    }
    else if (reasoningMode === 'probabilistic') {
        analysis = probabilisticReasoning(path);
        const probColor = analysis.pathProbability > 70 ? '#2ecc71' : analysis.pathProbability > 40 ? '#f39c12' : '#e74c3c';
        html = `
            <div style="background: white; padding: 10px; border-radius: 5px; margin-top: 8px;">
                <p style="margin: 5px 0;"><strong>📈 Probabilistic Analysis:</strong></p>
                <p style="margin: 5px 0;">Success Probability: <span style="color: ${probColor}; font-weight: bold; font-size: 1.2em;">${analysis.pathProbability}%</span></p>
                <p style="margin: 5px 0; font-size: 0.9em;"><strong>Risk Factors:</strong> ${analysis.riskFactors.length}</p>
                <p style="margin: 5px 0; font-size: 0.9em;"><strong>Assessment:</strong> ${
                    analysis.pathProbability > 70 ? '✅ High probability of safe passage' :
                    analysis.pathProbability > 50 ? '⚠️ Moderate risk level' :
                    '❌ High risk - caution advised'
                }</p>
            </div>
        `;
    }
    else if (reasoningMode === 'fuzzy') {
        analysis = fuzzyReasoning(path);
        const safetyColor = analysis.overallSafety > 70 ? '#2ecc71' : analysis.overallSafety > 40 ? '#f39c12' : '#e74c3c';
        html = `
            <div style="background: white; padding: 10px; border-radius: 5px; margin-top: 8px;">
                <p style="margin: 5px 0;"><strong>🌫️ Fuzzy Logic Analysis:</strong></p>
                <p style="margin: 5px 0;">Overall Safety: <span style="color: ${safetyColor}; font-weight: bold; font-size: 1.2em;">${analysis.overallSafety}%</span></p>
                <p style="margin: 5px 0; font-size: 0.9em;"><strong>Linguistic Assessment:</strong> ${analysis.linguisticSafety.replace(/_/g, ' ')}</p>
                <p style="margin: 5px 0; font-size: 0.9em;"><strong>Min Fire Distance:</strong> ${analysis.inputs.minFireDistance} cells</p>
            </div>
        `;
    }
    
    return html;
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

// Draw all paths with different colors, highlight optimal
async function showAllEscapePaths() {
    clearPath();
    stopSimulation();
    const data = { grid: grid };
    try {
        const response = await fetch('/find_all_paths', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.error) {
            alert('Error: ' + result.error);
            return;
        }
        const paths = result.paths;
        if (!paths || paths.length === 0) {
            alert('No escape paths found!');
            return;
        }
        // Color palette for paths
        const palette = [
            '#00bcd4', '#ff9800', '#8bc34a', '#e91e63', '#9c27b0', '#ffc107', '#3f51b5', '#009688', '#f44336', '#607d8b'
        ];
        // Draw all paths
        paths.forEach((path, idx) => {
            const color = palette[idx % palette.length] + '99'; // semi-transparent
            path.forEach(([row, col]) => {
                if (grid[row][col] === 0) {
                    drawCellHighlight(row, col, color);
                }
            });
        });
        // Highlight the first (optimal) path
        const bestPath = paths[0];
        bestPath.forEach(([row, col]) => {
            if (grid[row][col] === 0) {
                drawCellHighlight(row, col, '#ffd600'); // bright yellow
            }
        });
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Helper to highlight a cell with color
function drawCellHighlight(row, col, color) {
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = color;
    ctx.fillRect(col * cellSize + 2, row * cellSize + 2, cellSize - 4, cellSize - 4);
    ctx.restore();
}
