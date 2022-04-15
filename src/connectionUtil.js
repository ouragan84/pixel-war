import React, { useEffect, useState } from 'react'
import {over} from 'stompjs';
import SockJS from 'sockjs-client';

const _APIURL = "https://spring-pixel-war-no-db.herokuapp.com";

var stompClient = null;
var updateCallBack = () => {};
var errorCallBack = () => {};
var connectCallBack = () => {};

export const connect = (updateCallBackFunc, connectCallBackFunc, errorCallBackFunc) => {
  console.log("Trying to connect to API ");

  let Sock = new SockJS(_APIURL + '/connect');
  stompClient = over(Sock);
  stompClient.connect({}, onConnected, onError);
  updateCallBack = updateCallBackFunc;
  errorCallBack = errorCallBackFunc;
  connectCallBack = connectCallBackFunc;

}

export const gridGet = () => {
  var message = {
  };
  stompClient.send("/app/grid/get", {}, JSON.stringify(message));
}

export const gridPlace = (x, y, color) => {
  var message = {
    x:x,
    y:y,
    color:color
  };
  stompClient.send("/app/grid/place", {}, JSON.stringify(message));
}

const onConnected = () => {
  // setUserData({...userData,"connected": true});
  console.log("Connection Success");

  stompClient.subscribe('/topic/messages', onMessageReceived);
  connectCallBack();
  // userJoin();
}

const onMessageReceived = (payload)=>{
  var payloadData = JSON.parse(payload.body);
  console.log("Message Arrived");

  updateCallBack(payloadData);
}

const onError = (err) => {
  console.log("beep boop error :(");

  console.log(err);
  errorCallBack();
}