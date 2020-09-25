
// local import

import { setInputDirection } from "./input.js";

// variables

// websocket ip depends on host ip
// PORT is set in server.js login.js script.js
export const ws = new WebSocket(`ws://${document.location.hostname}:9090`);
const gameBoard = document.getElementById("game_board");
export let playerId = localStorage.getItem("playerId");
let currentPlayerId = null;
let allPlayers = null; // { id: { username: u, score: s } }
// prevents from cheating when inputing more than 1 key per render
// at 1st set to valid move, then to move which is possible from this move
// but not the one before => move gets rendered which is illegal
// in terms of the game rules
let allowMove = false;
let snakeLen = 1;
let growLen = null;

// client websocket

ws.onopen = function(e){
    let payLoad = {
        "type" : "connect",
        "playerId" : playerId
    };
    ws.send(JSON.stringify(payLoad));
    console.log("(client) initialized ws connection");
}

ws.onmessage = function(msg){
    const result = JSON.parse(msg.data);
    switch(result.type){
        case "new":
            allowMove = true;
            let snakeBody = result.snakeBody;
            let food = result.food;
            currentPlayerId = result.currentPlayerId;
            console.log("(client) drawing", snakeBody, result.inputDirection, currentPlayerId);
            let ateFood = result.ateFood;
            gameBoard.textContent = "";
            if(ateFood){
                // allows correct possible move directions after player switch
                setInputDirection(result.inputDirection);
                snakeLen += growLen;
            }
            drawSnake(snakeBody);
            drawFood(food);
            drawPlayerTurn(currentPlayerId);
            drawSnakeLen(snakeLen); 
            break;
        case "connect":
            console.log(`(client) you connected: ${playerId}`);
            allPlayers = result.allPlayers;
            growLen = result.growLen;
            Object.entries(allPlayers).forEach(([id, info]) => {
                drawPlayerId(id, info.username)
                drawScoreElem(id);
            });
            subscribeBroadcast();
            break;
        case "join":
            console.log("(client) someone joined");
            let newPlayerId = result.newPlayerId;
            if(allPlayers[newPlayerId] === undefined){
                let newUsername = result.newUsername;
                allPlayers[newPlayerId] = {
                    username: newUsername,
                    score: 0
                };
                drawPlayerId(newPlayerId, newUsername);
                drawScoreElem(newPlayerId);
            }
            break;
        case "over":
            console.log("(client) GAME OVER!"+result.currentPlayerId+playerId);
            currentPlayerId = result.currentPlayerId;
            let title = null;
            let msg = null; 
            if(currentPlayerId != playerId){
                title = `CONGRATS, ${allPlayers[playerId].username} !`;
                msg = "You won !";
                console.log("winner"+title+msg);
            }else{
                title = `GAME OVER, ${allPlayers[playerId].username} !`;
                msg = "Maybe next time !";
                console.log("looser"+title+msg);
            }
            let buttons = {
                    "Play again" : function(){
                        console.log("(client) play again");
                        let payLoad = {
                            type: "restart"
                        };
                        ws.send(JSON.stringify(payLoad));
                        jQuery(this).dialog("close");
                    },
                    "Cancel" : function(){
                        console.log("(client) stop playing");
                        jQuery(this).dialog("close");
                    }
            }
            jQuery("#restart_content").text(msg);
            jQuery("#restart_dialog").dialog({
                title: title,
                resizable: false,
                height: "auto", // adjust based on content
                width: 500,
                modal: true, // disable other items
                buttons: buttons 
            });
            drawScoreValue(currentPlayerId);
            setInputDirection({x: 0, y: 0});
            snakeLen = 1;
            break;
    }
}

function subscribeBroadcast(){
    let payLoad = {
        "type" : "ready",
        "playerId" : playerId
    };
    ws.send(JSON.stringify(payLoad));
}

export function getAllowMove(){
    return allowMove;
}

export function setAllowMove(newAllowMove){
    allowMove = newAllowMove;
}

// draw functions

drawSnakeLen(snakeLen);

function drawSnake(snakeBody){
    snakeBody.forEach(part =>{
        const snakeElem = document.createElement("div"); // create html elem
        snakeElem.style.gridColumnStart = part.x; // set x pos
        snakeElem.style.gridRowStart = part.y; // set y pos
        snakeElem.classList.add("snake"); // add to elem to snake class
        gameBoard.appendChild(snakeElem); // make this div elem child of the div game-board
    });
}

function drawFood(foodPos){
    const foodElem = document.createElement("div"); // create html elem
    foodElem.style.gridColumnStart = foodPos.x; // set x pos
    foodElem.style.gridRowStart = foodPos.y; // set y pos
    foodElem.classList.add("food"); // add to elem to snake class
    gameBoard.appendChild(foodElem); // make this div elem child of the div game-board
}

function drawPlayerId(id, username){
    let td = $("<td></td>");
    td.prop("class", "mytext");
    td.prop("id", `p_${id}`);
    td.text(username);
    $("#players").append(td);
}

function drawPlayerTurn(currentPlayerId){
    let value = null;
    Object.keys(allPlayers).forEach(playerId => {
        if(playerId == currentPlayerId){
            value = "0.1vmin dashed var(--main-highlight)";
        }else{
            value = "initial";
        }
        $(`#p_${playerId}`).css("border", value);
    });
}

function drawScoreElem(id){
    let td = $("<td></td>");
    td.prop("class", "mytext");
    td.prop("id", `s_${id}`);
    td.text(allPlayers[id].score);
    $("#scores").append(td);
}

function drawScoreValue(looserId){
    Object.keys(allPlayers).forEach(playerId => {
        if(playerId != looserId){
            $(`#s_${playerId}`).text(++allPlayers[playerId].score);
        }
    });
}

function drawSnakeLen(len){
    $("#snake_len").text(len);
}
