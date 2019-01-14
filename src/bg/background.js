var pollInterval = 1000 * 30; // halve minuut, in milliseconds
var timerId;
var rouletteInfoObj = {};
var availableVoices = [];
var lastCheckFired = 0;
var socket = false;
var serverInfo;
var rouletteBusy = false;



var defaultSettings = {
    notification_new: true,
    notification_reminder: true,
    notification_end_message: true,
    speak_new: true,
    speak_reminder: true,
    speak_end_message: true,
    disable_plugin: false
};

window.addEventListener('storage', storageEventHandler, false);
function storageEventHandler(evt) {
    if (evt.key == "chatSentQueue") {
        processNewChatMessages();
    } else if (evt.key == "chatRecQueue") {
        fixIcon();
    } else if (evt.key == "changeParticipation") {
        var partObj = getLocalStorageObj('changeParticipation');
        if (partObj.reaction && (partObj.reaction == "1" || partObj.reaction == "2")) {
            socket.emit('request_response', partObj);
        }
        setLocalStorage('changeParticipation', []);
    } else if (evt.key == "current_roulette") {
        fixIcon();
    } else if (evt.key == "newRouletteRequest") {
        var sendObj = getLocalStorageObj('newRouletteRequest');
        if (sendObj.what)
            startRoulette(sendObj);
        else
            console.log("geen request");
    }
}

function startRoulette(sendObj) {
    socket.emit('newroulette', sendObj);
    setLocalStorage('newRouletteRequest', []);
}
var fixIconTimer = false;
function fixIcon() {
    cur_roulette = getLocalStorageObj('current_roulette');
    if (cur_roulette && cur_roulette.roulette && Object.keys(cur_roulette.roulette).length !== 0) {
        var a = new Date(); // Now
        var b = new Date(cur_roulette.roulette.end_date);

        var secondsLeft = Math.floor((b-a)/1000);

        chrome.browserAction.setBadgeText({text: secondsLeft+""});
        if (fixIconTimer)
            clearTimeout(fixIconTimer);
        fixIconTimer = setTimeout(function() {fixIcon()}, 1000)
    } else {
        var chatReceivedQueue = getLocalStorageObj('chatRecQueue');
        if (chatReceivedQueue.length) {
            var receivedNum = 0;
            $.each(chatReceivedQueue, function (id, val) {
                if (val.type == 'chat')
                    receivedNum++;
            });
            if (receivedNum)
                chrome.browserAction.setBadgeText({text: receivedNum < 11 ? (receivedNum + "") : "10+"});
            else
                chrome.browserAction.setBadgeText({text: ""});
        } else {
            chrome.browserAction.setBadgeText({text: ""});
        }

    }
}

function processNewChatMessages() {
    var newMessages = getLocalStorageObj('chatSentQueue');
    $.each(newMessages, function (num, text) {
        socket.emit('new message', text);
    });
    setLocalStorage('chatSentQueue', []);
}

setLocalStorage('chatHistory', []);
if (!getLocalStorageObj('pos'))
    setLocalStorage('pos', "");

setLocalStorage('changeParticipation', []);
setLocalStorage('chatRecQueue', []);
setLocalStorage('newRouletteRequest', []);
setLocalStorage('participants', []);
setLocalStorage('request_response', []);
setLocalStorage('current_roulette', []);
setLocalStorage('roulettes', []);
setLocalStorage('init_spinner_data', []);
setLocalStorage('spinposition', []);


var settings = getLocalStorageObj('settings');

if (settings === null) {
    settings = defaultSettings;
    setLocalStorage('settings', settings);
} else {
    for (var num in defaultSettings) {
        if (settings[num] === undefined) {
            settings[num] = defaultSettings[num];
            console.log('nieuwe setting "'+num+'" aangemaakt!');
        }
    }
    setLocalStorage('settings', settings);
}


function startRequest() {
    check();
    timerId = window.setTimeout(startRequest, pollInterval);
}

function setLocalStorage(name, obj) {
    localStorage.setItem(name, JSON.stringify(obj));
}

function getLocalStorageObj(name) {
    var retrievedObject = localStorage.getItem(name);
    return JSON.parse(retrievedObject);
}


function opsomming(array, orText) {
    if (array.length > 1) {
        var ret = "";
        var lastItem = array.pop();
        ret = array.join(", ");
        return ret + " " + orText + " " + lastItem;
    }
    else {
        return array[0];
    }
}
function check() {
    var posCb = function (position) {
        var pos = 'la='+position.coords.latitude+'&lo='+position.coords.longitude; // TODO SP: Wordt niks mee gedaan, voor toekomstige positiegebasseerde roulette server
        setLocalStorage('pos', pos);
    };
    navigator.geolocation.getCurrentPosition(posCb);
    checkSocket();
}

function AddZero(num) {
    return (num >= 0 && num < 10) ? "0" + num : num + "";
}

var audioMessage = new Audio("src/bg/message.wav");

function addChatMessage(obj) {
    var chatMessages = getLocalStorageObj('chatHistory');
    var chatReceivedQueue = getLocalStorageObj('chatRecQueue');

    if (!chatReceivedQueue) {
        chatReceivedQueue = [];
    }
    if (!chatMessages) {
        chatMessages = [];
    }

    chatMessages.push(obj);
    chatReceivedQueue.push(obj);
    if (obj.type == 'chat') {
        //audioMessage.play();
    }

    setLocalStorage('chatHistory', chatMessages);
    setLocalStorage('chatRecQueue', chatReceivedQueue);


    fixIcon();
}


function checkSocket() {
    serverInfo = getLocalStorageObj('data');
    if (serverInfo && serverInfo.user_id && !socket) {
        pos = getLocalStorageObj('pos');
        socket = io.connect('http://kantoorroulette.nl', {
            query: 'apiKey=' + serverInfo.api_key+"&version="+chrome.app.getDetails().version+'&'+pos,
            reconnection: true,
            timeout: 5000,
            reconnectionDelay: 10000
        });

        //socket.on('init', function (response) {
        //    console.log('dit is een test');
        //    console.log(response);
        //});

        socket.on('new message', function (obj) {
            addChatMessage(obj);
        });

        socket.on('connect', function () {
            addChatMessage({
                message: 'Je bent nu verbonden!',
                time: AddZero(new Date().getHours()) + ":" + AddZero(new Date().getMinutes())
            })
        });
        //socket.on('connect', function () {
        //    addChatMessage({
        //        message: 'Je bent opnieuw verbonden!',
        //        time: AddZero(new Date().getHours()) + ":" + AddZero(new Date().getMinutes())
        //    })
        //});
        socket.on('disconnect', function () {
            addChatMessage({
                message: 'Verbinding verbroken!',
                time: AddZero(new Date().getHours()) + ":" + AddZero(new Date().getMinutes())
            })
        });
        socket.on('update-server-info', function (obj) {
            setLocalStorage('roulettes', obj.roulettes);
            setLocalStorage('participants', obj.people);
        });
        socket.on('update-to-current-roulette', function (obj) {
            fixIcon();
            setLocalStorage('current_roulette', obj);
        });
        //

        socket.on('roulette_request_response', function (obj) {
            setLocalStorage('request_response', obj);
        });

        socket.on('initSpinnerData', function (obj) {
            popupMessage({
                messageText: 'De roulette is gestart door '+obj.spinner
            });
            setLocalStorage('init_spinner_data', obj);
        });

        socket.on('spinposition', function (obj) {
            setLocalStorage('spinposition', obj);
        });


        function replaceName(text) {
            return text.replace('{userName}', serverInfo.name);
        } 

        function popupMessage(obj) {
            chrome.notifications.create(
                'verlopen', {
                    type: "basic",
                    iconUrl: "icons/icon48.png",
                    title: "Koffie Roulette!",
                    message: replaceName(obj.messageText.toString()),
                    priority: 9
                },
                function () {
                    if (obj.ttsText)
                        chrome.tts.speak(replaceName(obj.ttsText.toString()), {
                            'lang': 'nl-NL',
                            rate: 1
                        });
                }
            );
        }
        
        socket.on('popupMessage', function (obj) {
            popupMessage(obj); 
        });

        socket.on('roulette_request', function (obj) {
            var roulette_id = obj.roulette_data.roulette.roulette_id;
            var notificationId = "R" + roulette_id;
            rouletteInfoObj = getLocalStorageObj('rouletteInfo');

            if (!obj.roulette_data.participants[(getLocalStorageObj('data').user_id)].response) {
                chrome.notifications.create(
                    notificationId, {
                        type: "basic",
                        iconUrl: "icons/icon48.png",
                        title: "Koffie Roulette!",
                        message: replaceName(obj.messageText.toString()),
                        buttons: [{
                            title: "Ik ook!",
                            iconUrl: "icons/icon48.png"
                        },
                            {
                                title: "Nee, ik hoef niet..",
                                iconUrl: "icons/icon48.png"
                            }],
                        priority: 9
                    },
                    function () {
                        if (!rouletteInfoObj) {
                            rouletteInfoObj = {};
                        }
                        if (!rouletteInfoObj[roulette_id]) {
                            rouletteInfoObj[roulette_id] = {};
                        }

                        if (obj.type == 'initial' && !rouletteInfoObj[roulette_id].initialNotification) {
                            chrome.tts.speak(replaceName(obj.ttsText), {
                                'lang': 'nl-NL',
                                rate: 1
                            });
                            rouletteInfoObj[roulette_id].initialNotification = true;
                        }
                        if (obj.type == 'reminder' && !rouletteInfoObj[roulette_id].reminderNotification) {
                            chrome.tts.speak(replaceName(obj.ttsText), {
                                'lang': 'nl-NL',
                                rate: 1
                            });
                            rouletteInfoObj[roulette_id].reminderNotification = true;
                        }

                        setLocalStorage('rouletteInfo', rouletteInfoObj);
                    }
                );
                chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
                    if (buttonIndex === 0) {
                        chrome.notifications.clear(notificationId, function () {
                            chrome.tts.speak("Ja, ik ook.", {
                                'lang': 'nl-NL',
                                rate: 1
                            });
                            socket.emit('request_response', {
                                roulette_id: roulette_id,
                                reaction: "1"
                            });
                        });
                    }
                    if (buttonIndex === 1) {
                        chrome.notifications.clear(notificationId, function () {
                            chrome.tts.speak("Nee, ik hoef niet.", {
                                'lang': 'nl-NL',
                                rate: 1
                            });
                            socket.emit('request_response', {
                                roulette_id: roulette_id,
                                reaction: "2"
                            });
                        });
                    }
                });
            } else {
                console.log("Al geantwoord");
            }
            //setLocalStorage('current_roulette', obj);
        });


        //// Whenever the server emits 'login', log the login message
        //socket.on('login', function (data) {
        //    connected = true;
        //    // Display the welcome message
        //    var message = "Welcome to Socket.IO Chat – ";
        //    console.log(data, message);
        //});
        //
        //// Whenever the server emits 'new message', update the chat body
        //socket.on('new message', function (data) {
        //    addChatMessage(data);
        //});
        //
        //// Whenever the server emits 'user joined', log it in the chat body
        //socket.on('user joined', function (data) {
        //    log(data.username + ' joined');
        //    addParticipantsMessage(data);
        //});
        //
        //// Whenever the server emits 'user left', log it in the chat body
        //socket.on('user left', function (data) {
        //    log(data.username + ' left');
        //    addParticipantsMessage(data);
        //    removeChatTyping(data);
        //});
        //
        //// Whenever the server emits 'typing', show the typing message
        //socket.on('typing', function (data) {
        //    addChatTyping(data);
        //});
        //
        //// Whenever the server emits 'stop typing', kill the typing message
        //socket.on('stop typing', function (data) {
        //    removeChatTyping(data);
        //});
        //


    }
}

//function addChatMessage(data) {
//    console.log(data);
//}
function addParticipantsMessage(data) {
    console.log(data);
}
function removeChatTyping(data) {
    console.log(data);
}
function addChatTyping(data) {
    console.log(data);
}

startRequest();