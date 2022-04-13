import './App.css';
import { useEffect, useRef, useState, useLayoutEffect } from 'react';

const mapWidth = 20;
const mapHeight = 30;
const gridRatio = 0.01;
const maxPanToSelect = 10.0;
const frameRate = 30;
const colorNum = 5;
const selectionOverlaySize = 0.05;

//and use window.innerWidth + window.innerHeight

var pixelColor = Array(mapWidth).fill(0).map(x => Array(mapHeight).fill(0)); //[x,y] 0=white, 1=blue
var selectedPixel = {x:-1,y:-1};
var hoveringColor = -1;

var zoom = 1.0;
const minZoom = 0.2;
const maxZoom = 3.0;
const zoomInterval = 1.1;

var isClicked = false;
var pannedDistance = 0.0;
var panBound = {minX: -1.0, maxX: 1.0, minY: -1.0, maxY: 1.0}

var previousMousePos = {x:0, y:0};
var centerOffset = {x:0, y:0};
var windowDim = {x:0, y:0};

function App() {
 
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  const update = () => {
    if(windowDim.x !== window.innerWidth || windowDim.y !== window.innerHeight)
      resizeWindow();
  }

  const resizeWindow = () => {
    const canvas = canvasRef.current;

    canvas.width = window.innerWidth;
    windowDim.x = canvas.width;
    canvas.height = window.innerHeight;
    windowDim.y = canvas.height;

    const context = canvasRef.current.getContext("2d");
    context.scale(1, 1);
    contextRef.current = context;

    renderCanvas();
  }

  useEffect(() => {
    resizeWindow();
    const interval = setInterval(() => {
      update();
    }, 1000/frameRate);
    return () => clearInterval(interval);
  }, [])

  const renderCanvas = () => {
    contextRef.current.fillStyle = "#666666";
    contextRef.current.fillRect(0,0, windowDim.x, windowDim.y);

    const {screenHeight, screenWidth} = getScreenDimentions();
    
    const pixelSize = 1.0*zoom*screenHeight / mapHeight;

    for(var i = 0; i < pixelColor.length; ++i){

      const pixelX = 1.0*screenWidth * zoom * i / mapWidth + (windowDim.x - screenWidth)/2 + centerOffset.x;

      if(pixelX > windowDim.x || pixelX+pixelSize < 0) continue;

      for(var j = 0; j < pixelColor[i].length; ++j){
        const pixelY = 1.0*screenHeight * zoom * j / mapHeight + (windowDim.y - screenHeight)/2 + centerOffset.y;

        if(pixelY > windowDim.y || pixelY+pixelSize < 0) continue;
        
        contextRef.current.fillStyle = pickColor(pixelColor[i][j]);
        contextRef.current.fillRect(pixelX + gridRatio*pixelSize, pixelY + gridRatio*pixelSize, (1-2*gridRatio)*pixelSize, (1-2*gridRatio)*pixelSize);

        // console.log("filled pixel at x = " + i + ", y = " + j);
      }
    }

    if(selectedPixel.x < 0 || selectedPixel.y < 0 ) return;

    const selectedX = 1.0*screenWidth * zoom * selectedPixel.x / mapWidth + (windowDim.x - screenWidth)/2 + centerOffset.x;
    const selectedY = 1.0*screenHeight * zoom * selectedPixel.y / mapHeight + (windowDim.y - screenHeight)/2 + centerOffset.y;

    if(selectedX > windowDim.x || selectedX+pixelSize < 0 || selectedY > windowDim.y || selectedY+pixelSize < 0) return;

    contextRef.current.fillStyle = "#e8b61e";
    contextRef.current.fillRect(selectedX - selectionOverlaySize*pixelSize, selectedY - selectionOverlaySize*pixelSize, (1+2*selectionOverlaySize)*pixelSize, (1+2*selectionOverlaySize)*pixelSize);

    if(hoveringColor < 0){
      contextRef.current.fillStyle = pickColor(pixelColor[selectedPixel.x][selectedPixel.y]);
    }else{
      contextRef.current.fillStyle = pickColor(hoveringColor);
    }
    
    contextRef.current.fillRect(selectedX + selectionOverlaySize*pixelSize, selectedY + selectionOverlaySize*pixelSize, (1-2*selectionOverlaySize)*pixelSize, (1-2*selectionOverlaySize)*pixelSize);

    //contextRef.current.
  }

  const getScreenDimentions = () => {
    var screenHeight, screenWidth;
    if((1.0*windowDim.x/windowDim.y) > (1.0*mapWidth/mapHeight)){
      screenHeight = windowDim.y;
      screenWidth = 1.0*windowDim.y/mapHeight * mapWidth;
    }else{
      screenHeight = 1.0*windowDim.x/mapWidth * mapHeight;
      screenWidth = windowDim.x;
    }
    return {screenHeight, screenWidth};
  }

  const pickColor = (index) => {
    switch(index){
      case 0: return "white";
      case 1: return "blue";
      case 2: return "red";
      case 3: return "black";
      case 4: return "pink";
      default: return "black";
    }
  }

  const selectPixel = (x, y, color) => {
    const {screenHeight, screenWidth} = getScreenDimentions();
    const pixelX = Math.floor(1.0*mapWidth/(screenWidth * zoom) * (x - centerOffset.x - (1.0*windowDim.x-screenWidth)/2));
    const pixelY = Math.floor(1.0*mapHeight/(screenHeight * zoom) * (y - centerOffset.y - (1.0*windowDim.y-screenHeight)/2));

    if(pixelX < 0 || pixelX >= mapWidth || pixelY < 0 || pixelY >= mapHeight){
      console.log("pixel out of bound");
      selectedPixel.x = -1;
      selectedPixel.y = -1;
      showHideColorMenu(false);
    }else{
      console.log("selected pixel (" + pixelX + ", " + pixelY + ")");
      // pixelColor[pixelX][pixelY] = color;
      selectedPixel.x = pixelX;
      selectedPixel.y = pixelY;
      showHideColorMenu(true);
    }

    renderCanvas();
  }

  const placePixel = (color) => {
    pixelColor[selectedPixel.x][selectedPixel.y] = color;
    selectedPixel.x = -1;
    selectedPixel.y = -1;
    showHideColorMenu(false);
    setHoveringColor(-1);
  }

  const showHideColorMenu = (show) => {

    // disgusting, please change that later to show/hide colorPicking menu
    if(show){
      document.documentElement.style.setProperty('--showColorMenu', "visible");
    }else{
      document.documentElement.style.setProperty('--showColorMenu', "hidden");
    }
  }

  const setHoveringColor = (col) => {
    hoveringColor = col;
    renderCanvas();
  }

  const getColorButtons = () => {
    var buttons = [colorNum];

    for(var i = 0; i < colorNum; ++i){
      const x = i;
      buttons[i] = (
        <button key={i} 
          className= "colorButton"
          onMouseEnter={() => {setHoveringColor(x)}} 
          onMouseLeave={() => {setHoveringColor(-1)}} 
          onClick={() => {placePixel(x)}} 
          style={{backgroundColor: pickColor(i)}}>
        </button>
      );
    }

    return buttons;
  }

  const listButtons = getColorButtons();

  const onClick = ({nativeEvent}) => {
    const {offsetX, offsetY} = nativeEvent;

    isClicked = true;

    pannedDistance = 0.0;
    previousMousePos = {x: offsetX, y: offsetY};
  }

  const onRelease = ({nativeEvent}) => {
    const {offsetX, offsetY} = nativeEvent;
    isClicked = false;
    // console.log("distance panned = " + pannedDistance);

    if(pannedDistance > maxPanToSelect) return;
    
    //select pixel
    selectPixel(offsetX, offsetY, 1);
  }

  const onExit = ({nativeEvent}) => {
    // const {offsetX, offsetY} = nativeEvent;
    isClicked = false;
  }

  const panScreen = ({nativeEvent}) => {
    if(!isClicked) return;

    const {offsetX, offsetY} = nativeEvent;

    movePan(offsetX - previousMousePos.x, offsetY - previousMousePos.y);
    pannedDistance += Math.abs(offsetX - previousMousePos.x) + Math.abs(offsetY - previousMousePos.y);

    previousMousePos = {x: offsetX, y: offsetY};
    renderCanvas();
  }

  const zoomScreen = ({nativeEvent}) => {
    const {deltaY, offsetX, offsetY} = nativeEvent;
    const zoomInit = zoom;
    zoom *= Math.pow(zoomInterval, Math.sign(-deltaY));

    if(zoom > maxZoom)zoom = maxZoom;
    if(zoom < minZoom)zoom = minZoom;

    const {screenHeight, screenWidth} = getScreenDimentions();
    
    const cornerX = (windowDim.x - screenWidth)/2 + centerOffset.x;
    const cornerY = (windowDim.y - screenHeight)/2 + centerOffset.y;

    const distanceX = offsetX - cornerX;
    const distanceY = offsetY - cornerY;

    movePan(distanceX * (1-zoom/zoomInit), distanceY * (1-zoom/zoomInit));

    renderCanvas();
  }

  const movePan = (dx, dy) => {
    centerOffset.x += dx;
    centerOffset.y += dy;

    const {screenHeight} = getScreenDimentions();
    const pixelSize = 1.0*screenHeight / mapHeight;

    // panBound.minX*pixelSize*mapWidth/2 works for zoom = 0
    // min X and min Y are broken for values other than -1.0, pls fix that later

    if(centerOffset.x > panBound.maxX*pixelSize*mapWidth/2) centerOffset.x = panBound.maxX*pixelSize*mapWidth/2;
    if(centerOffset.x < pixelSize*mapWidth/2 + zoom*panBound.minX*pixelSize*mapWidth) centerOffset.x = pixelSize*mapWidth/2 + zoom*panBound.minX*pixelSize*mapWidth;

    if(centerOffset.y > panBound.maxY*pixelSize*mapHeight/2) centerOffset.y = panBound.maxY*pixelSize*mapHeight/2;
    if(centerOffset.y < pixelSize*mapHeight/2 + zoom*panBound.minY*pixelSize*mapHeight) centerOffset.y = pixelSize*mapHeight/2 + zoom*panBound.minY*pixelSize*mapHeight;
  }

  return (
    
    <div className="App">

      <div className="colorChoice">
        <b>Pick Color:</b>
        {listButtons}
      </div>

      <canvas
        onMouseDown={onClick}
        onMouseUp={onRelease}
        onMouseMove={panScreen} 
        onWheel={zoomScreen}
        onMouseLeave={onExit}
        ref={canvasRef}
        className= "canvas"
      />
    </div>
  );
}

export default App;

/*

<canvas
  onMouseDown={onClick}
  onMouseUp={onRelease}
  onMouseMove={panScreen}
  onWheel={zoomScreen}
  onMouseLeave={onExit}
  ref={canvasRef}
  id= "canvas"
/>

*/