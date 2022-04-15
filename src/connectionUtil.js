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







// const url = 'http://localhost:8090';

// var _stompClient = null;

// export const webSocket = () => {

//   _stompClient = new Client();

//   _stompClient.configure({
//     brokerURL: 'ws://localhost:8090/grid',
//     onConnect: () => {
//       console.log('onConnect');

//       _stompClient.subscribe('/topic/messages', message => {
//         console.log(message);
//         // this.setState({serverTime: message.body});
//       });
//     },
//     // Helps during debugging, remove in production
//     debug: (str) => {
//       console.log(new Date(), str);
//     }
//   });

//   _stompClient.activate();


  //const [message, newMessage] = useState();

  // _stompClient = new Client({
  //   brokerURL: url+'/grid',
  //   connectHeaders: {},
  //   debug: (str) => {
  //     console.log(str);
  //   },
  //   reconnectDelay: 500,
  //   heartbeatIncoming: 4000,
  //   heartbeatOutgoing: 4000,
  //   logRawCommunication: false,
  //   webSocketFactory: () => {
  //     return SockJS(url);
  //   },
  //   onStompError: (frame) => {
  //     console.log("Stomp Error", frame);
  //   },
  //   onConnect: (frame) => {
  //     console.log("Stomp Connect", frame);
  //     if (_stompClient.connected) {
  //       _stompClient.subscribe("topic/messages", (message) => {
  //         console.log("message");
  //         if (message.body) {
  //           let body = JSON.parse(message.body);
  //           console.log(body);
  //         }
  //       });
  //     }
  //   },
  //   onDisconnect: (frame) => {
  //     console.log("Stomp Disconnect", frame);
  //   },
  //   onWebSocketClose: (frame) => {
  //     console.log("Stomp WebSocket Closed", frame);
  //   },
  //   onWebSocketError: (frame) => {
  //     console.log("Stomp WebSocket Error", frame);
  //   },
  // });

  // _stompClient.activate();
  // return _stompClient;
// };









// export const connect = () => {
//     client = new Client();

//     client.configure({
//       brokerURL: url+'/grid',
//       onConnect: () => {
//         console.log('onConnect');

//         client.subscribe('/topic/messages', message => {
//           console.log("got feedback");
//           console.log(message.body);
//         });
//       },
//     });

//     client.activate();
// }

// export const sendMessage = (x, y, color) => {
//     // stompClient.send("/app/grid", {}, JSON.stringify({'x':x, 'y':y, 'color':color}));
//     client.publish({destination: '/app/grid', body: '{x:' + x +  ',y:' + y + ',color:'+color});
// }

// export const sendEmptyMessage = () => {
//     // stompClient.send("/app/grid", {}, JSON.stringify({}));
//     client.publish({destination: '/app/grid', body: '{}'});
// }       

// export const showMessageOutput = (messageOutput) => {
//     // var response = document.getElementById('response');
//     // var p = document.createElement('p');
//     // // p.style.wordWrap = 'break-word';
//     // p.appendChild(document.createTextNode(messageOutput.width + "x"
//     //   + messageOutput.height + ":" ));
//     // p.appendChild(document.createElement("br"));
//     // messageOutput.grid.forEach(arr => {
//     //     arr.forEach(elem => {
//     //         p.appendChild(document.createTextNode(elem + ' '));
//     //     })
//     //     p.appendChild(document.createElement("br"));
//     // });
//     // response.appendChild(p);
//     var output = "";
//     messageOutput.grid.forEach(arr => {
//             arr.forEach(elem => {
//                 output += elem + ' ';
//             })
//             output += "\n";
//         });

//     console.log(output);
// }