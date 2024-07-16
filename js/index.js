
let canvas = document.getElementById("svg-canvas");
let maze = {rows: 30, cols: 30}; // placeholder, to be initialized through API
let gridSize = 25;

//colors
const gridColor = "#000";
const pathColor = "#00d";
const solveColor = "#f00";
const goalColor = "#0f0";
const bgColor = "#fff";

const APIURL = 'http://127.0.0.1:5000';

function initDisplay(gridSize, maze) {
    // clear the previous display
    allElements = Array.from(document.getElementsByClassName('maze-elt'));
    if (allElements) {
        allElements.forEach(elt => elt.remove());
    }

    // size the canvas
    canvas.setAttribute('width', gridSize * maze.rows);
    canvas.setAttribute('height', gridSize * maze.cols);
}

function addLine(x1, y1, x2, y2, width, color, cssClass) {
    let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);

    line.setAttribute('y2', y2);
    line.setAttribute('stroke-width', width);
    line.setAttribute('stroke', color);
    line.setAttribute('class', cssClass);
    canvas.appendChild(line);
}

function addRect(x, y, width, height, strokeWidth, strokeColor, fillColor, cssClass) {
    let rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);

    rect.setAttribute('height', height);
    rect.setAttribute('stroke-width', strokeWidth);
    rect.setAttribute('stroke', strokeColor);
    rect.setAttribute('fill', fillColor);
    rect.setAttribute('class', cssClass);
    canvas.appendChild(rect);
}

function makeDisplayGrid(gridSize = 100) {

    for (let x = 0 ; x <= canvas.getAttribute('width') ; x += gridSize) {
        addLine(x, 0, x, canvas.getAttribute('height'), 10, gridColor, 'maze-elt');
    }
    for (let y = 0; y <= canvas.getAttribute('height'); y += gridSize) {
        addLine(0, y, canvas.getAttribute('width'), y, 10, gridColor, 'maze-elt');
    }
}

// display the generated maze after it is created
function makeMazeDisplay() {
    for (let path of maze.paths) {
        for (let i = 0 ; i < path.length - 1 ; i++) {
            markCrossing(path[i], path[i + 1]);
        }
    }
    markGoal(maze.cols - 1, maze.rows - 1);
}

// display coordinates for the center of a cell
function displayCenterLoc(cellX, cellY) {
    let centerDelta = gridSize / 2;
    let result = [cellX * gridSize + centerDelta, cellY * gridSize + centerDelta];
    return result;
}

// mark the goal cell in green
function markGoal(cellX, cellY) {
    maze.cell_matrix[cellY][cellX].goal = true;
    addRect(cellX * gridSize + 5, cellY * gridSize + 5, gridSize - 10, gridSize - 10, 10, goalColor, goalColor, 'maze-elt');
}

// change the color of grid segments crossed
// fromCell and toCell are [x, y] cell pairs
function markCrossing(fromCell, toCell) {

    // mark the grid crossing
    lineWidth = 10;
    if (toCell[0] < fromCell[0]) {
        addLine(fromCell[0] * gridSize, fromCell[1] * gridSize + 5, fromCell[0] * gridSize, (fromCell[1] + 1) * gridSize - 5, lineWidth, bgColor, 'maze-elt');
    }
    else if (toCell[0] > fromCell[0]) {
        addLine(toCell[0] * gridSize, toCell[1] * gridSize + 5, toCell[0] * gridSize, (toCell[1] + 1) * gridSize - 5, lineWidth, bgColor, 'maze-elt');
    }
    else if (toCell[1] < fromCell[1]) {
        addLine(fromCell[0] * gridSize + 5, fromCell[1] * gridSize, (fromCell[0] + 1) * gridSize - 5, fromCell[1] * gridSize, lineWidth, bgColor, 'maze-elt');
    }
    else if (toCell[1] > fromCell[1]) {
        addLine(toCell[0] * gridSize + 5, toCell[1] * gridSize, (toCell[0] + 1) * gridSize - 5, toCell[1] * gridSize, lineWidth, bgColor, 'maze-elt');
    }

    // mark the path
    this.markPath(fromCell, toCell);
}

// fromCell and toCell are [x, y] cell pairs
function markPath(fromCell, toCell) {
    addLine(...displayCenterLoc(...fromCell), ...displayCenterLoc(...toCell), 5, pathColor, 'maze-elt');
}

class RLHyperP {
    constructor(epsilon = 0.3,
        epsilon_decay = 0.99,
        min_epsilon = 0.1,
        alpha = 0.5,
        gamma = 0.9,
        rIllegal = -0.75,
        rLegal = -0.1,
        rGoal = 10,
        hiddenSize = 64) {
        this.epsilon = epsilon;
        this.epsilon_decay = epsilon_decay;
        this.min_epsilon = min_epsilon;
        this.alpha = alpha;
        this.gamma = gamma;
        this.rIllegal = rIllegal;
        this.rLegal = rLegal;
        this.rGoal = rGoal;
        this.hiddenSize = hiddenSize;
    }
}

let settingsForm = document.querySelector("[name='settings']");
let hpForm = document.querySelector("[name='hyperparameters']")
let trainForm = document.querySelector("[name='train']");
let solveForm = document.querySelector("[name='solve']");
const solutionCompleteBanner = document.getElementById('solution-complete');
solutionCompleteBanner.hidden = true;
const solutionCompleteSteps = document.getElementById('solution-steps');
const solutionTimeoutBanner = document.getElementById('solution-timeout');
solutionTimeoutBanner.hidden = true;
const trainingBanner = document.getElementById('training-banner');
const trainingPasses = document.getElementById('training-passes');
trainingBanner.hidden = true;
const downloadContainer = document.getElementById('download-container');
let totalTrainingPasses = 0;
const rlHP = new RLHyperP(); // to be filled with form and included in download

// reset form with defaults
function settingsFormDefaults(cols = 30, rows = 30, grid = 25) {
    settingsForm.columns.value = cols; 
    settingsForm.rows.value = rows; 
    settingsForm.gridSize.value = grid; 
}

function hpFormDefaults(rlHP) {
    hpForm.epsilon.value = rlHP.epsilon;
    hpForm.epsilon_decay.value = rlHP.epsilon_decay;
    hpForm.min_epsilon.value = rlHP.min_epsilon;
    hpForm.alpha.value = rlHP.alpha;
    hpForm.gamma.value = rlHP.gamma;
    hpForm.rIllegal.value = rlHP.rIllegal;
    hpForm.rLegal.value = rlHP.rLegal;
    hpForm.rGoal.value = rlHP.rGoal;
    hpForm.hiddenSize.value = rlHP.hiddenSize;
}

function trainFormDefault(passes = 2000) {
    trainForm.passes.value = passes;
}

function solveFormDefaults(startx = 0, starty = 0, limit = 1000) {
    solveForm.startx.value = startx; 
    solveForm.starty.value = starty; 
    solveForm.limit.value = limit; 
}

function hideButtons() {
    buttons = document.getElementsByClassName('submit-button');
    for (let element of buttons) {
        element.hidden = true;
    };
}

function showButtons() {
    buttons = document.getElementsByClassName('submit-button');
    for (let element of buttons) {
        element.hidden = false;
    };
}

let oldUrl = null;
function updateDownloadLink() {
    downloadLink = document.getElementById('download-link');
    if (downloadLink !== null) {
        // Revoke the old object URL
        if (oldUrl !== null) {
            URL.revokeObjectURL(oldUrl);
            oldUrl = null;
            console.log("revoked old URL");
        }
        downloadContainer.removeChild(downloadLink);
    }
    downloadContainer.appendChild(makeDownloadMazeLink());
}

// Create a link to download the current state of the maze as JSON
function makeDownloadMazeLink() {
    // get relevant maze data for download
    // legal moves, x, y, q, goal
    const cellInfo = maze.cell_matrix.flat().map((cell) =>
        { return {x: cell.x, y: cell.y, q: cell.q, legal: cell.legal, goal: cell.goal}; });
    const config = { cell_info: cellInfo, rlhp: rlHP};
    let blob = new Blob([JSON.stringify(config)], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    // Store the new URL so it can be revoked later
    oldUrl = url;
    const a = document.createElement('a');
    a.href = url;
    a.innerText = "Download maze details";
    a.download = 'maze.json';
    a.setAttribute('id', 'download-link');
    return a;
}

if (window.innerWidth < 900) {
    settingsFormDefaults(10, 10);
}
else {
    settingsFormDefaults();
}
hpFormDefaults(rlHP);
trainFormDefault();
solveFormDefaults();

settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();

    solutionCompleteBanner.hidden = true;
    solutionCompleteBanner.hidden = true;
    trainingBanner.hidden = true;
    totalTrainingPasses = 0;

    let rows = Number(event.target.rows.value);
    let columns = Number(event.target.columns.value);
    gridSize = Number(event.target.gridSize.value); // it's global

    //console.log('Rows:', rows);
    //console.log('Columns:', columns);
    //console.log('Grid Size:', gridSize);

    // send a POST to generate the maze in the server
    // update the display with the returned data
    createURL = APIURL + '/create';
    initData = {rows: rows, cols: columns};
    fetch(createURL, { method: 'POST',
                       headers: {'Content-Type': 'application/json'},
                       body: JSON.stringify(initData)})
    .then(response => response.json())
    .then(data => {
        console.log('Successfully created.', data);
        maze = data;
        initDisplay(gridSize, maze);
        makeDisplayGrid(gridSize);
        makeMazeDisplay();
        updateDownloadLink();
    })
    .catch(error => {
        console.error('Error:', error);
    });

    settingsForm.reset();
    settingsFormDefaults(columns, rows, gridSize);
});

hpForm.addEventListener('submit', (event) => {
    event.preventDefault();

    rlHP.epsilon = Number(event.target.epsilon.value);
    rlHP.epsilon_decay = Number(event.target.epsilon_decay.value);
    rlHP.min_epsilon = Number(event.target.min_epsilon.value);
    rlHP.alpha = Number(event.target.alpha.value);
    rlHP.gamma = Number(event.target.gamma.value);
    rlHP.rIllegal = Number(event.target.rIllegal.value);
    rlHP.rLegal = Number(event.target.rLegal.value);
    rlHP.rGoal = Number(event.target.rGoal.value);
    rlHP.hiddenSize = Number(event.target.hiddenSize.value);

    hpForm.reset();
    hpFormDefaults(rlHP);
    if (maze) {
        updateDownloadLink();
    }
});

trainForm.addEventListener('submit', (event) => {
    event.preventDefault();

    let passes = Number(event.target.passes.value);
    console.log("passes: ", passes);

    if (!maze) {
        console.error("Error: maze not defined");
    }
    else {
        hideButtons();
        maze.RLTrain(passes).then(() => {
            console.log("training complete")
            showButtons();
            totalTrainingPasses += passes;
            trainingPasses.innerText = totalTrainingPasses;
            trainingBanner.hidden = false;
            updateDownloadLink();
        }); // runs async
        console.log("training started");
    }
    trainForm.reset();
    trainFormDefault(passes);
});


solveForm.addEventListener('submit', (event) => {
    event.preventDefault();
    let startx = Number(event.target.startx.value);
    let starty = Number(event.target.starty.value);
    let limit = Number(event.target.limit.value);

    console.log('startx:', startx);
    console.log('starty:', starty);
    console.log('limit:', limit);

    if (!maze) {
        console.error("Error: maze not defined");
    }
    else {
        solutionCompleteBanner.hidden = true;
        solutionTimeoutBanner.hidden = true;

        let steps = maze.solveFrom(startx, starty, limit);
        console.log("Done solving!");
        if (steps === limit) {
            solutionTimeoutBanner.hidden = false;
        }
        else {
            solutionCompleteSteps.innerText = steps;
            solutionCompleteBanner.hidden = false;
        }
    }
    solveForm.reset();
    solveFormDefaults(startx, starty, limit);
});


