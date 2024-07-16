
let canvas = document.getElementById("svg-canvas");
let maze = {rows: 30, cols: 30}; // placeholder, to be initialized through API

//colors
const gridColor = "#000";
const pathColor = "#00d";
const solveColor = "#f00";
const goalColor = "#0f0";
const bgColor = "#fff";

const APIURL = 'http://127.0.0.1:5000';

function initDisplay(gridSize = 30, maze) {
    // clear the previous display
    allElements = document.querySelector('.maze-elt');
    if (allElements) {
        allElements.foreach(elt => elt.remove());
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

function makeDisplayGrid(gridSize = 100) {

    for (let x = 0 ; x <= canvas.getAttribute('width') ; x += gridSize) {
        addLine(x, 0, x, canvas.getAttribute('height'), 10, gridColor, 'maze-elt');
    }
    for (let y = 0; y <= canvas.getAttribute('height'); y += gridSize) {
        addLine(0, y, canvas.getAttribute('width'), y, 10, gridColor, 'maze-elt');
    }
}

function makeMazeDisplay() {

}

// display coordinates for the center of a cell
function displayCenterLoc() {
    let centerDelta = this.maze.gridSize / 2;
    let result = [this.x * this.maze.gridSize + centerDelta, this.y * this.maze.gridSize + centerDelta];
    return result;
}

// mark the goal cell in green
function markGoal(goalColor = this.maze.goalColor) {
    this.goal = true;
    this.maze.ctx.fillStyle = goalColor;
    this.maze.ctx.fillRect(this.x * this.maze.gridSize + 5,
        this.y * this.maze.gridSize + 5,
        this.maze.gridSize - 10,
        this.maze.gridSize - 10);
}

// change the color of grid segments crossed
// update legal moves
function markCrossing(fromCell, bgColor = this.maze.bgColor, pathColor = this.maze.Pathcolor) {

    // mark the grid crossing
    this.maze.ctx.beginPath();
    this.maze.ctx.strokeStyle = bgColor;
    this.maze.ctx.lineWidth = 10;

    if (this.x < fromCell.x) {
        this.maze.ctx.moveTo(fromCell.x * this.maze.gridSize, fromCell.y * this.maze.gridSize + 5);
        this.maze.ctx.lineTo(fromCell.x * this.maze.gridSize, (fromCell.y + 1) * this.maze.gridSize - 5);
        fromCell.legal.w = true;
        this.legal.e = true;
    }
    else if (this.x > fromCell.x) {
        this.maze.ctx.moveTo(this.x * this.maze.gridSize, this.y * this.maze.gridSize + 5);
        this.maze.ctx.lineTo(this.x * this.maze.gridSize, (this.y + 1) * this.maze.gridSize - 5);
        fromCell.legal.e = true;
        this.legal.w = true;
    }
    else if (this.y < fromCell.y) {
        this.maze.ctx.moveTo(fromCell.x * this.maze.gridSize + 5, fromCell.y * this.maze.gridSize);
        this.maze.ctx.lineTo((fromCell.x + 1) * this.maze.gridSize - 5, fromCell.y * this.maze.gridSize);
        fromCell.legal.n = true;
        this.legal.s = true;
    }
    else if (this.y > fromCell.y) {
        this.maze.ctx.moveTo(this.x * this.maze.gridSize + 5, this.y * this.maze.gridSize);
        this.maze.ctx.lineTo((this.x + 1) * this.maze.gridSize - 5, this.y * this.maze.gridSize);
        fromCell.legal.s = true;
        this.legal.n = true;
    }
    this.maze.ctx.stroke();
    this.maze.ctx.closePath();

    // mark the path
    this.markPath(fromCell, pathColor);

}

function markPath(fromCell, pathColor = this.maze.pathColor) {
    this.maze.ctx.beginPath();
    this.maze.ctx.strokeStyle = pathColor;
    this.maze.ctx.lineWidth = 5;
    this.maze.ctx.moveTo(...fromCell.displayCenterLoc());
    this.maze.ctx.lineTo(...this.displayCenterLoc());
    this.maze.ctx.stroke();
    this.maze.ctx.closePath();
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
    const cellInfo = maze.cellMatrix.flat().map((cell) =>
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
    let gridSize = Number(event.target.gridSize.value);

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
        console.log('Successfull created.', data);
        maze = data;
        makeMazeDisplay();
    })
    .catch(error => {
        console.error('Error:', error);
    });

    settingsForm.reset();
    settingsFormDefaults(columns, rows, gridSize);
    updateDownloadLink();
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

initDisplay(30, maze);
makeDisplayGrid(30);
