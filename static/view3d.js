// 🎮 3D VISUALIZATION SYSTEM FOR FIRE ESCAPE SIMULATOR

// Toggle between 2D and 3D views
function toggleView(mode) {
    const view2d = document.getElementById('view2d-container');
    const view3d = document.getElementById('view3d-container');
    const btn2d = document.getElementById('view2d-btn');
    const btn3d = document.getElementById('view3d-btn');
    
    if (mode === '3d') {
        view2d.style.display = 'none';
        view3d.style.display = 'block';
        btn2d.classList.remove('active');
        btn3d.classList.add('active');
        
        if (!view3D.enabled) {
            init3DView();
        }
        view3D.enabled = true;
        animate3D();
    } else {
        view2d.style.display = 'block';
        view3d.style.display = 'none';
        btn2d.classList.add('active');
        btn3d.classList.remove('active');
        view3D.enabled = false;
        
        if (view3D.animationId) {
            cancelAnimationFrame(view3D.animationId);
        }
    }
}

// Initialize 3D scene
function init3DView() {
    const container = document.getElementById('renderer3d');
    container.innerHTML = ''; // Clear previous content
    
    // Scene setup
    view3D.scene = new THREE.Scene();
    view3D.scene.background = new THREE.Color(0x0a0e27);
    view3D.scene.fog = new THREE.Fog(0x0a0e27, 50, 200);
    
    // Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    view3D.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    view3D.camera.position.set(cols * 1.5, rows * 2, cols * 1.5);
    view3D.camera.lookAt(cols / 2, 0, rows / 2);
    
    // Renderer setup
    view3D.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    view3D.renderer.setSize(container.clientWidth, container.clientHeight);
    view3D.renderer.shadowMap.enabled = true;
    view3D.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(view3D.renderer.domElement);
    
    // Orbit controls (manual implementation since we don't have OrbitControls)
    setupManualControls();
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    view3D.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(cols / 2, rows * 3, cols / 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    view3D.scene.add(directionalLight);
    
    // Point lights for dramatic effect
    const pointLight1 = new THREE.PointLight(0x667eea, 2, 50);
    pointLight1.position.set(0, 10, 0);
    view3D.scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x764ba2, 2, 50);
    pointLight2.position.set(cols, 10, rows);
    view3D.scene.add(pointLight2);
    
    // Build 3D representation
    build3DBuilding();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

// Build 3D building from grid
function build3DBuilding() {
    if (view3D.building) {
        view3D.scene.remove(view3D.building);
    }
    
    view3D.building = new THREE.Group();
    view3D.fires3D = [];
    view3D.particles = [];
    
    const wallHeight = 3;
    const cellScale = 2;
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(cols * cellScale, rows * cellScale);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a2e,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cols * cellScale / 2, 0, rows * cellScale / 2);
    ground.receiveShadow = true;
    view3D.building.add(ground);
    
    // Build cells
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = grid[row][col];
            const x = col * cellScale + cellScale / 2;
            const z = row * cellScale + cellScale / 2;
            
            // Walls
            if (cell === 1) {
                const wallGeometry = new THREE.BoxGeometry(cellScale * 0.9, wallHeight, cellScale * 0.9);
                const wallMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x2d3561,
                    roughness: 0.7,
                    metalness: 0.3
                });
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                wall.position.set(x, wallHeight / 2, z);
                wall.castShadow = true;
                wall.receiveShadow = true;
                view3D.building.add(wall);
            }
            
            // Fire
            else if (cell === 2) {
                createFireEffect(x, z, row, col);
            }
            
            // Exits - green glowing platforms
            else if (cell === 3) {
                const exitGeometry = new THREE.BoxGeometry(cellScale * 0.8, 0.3, cellScale * 0.8);
                const exitMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x00ff88,
                    emissive: 0x00ff88,
                    emissiveIntensity: 0.5,
                    roughness: 0.3,
                    metalness: 0.7
                });
                const exit = new THREE.Mesh(exitGeometry, exitMaterial);
                exit.position.set(x, 0.15, z);
                view3D.building.add(exit);
                
                // Exit glow light
                const exitLight = new THREE.PointLight(0x00ff88, 2, 10);
                exitLight.position.set(x, 1, z);
                view3D.building.add(exitLight);
            }
            
            // Start - blue glowing platform
            else if (cell === 4) {
                const startGeometry = new THREE.BoxGeometry(cellScale * 0.8, 0.3, cellScale * 0.8);
                const startMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x4fc3f7,
                    emissive: 0x4fc3f7,
                    emissiveIntensity: 0.5,
                    roughness: 0.3,
                    metalness: 0.7
                });
                const start = new THREE.Mesh(startGeometry, startMaterial);
                start.position.set(x, 0.15, z);
                view3D.building.add(start);
            }
        }
    }
    
    // Add path if exists
    if (escapePath && escapePath.length > 0) {
        create3DPath(escapePath);
    }
    
    view3D.scene.add(view3D.building);
    
    // Create 3D agents
    update3DAgents();
}

// Create fire effect with particles
function createFireEffect(x, z, row, col) {
    const intensity = firePhysics.fireIntensity[row * cols + col] || 5;
    
    // Fire base
    const fireGeometry = new THREE.CylinderGeometry(0.5, 0.8, 2, 6);
    const fireMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff4400,
        emissive: 0xff4400,
        emissiveIntensity: intensity / 10,
        transparent: true,
        opacity: 0.8
    });
    const fire = new THREE.Mesh(fireGeometry, fireMaterial);
    fire.position.set(x, 1, z);
    view3D.building.add(fire);
    
    // Fire light
    const fireLight = new THREE.PointLight(0xff4400, intensity / 2, 15);
    fireLight.position.set(x, 2, z);
    view3D.building.add(fireLight);
    
    // Store for animation
    view3D.fires3D.push({ mesh: fire, light: fireLight, baseY: 1, time: Math.random() * Math.PI * 2 });
}

// Create 3D path visualization
function create3DPath(path) {
    const cellScale = 2;
    const points = [];
    
    path.forEach(([row, col]) => {
        points.push(new THREE.Vector3(
            col * cellScale + cellScale / 2,
            0.5,
            row * cellScale + cellScale / 2
        ));
    });
    
    if (points.length < 2) return;
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, points.length * 2, 0.2, 8, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00bcd4,
        emissive: 0x00bcd4,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.7
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    view3D.building.add(tube);
}

// Update 3D agents
function update3DAgents() {
    // Remove old agents
    view3D.agents3D.forEach(agent3D => {
        view3D.building.remove(agent3D.mesh);
    });
    view3D.agents3D = [];
    
    const cellScale = 2;
    
    agents.forEach(agent => {
        // Agent body - create capsule-like shape with cylinder + sphere
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
        const headGeometry = new THREE.SphereGeometry(0.35, 8, 8);
        
        let color = 0x4fc3f7;
        
        // Color based on agent type
        if (agent.type === 'elderly') color = 0xffb74d;
        else if (agent.type === 'disabled') color = 0xf06292;
        else if (agent.type === 'child') color = 0xaed581;
        
        const material = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.6,
            metalness: 0.2
        });
        
        // Create agent group
        const agentGroup = new THREE.Group();
        
        const body = new THREE.Mesh(bodyGeometry, material);
        body.position.y = 0.5;
        agentGroup.add(body);
        
        const head = new THREE.Mesh(headGeometry, material);
        head.position.y = 1.2;
        agentGroup.add(head);
        
        agentGroup.position.set(
            agent.x * cellScale / cellSize,
            0,
            agent.y * cellScale / cellSize
        );
        agentGroup.castShadow = true;
        
        // Add panic glow if panicked
        if (agent.panicLevel > 50) {
            const glowLight = new THREE.PointLight(0xff0000, agent.panicLevel / 50, 3);
            glowLight.position.copy(agentGroup.position);
            glowLight.position.y += 1.5;
            view3D.building.add(glowLight);
            view3D.agents3D.push({ mesh: agentGroup, light: glowLight, agent: agent });
        } else {
            view3D.building.add(agentGroup);
            view3D.agents3D.push({ mesh: agentGroup, agent: agent });
        }
    });
}

// Animation loop for 3D view
function animate3D() {
    if (!view3D.enabled) return;
    
    view3D.animationId = requestAnimationFrame(animate3D);
    
    const time = Date.now() * 0.001;
    
    // Animate fires
    view3D.fires3D.forEach(fire => {
        fire.mesh.position.y = fire.baseY + Math.sin(time * 2 + fire.time) * 0.2;
        fire.mesh.rotation.y += 0.02;
        fire.light.intensity = 2 + Math.sin(time * 3 + fire.time) * 0.5;
    });
    
    // Update agents
    if (simulationRunning) {
        update3DAgents();
    }
    
    // Render
    view3D.renderer.render(view3D.scene, view3D.camera);
}

// Manual camera controls
function setupManualControls() {
    const container = document.getElementById('renderer3d');
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraDistance = Math.sqrt(
        Math.pow(view3D.camera.position.x - cols, 2) +
        Math.pow(view3D.camera.position.y, 2) +
        Math.pow(view3D.camera.position.z - rows, 2)
    );
    let theta = Math.atan2(view3D.camera.position.z - rows / 2, view3D.camera.position.x - cols / 2);
    let phi = Math.acos((view3D.camera.position.y) / cameraDistance);
    
    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        
        theta -= deltaX * 0.01;
        phi -= deltaY * 0.01;
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
        
        view3D.camera.position.x = cols / 2 + cameraDistance * Math.sin(phi) * Math.cos(theta);
        view3D.camera.position.y = cameraDistance * Math.cos(phi);
        view3D.camera.position.z = rows / 2 + cameraDistance * Math.sin(phi) * Math.sin(theta);
        view3D.camera.lookAt(cols / 2, 0, rows / 2);
        
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    container.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        cameraDistance += e.deltaY * 0.01;
        cameraDistance = Math.max(10, Math.min(200, cameraDistance));
        
        view3D.camera.position.x = cols / 2 + cameraDistance * Math.sin(phi) * Math.cos(theta);
        view3D.camera.position.y = cameraDistance * Math.cos(phi);
        view3D.camera.position.z = rows / 2 + cameraDistance * Math.sin(phi) * Math.sin(theta);
    });
}

// Handle window resize
function onWindowResize() {
    if (!view3D.camera || !view3D.renderer) return;
    
    const container = document.getElementById('renderer3d');
    view3D.camera.aspect = container.clientWidth / container.clientHeight;
    view3D.camera.updateProjectionMatrix();
    view3D.renderer.setSize(container.clientWidth, container.clientHeight);
}

// Hook into grid creation to rebuild 3D view
window.addEventListener('load', function() {
    // Store original createGrid function
    if (typeof window.createGrid !== 'undefined') {
        const originalCreateGrid = window.createGrid;
        window.createGrid = function() {
            originalCreateGrid();
            if (view3D.enabled) {
                build3DBuilding();
            }
        };
    }
});
