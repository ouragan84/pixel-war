import {over} from 'stompjs';
import SockJS from 'sockjs-client';

const _APIURL = "https://pixel-war-api.herokuapp.com"; //"https://pixel-war-api.herokuapp.com" "http://localhost:8090"
const connecEndPoint = "/connect";
const requestGetEndPoint = "/grid/get";
const requestPlaceEndPoint = "/app/grid/place";
const subscribeEndPoint = "/topic/messages";

const connectionAttemptsDelay = 2000;//ms
var isConnected = false;

var stompClient = null;

var updateCallBack = () => {};
var errorCallBack = () => {};
var connectCallBack = () => {};


export const connect = (updateCallBackFunc, connectCallBackFunc, errorCallBackFunc) => {
  console.log("Trying to connect to API ");

  let Sock = new SockJS(_APIURL + connecEndPoint);
  stompClient = over(Sock);
  stompClient.connect({}, onConnected, onError);

  updateCallBack = updateCallBackFunc;
  errorCallBack = errorCallBackFunc;
  connectCallBack = connectCallBackFunc;

  const interval = setInterval(() => {
    reattemptConnection();
  }, connectionAttemptsDelay);

  return () => clearInterval(interval);
}


export const gridGet = () => {
  fetch(_APIURL + requestGetEndPoint)
        .then(async response => {
            const data = await response.json();

            // check for error response
            if (!response.ok) {
                // get error message from body or default to response statusText
                const error = (data && data.message) || response.statusText;
                onError(error);
                return;
            }

            onMessageReceived(data);
        })
        .catch(error => {
            onError(error);
        });

        // gridPlace(0,0,1);
}

export const gridPlace = (x, y, color) => {
  var message = {
    x:x,
    y:y,
    color:color
  };
  stompClient.send(requestPlaceEndPoint, {}, JSON.stringify(message));
}

const reattemptConnection = () => {
  if(!isConnected){
    stompClient.connect({}, onConnected, onError);
  }
}

const onConnected = () => {
  console.log("Connection Success");

  isConnected = true;

  stompClient.subscribe(subscribeEndPoint, convertRecievedMessageToJSON);
  connectCallBack();
}

const convertRecievedMessageToJSON = (payload) => {
  onMessageReceived(JSON.parse(payload.body));
}

const onMessageReceived = (payload)=>{
  console.log("Message Arrived");
  // console.log(payloadData);

  updateCallBack(payload);
}

const onError = (err) => {
  console.error("beep boop error :(", err);
  isConnected = false;
  errorCallBack(err);
}