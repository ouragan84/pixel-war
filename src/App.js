import {pickColor, pickRGBColor, colorNum} from './utils.js'
import {connect, gridGet, gridPlace} from './connectionUtil.js'
import './App.css'; 
import { useEffect, useRef, useState} from 'react';

const gridRatio = 0.02; const hoveringOverlaySize = 0.05;

const maxPanToSelect = 10.0;
const frameRate = 30;

const minZoom = 0.4; //whole grid size, absolute
const maxZoomPIS = 5.0; //pixels in grid, maxZoom calulated real time
const zoomInterval = 1.1;
const maxPIStoShowGrid = 40.0;
const windowBackgroundColor = "#6f6f6f";
const gridColor = windowBackgroundColor;

var mapWidth = 0; var mapHeight = 0;
var pixelColor = Array(mapWidth).fill(0).map(x => Array(mapHeight).fill(0)); //[x,y] 0=white, 1=lgray, ... (see utils)

var selectedColor = -1;
var hasConnected = false;
var hoveringPixel = {x:-1, y:-1};

var zoom = 1.0;//absolute

var isClicked = false;
var pannedDistance = 0.0;
var panBound = {minX: -1.0, maxX: 1.0, minY: -1.0, maxY: 1.0}

var previousMousePos = {x:0, y:0};
var centerOffset = {x:0, y:0};
var windowDim = {x:0, y:0};

var currentImage = new Image();
var imgData;
// var currentPixelTesselationInImage = 1;


function App() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  const update = () => {
    if(!hasConnected)
      attemptConnection();

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

    context.webkitImageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;
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

  const attemptConnection = () => {
    hasConnected = true;
    connect(updateGrid, updatePixel, connectionSuccess, connectionError);
  }

  const connectionError = (error) => {
    document.documentElement.style.setProperty('--showLoadScreen', "hidden");
    document.documentElement.style.setProperty('--showErrorScreen', "visible");
  }

  const connectionSuccess = () => {
    hasConnected = true;
    document.documentElement.style.setProperty('--showLoadScreen', "hidden");
    document.documentElement.style.setProperty('--showErrorScreen', "hidden");
    gridGet();
  }

  const updateGrid = (data) => {

    mapWidth = data.width;
    mapHeight = data.height;
    pixelColor = data.grid.map(function(arr) {
      return arr.slice();
    });
    // updateImageAtNextRender = true;
    updateImage();
    renderCanvas();
  }

  const updatePixel = (data) => {
    // updateImageAtNextRender = true;
    changePixelColor(data.x, data.y, data.color);
  }

  const changePixelColor = (x, y, color) => {
    pixelColor[x][y] = color;
    updateImageSinglePixel(x, y, color);
    renderCanvas();
  }

  const updateImage = async () => {

    imgData = contextRef.current.createImageData(mapWidth, mapHeight);

    for(var x = 0; x < mapWidth; ++x){

      for(var y = 0; y < mapHeight; ++y){

        const col = pickRGBColor(pixelColor[x][y]);
        const index = 4*(x + y*mapWidth);

        imgData.data[index + 0] = col[0];
        imgData.data[index + 1] = col[1];
        imgData.data[index + 2] = col[2];
        imgData.data[index + 3] = 255;
        
      }
    }

    currentImage = await imagedata_to_image(imgData);

    renderCanvas();
  }

  const updateImageSinglePixel = async (x, y, color) => {

    const index = 4*(x + y*mapWidth);
    const col = pickRGBColor(color);
    imgData.data[index + 0] = col[0];
    imgData.data[index + 1] = col[1];
    imgData.data[index + 2] = col[2];
    imgData.data[index + 3] = 255;
    currentImage = await imagedata_to_image(imgData);

    renderCanvas();
  }

  const renderAsImage = (pixelSize, screenHeight, screenWidth) => {

    contextRef.current.drawImage(currentImage, (windowDim.x - screenWidth)/2 + centerOffset.x, 
      (windowDim.y - screenHeight)/2 + centerOffset.y, 
      mapWidth*pixelSize, mapHeight*pixelSize);
  }

  const renderGrid = (pixelSize, screenHeight, screenWidth) => {
    if(getZoomPIS() > maxPIStoShowGrid) return;

    contextRef.current.fillStyle = gridColor;

    const minX = Math.max(0, (windowDim.x - screenWidth)/2 + centerOffset.x);
    const maxX = Math.min(1.0*screenWidth * zoom + (windowDim.x - screenWidth)/2 + centerOffset.x, windowDim.x);
    const minY = Math.max(0, (windowDim.y - screenHeight)/2 + centerOffset.y);
    const maxY = Math.min(1.0*screenHeight * zoom + (windowDim.y - screenHeight)/2 + centerOffset.y, windowDim.y);

    const minPixelX = Math.floor(1.0*mapWidth/(screenWidth * zoom) * (minX - centerOffset.x - (1.0*windowDim.x-screenWidth)/2));
    const maxPixelX = Math.ceil(1.0*mapWidth/(screenWidth * zoom) * (maxX + 1 - centerOffset.x - (1.0*windowDim.x-screenWidth)/2));
    const minPixelY = Math.floor(1.0*mapHeight/(screenHeight * zoom) * (minY - centerOffset.y - (1.0*windowDim.y-screenHeight)/2));
    const maxPixelY = Math.ceil(1.0*mapHeight/(screenHeight * zoom) * (maxY + 1 - centerOffset.y - (1.0*windowDim.y-screenHeight)/2));

    // contextRef.current.fillRect(0, minY, 100, 5);
    // contextRef.current.fillRect(0, maxY-5, 100, 5);
    // contextRef.current.fillRect(minX, 0, 5, 100);
    // contextRef.current.fillRect(maxX-5, 0, 5, 100);

    for(var x = minPixelX; x < maxPixelX; ++x){
      const coordX = 1.0*screenWidth * zoom * x / mapWidth + (windowDim.x - screenWidth)/2 + centerOffset.x - 0.5*gridRatio;
      contextRef.current.fillRect(coordX, minY, gridRatio*pixelSize, maxY-minY);
    }

    for(var y = minPixelY; y < maxPixelY; ++y){
      const coordY = 1.0*screenHeight * zoom * y / mapHeight + (windowDim.y - screenHeight)/2 + centerOffset.y - 0.5*gridRatio;
      contextRef.current.fillRect(minX, coordY, maxX-minX, gridRatio*pixelSize);
    }
  }

  const renderCursor = (pixelSize, screenWidth, screenHeight) => {
    if(hoveringPixel.x < 0 || hoveringPixel.y < 0 || hoveringPixel.x >= mapWidth || hoveringPixel.y >= mapHeight) return;

    const hoverX = 1.0*screenWidth * zoom * hoveringPixel.x / mapWidth + (windowDim.x - screenWidth)/2 + centerOffset.x;
    const hoverY = 1.0*screenHeight * zoom * hoveringPixel.y / mapHeight + (windowDim.y - screenHeight)/2 + centerOffset.y;

    if(hoverX > windowDim.x || hoverX+pixelSize < 0 || hoverY > windowDim.y || hoverY+pixelSize < 0) return;

    contextRef.current.fillStyle = "#e8b61e";
    contextRef.current.fillRect(hoverX - hoveringOverlaySize*pixelSize, hoverY - hoveringOverlaySize*pixelSize, (1+2*hoveringOverlaySize)*pixelSize, (1+2*hoveringOverlaySize)*pixelSize);

    contextRef.current.fillStyle = pickColor(pixelColor[hoveringPixel.x][hoveringPixel.y]);
    contextRef.current.fillRect(hoverX + hoveringOverlaySize*pixelSize, hoverY + hoveringOverlaySize*pixelSize, (1-2*hoveringOverlaySize)*pixelSize, (1-2*hoveringOverlaySize)*pixelSize);
  }

  // const renderAsRects = (pixelSize, screenHeight, screenWidth) => {

  //   for(var i = 0; i < pixelColor.length; ++i){
  //     const pixelX = 1.0*screenWidth * zoom * i / mapWidth + (windowDim.x - screenWidth)/2 + centerOffset.x;

  //     if(pixelX > windowDim.x || pixelX+pixelSize < 0) continue;

  //     for(var j = 0; j < pixelColor[i].length; ++j){
  //       const pixelY = 1.0*screenHeight * zoom * j / mapHeight + (windowDim.y - screenHeight)/2 + centerOffset.y;

  //       if(pixelY > windowDim.y || pixelY+pixelSize < 0) continue;
        
  //       contextRef.current.fillStyle = pickColor(pixelColor[i][j]);

  //       if(getZoomPIS() <= maxPIStoShowGrid)
  //         contextRef.current.fillRect(pixelX + gridRatio*pixelSize, pixelY + gridRatio*pixelSize, (1-2*gridRatio)*pixelSize, (1-2*gridRatio)*pixelSize);
  //       else{
  //         var num;
  //         const col = pixelColor[i][j]

  //         for(num = 0; num < mapWidth && pixelColor[i][j+num+1] === col; ++num);
  //         j += num;

  //         contextRef.current.fillRect(pixelX - overFill, pixelY - overFill, pixelSize + 2*overFill, pixelSize*(1+num) + 2*overFill);
  //       }
          
  //     }
  //   }
  // }

  const renderCanvas = async () => {
    contextRef.current.fillStyle = windowBackgroundColor;
    contextRef.current.fillRect(0,0, windowDim.x, windowDim.y);

    if(mapWidth < 1 || mapHeight < 1) return;

    const {screenHeight, screenWidth} = getScreenDimentions();
    const pixelSize = 1.0*zoom*screenHeight / mapHeight;

    renderAsImage(pixelSize, screenHeight, screenWidth);
    renderGrid(pixelSize, screenHeight, screenWidth);
    renderCursor(pixelSize, screenHeight, screenWidth);
  }

  const imagedata_to_image = async (imagedata) => {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = imagedata.width;
    canvas.height = imagedata.height;
    ctx.putImageData(imagedata, 0, 0);

    var image = new Image();
    image.src = canvas.toDataURL();
    return image;
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

  const placePixel = (x, y) => {
    const {screenHeight, screenWidth} = getScreenDimentions();
    const pixelX = Math.floor(1.0*mapWidth/(screenWidth * zoom) * (x - centerOffset.x - (1.0*windowDim.x-screenWidth)/2));
    const pixelY = Math.floor(1.0*mapHeight/(screenHeight * zoom) * (y - centerOffset.y - (1.0*windowDim.y-screenHeight)/2));

    if(pixelX < 0 || pixelX >= mapWidth || pixelY < 0 || pixelY >= mapHeight){
      return;
    }

    if(selectedColor < 0) return;
    
    gridPlace(pixelX, pixelY, selectedColor);
  }

  const updateMouseHovering = (mouseX, mouseY) => {
    if(selectedColor < 0)return;

    const {screenHeight, screenWidth} = getScreenDimentions();

    const pixelX = Math.floor(1.0*mapWidth/(screenWidth * zoom) * (mouseX - centerOffset.x - (1.0*windowDim.x-screenWidth)/2));
    const pixelY = Math.floor(1.0*mapHeight/(screenHeight * zoom) * (mouseY - centerOffset.y - (1.0*windowDim.y-screenHeight)/2));

    if(pixelX === hoveringPixel.x && pixelY === hoveringPixel.y) return;

    hoveringPixel.x = pixelX;
    hoveringPixel.y = pixelY;

    renderCanvas();
  }

  const selectColor = (color) => {
    selectedColor = color;
  }

  const getButtonStateList = () => {
    var items = [];
    for(var i = 0; i < colorNum; ++i)
      items.push({id:i, border:'4px solid #000000'});
    return items;
  }

  const getColorButtons = () => {
    var buttons = [colorNum];

    for(var i = 0; i < colorNum; ++i){
      const x = i;
      buttons[i] = (

        <button key={x} 
          className= "colorButton"
          onClick = { () => {
            onButtonClick(x);
          }}
          style = {{backgroundColor: pickColor(x), border: buttonState[x].border}} >
        </button>

      );
    }

    return buttons;
  }

  const buttonStateList = getButtonStateList();
  const [buttonState, SetButtonState] = useState(buttonStateList);
  const listButtons = getColorButtons();

  const onButtonClick = (i) => {

    var items = getButtonStateList();
    items[i] = { id: i, border: '4px solid #ffb14a' }
    
    SetButtonState(items);
    
    selectColor(i);
  }

  const onClick = ({nativeEvent}) => {
    const {offsetX, offsetY} = nativeEvent;

    isClicked = true;

    pannedDistance = 0.0;
    previousMousePos = {x: offsetX, y: offsetY};
  }

  const onRelease = ({nativeEvent}) => {
    const {offsetX, offsetY} = nativeEvent;
    isClicked = false;

    if(pannedDistance > maxPanToSelect) return;
    
    //select pixel
    placePixel(offsetX, offsetY);
  }

  const onExit = ({nativeEvent}) => {
    // const {offsetX, offsetY} = nativeEvent;
    isClicked = false;
  }

  const panScreen = ({nativeEvent}) => {

    const {offsetX, offsetY} = nativeEvent;

    updateMouseHovering(offsetX, offsetY);
    
    if(!isClicked) return;

    movePan(offsetX - previousMousePos.x, offsetY - previousMousePos.y);
    pannedDistance += Math.abs(offsetX - previousMousePos.x) + Math.abs(offsetY - previousMousePos.y);

    previousMousePos = {x: offsetX, y: offsetY};
    renderCanvas();
  }

  const getZoomPIS = () => {
    return (1.0 * Math.max(Math.min(mapHeight, mapWidth), 1) / zoom);
  }

  const zoomScreen = ({nativeEvent}) => {
    const {deltaY, offsetX, offsetY} = nativeEvent;

    updateMouseHovering(offsetX, offsetY);

    const zoomInit = zoom;
    zoom *= Math.pow(zoomInterval, Math.sign(-deltaY));

    const {screenHeight, screenWidth} = getScreenDimentions();

    const maxZoom = 1.0 * Math.max(Math.min(mapHeight, mapWidth), 1) / maxZoomPIS;

    if(zoom > maxZoom)zoom = maxZoom;
    if(zoom < minZoom)zoom = minZoom;
    
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

      <div className="loadScreen">
        <br/>
        <h1>Loading ... </h1>
      </div>

      <div className="errorScreen">
        <br/>
        <h1>Could not Connect to Server :(</h1> <br/>
        <h1>Please try to Refreshing the Page a couple times</h1> <br/>
        <h2>It may take a few seconds for the server to start up if it was asleep</h2> <br/>
      </div>

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