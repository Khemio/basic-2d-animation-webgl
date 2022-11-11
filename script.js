let gl = null;
let glCanvas = null;
let bgColorBtn = null;
let sqColorBtn = null;

// Aspect ratio and coordinate system details

let bgColor = getRandomColor();
let sqColor = getRandomColor();
// let cutoutSize = [60, 60];
// let cutoutPosition = [0, 0];
let velocity = 3.0;
let timer = 0;
let rainingRect;
let scoreDisplay;
let missesDisplay;
let score = 0;
let misses = 0;

const mask = [true, true, true];
let aspectRatio;
let currentAngle;
let currentRotation = [0, 1];
let currentScale = [1.0, 1.0];

// Vertex information

let vertexArray;
let vertexBuffer;
let vertexNumComponents;
let vertexCount;

// Rendering data shared with the scalers.

let uScalingFactor;
let uGlobalColor;
let uRotationVector;
let aVertexPosition;

// Animation timing

let previousTime = 0.0;
let degreesPerSecond = 90.0;

window.addEventListener('load', startup, false);

function startup() {
    glCanvas = document.getElementById('glcanvas');
    gl = glCanvas.getContext('webgl2');
    glCanvas.addEventListener('click', playerClick, false);

    gl.enable(gl.SCISSOR_TEST);

    let displays = document.querySelectorAll("strong");
    scoreDisplay = displays[0];
    missesDisplay = displays[1];

    const redtoggle = document.querySelector("#red-toggle");
    const greentoggle = document.querySelector("#green-toggle");
    const bluetoggle = document.querySelector("#blue-toggle");
    redtoggle.addEventListener("click", setColorMask, false);
    greentoggle.addEventListener("click", setColorMask, false);
    bluetoggle.addEventListener("click", setColorMask, false);

    rainingRect = new Rectangle();

    function setColorMask(evt) {
        const index =
            evt.target === greentoggle && 1
            || evt.target === bluetoggle && 2
            || 0;
        mask[index] = !mask[index];
        if (mask[index] === true)
            evt.target.textContent ="On";
        else
            evt.target.textContent ="Off";
        gl.colorMask(mask[0], mask[1], mask[2], true);
    }

    const shaderSet = [
        {
            type: gl.VERTEX_SHADER,
            id: 'vertex-shader'
        },
        {
            type: gl.FRAGMENT_SHADER,
            id: 'fragment-shader'
        }
    ];

    shaderProgram = buildShaderProgram(shaderSet);

    aspectRatio = glCanvas.width / glCanvas.height;
    currentRotation = [0, 1];
    currentScale = [1.0, aspectRatio];

    vertexArray = new Float32Array([
        -0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
        -0.5, 0.5, 0.5, -0.5, -0.5, -0.5
    ]);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

    vertexNumComponents = 2;
    vertexCount = vertexArray.length/vertexNumComponents;

    currentAngle = 0.0;

    animateScene();
}

// Random color helper function.
function getRandomColor() {
    return [Math.random(), Math.random(), Math.random()];
}

function buildShaderProgram(shaderInfo) {
    let program = gl.createProgram();

    shaderInfo.forEach(desc => {
        let shader = compileShader(desc.id, desc.type);

        if (shader) {
        gl.attachShader(program, shader);
        }
    });

    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log("Error linking shader program:");
    console.log(gl.getProgramInfoLog(program));
    }

    return program;
}

function compileShader(id, type) {
    let code = document.getElementById(id).firstChild.nodeValue;
    let shader = gl.createShader(type);

    gl.shaderSource(shader, code);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(`Error compiling ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader:`);
        console.log(gl.getShaderInfoLog(shader));
    }
    return shader;
}

// Click handler for rain
function playerClick (evt) {
    // We need to transform the position of the click event from
    // window coordinates to relative position inside the canvas.
    // In addition we need to remember that vertical position in
    // WebGL increases from bottom to top, unlike in the browser
    // window.
    const position = [
        evt.pageX - evt.target.offsetLeft,
        gl.drawingBufferHeight - (evt.pageY - evt.target.offsetTop),
    ];
    // if the click falls inside the rectangle, we caught it.
    // Increment score and create a new rectangle.
    const diffPos = [ position[0] - rainingRect.position[0],
        position[1] - rainingRect.position[1] ];
    if ( diffPos[0] >= 0 && diffPos[0] < rainingRect.size[0]
        && diffPos[1] >= 0 && diffPos[1] < rainingRect.size[1] ) {
        score += 1;
        scoreDisplay.textContent = score;
        rainingRect = new Rectangle();
    }
}

// Click handler for spin
function playerClick(evt) {
    const clickXRelativeToCanvas =
        evt.pageX - evt.target.offsetLeft;
    const x =
          2.0 * (clickXRelativeToCanvas- gl.drawingBufferWidth/2)
        / gl.drawingBufferWidth;
    const clickYRelativeToCanvas =
        evt.pageY - evt.target.offsetTop;
    const y =
          -2.0 * (clickYRelativeToCanvas- gl.drawingBufferHeight/2)
        / gl.drawingBufferHeight;
    console.log(x, y)

    vertexArray = new Float32Array([
        x, y, x+0.3, y, x+0.3, y-0.3,
        x, y, x, y-0.3, x+0.3, y-0.3
    ]);
    // vertexArray = new Float32Array([
    //     0.1, -0.1, 0.4, -0.1, 0.4, -0.4,
    //     0.1, -0.1, 0.1, -0.4, 0.4, -0.4
    // ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
    // gl.drawArrays(gl.POINTS, 0, 1);
    
}

function Rectangle () {
    // Keeping a reference to the new Rectangle object, rather
    // than using the confusing this keyword.
    const rect = this;
    // We get three random numbers and use them for new rectangle
    // size and position. For each we use a different number,
    // because we want horizontal size, vertical size and
    // position to be determined independently.
    const randNums = getRandomVector();
    rect.size = [
      5 + 120 * randNums[0],
      5 + 120 * randNums[1]
    ];
    rect.position = [
        randNums[2]*(gl.drawingBufferWidth - rect.size[0]),
        gl.drawingBufferHeight
    ];
    rect.velocity = 1.0 + 6.0*Math.random();
    rect.color = getRandomVector();
    gl.clearColor(rect.color[0], rect.color[1], rect.color[2], 1.0);
    function getRandomVector() {
        return [Math.random(), Math.random(), Math.random()];
    }
}

function animateScene() {
    if(timer === 30) {
        timer = 0;
        bgColor = getRandomColor();
        sqColor = getRandomColor();
    }

    timer++;

    gl.viewport(0, 0, glCanvas.width, glCanvas.height);

    // Recct rain
    // gl.scissor(rainingRect.position[0], rainingRect.position[1],
    //     rainingRect.size[0] , rainingRect.size[1]);

    // rainingRect.position[1] -= rainingRect.velocity;
    // if (rainingRect.position[1] < 0) {
    //     misses += 1;
    //     missesDisplay.textContent = misses;
    //     rainingRect = new Rectangle();
    // }
    
    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    let radians = currentAngle * Math.PI / 180.0;
    currentRotation[0] = Math.sin(radians);
    currentRotation[1] = Math.cos(radians);

    gl.useProgram(shaderProgram);

    uScalingFactor =
        gl.getUniformLocation(shaderProgram, "uScalingFactor");
    uGlobalColor =
        gl.getUniformLocation(shaderProgram, "uGlobalColor");
    uRotationVector =
        gl.getUniformLocation(shaderProgram, "uRotationVector");

    gl.uniform2fv(uScalingFactor, currentScale);
    gl.uniform2fv(uRotationVector, currentRotation);
    gl.uniform4fv(uGlobalColor, [sqColor[0], sqColor[1], sqColor[2], 1.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");

    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, vertexNumComponents, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

    window.requestAnimationFrame(currentTime => {
        let deltaAngle = ((currentTime - previousTime) / 1000.0)
            * degreesPerSecond;

        currentAngle = (currentAngle + deltaAngle) % 360;

        previousTime = currentTime;
        animateScene();
    });
}
