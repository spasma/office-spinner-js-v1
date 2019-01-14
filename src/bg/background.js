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
    speak_end_message: true
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
setLocalStorage('changeParticipation', [])
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
    var userObj = getLocalStorageObj('data');
    var pos = function (position) {
        setLocalStorage('pos', {
            la: position.coords.latitude,
            lo: position.coords.longitude,
            ac: position.coords.accuracy
        });
    };
    navigator.geolocation.getCurrentPosition(pos);
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
        socket = io.connect('http://kantoorroulette.nl', {
            query: 'apiKey=' + serverInfo.api_key,
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


/*
 var pollInterval = 1000 * 30; // halve minuut, in milliseconds
 var timerId;
 var rouletteInfoObj = null;
 var texts = {};
 var debugObj;
 var posla = null, poslo = null; // Voor eventuele future use (Vraag iedereen binnen de straal van een x aantal meter)
 var availableVoices = new Array();
 var lastCheckFired = 0;

 function startRequest() {
 check();
 timerId = window.setTimeout(startRequest, pollInterval);
 }


 function processRouletteObject(roulette_id, rouletteObj, data) {

 debugObj = rouletteObj;
 if (typeof rouletteInfoObj[roulette_id] === "undefined") {
 rouletteInfoObj[roulette_id] = {};
 rouletteInfoObj[roulette_id].obj = rouletteObj;
 rouletteInfoObj[roulette_id].local = {
 initialNotification: false,
 loserNotification: false,
 spinningNotification: false,
 aMinute: false,
 active: false
 };
 console.log("Init " + roulette_id);
 }
 rouletteInfoObj.lasttime = new Date().getDate();


 if (rouletteObj.loser.length && rouletteInfoObj[roulette_id]['local'].initialNotification == true) {

 if (rouletteInfoObj[roulette_id]['local'].loserNotification == false && rouletteObj.loser[0].spinner != data.name && rouletteObj.reaction == 1) {
 var lNotification = 'L' + roulette_id;

 if (rouletteObj.loser[0].loser == data.name) {
 chrome.notifications.create(
 lNotification, {
 type: "basic",
 iconUrl: "icons/icon48.png",
 title: "Koffie Roulette!",
 message: ((rouletteObj.loser[0].loser == data.name) ? "jij" : rouletteObj.loser[0].loser) + " moet " + rouletteObj.item + " " + rouletteObj.action + ".",
 buttons: [{
 title: "Balen man!",
 iconUrl: "icons/icon48.png"
 },
 {
 title: "Het kan de besten overkomen!",
 iconUrl: "icons/icon48.png"
 }],
 priority: 9
 }
 );
 texts[lNotification] = [];
 texts[lNotification][0] = "Balen man!";
 texts[lNotification][1] = "Het kan de besten overkomen!";


 chrome.notifications.onButtonClicked.addListener(function (lNotification, buttonIndex) {
 if (buttonIndex === 0) {
 chrome.tts.speak(texts[lNotification][0], {
 'lang': 'nl-NL',
 rate: 1,
 //voice: availableVoices[availableVoices.length-1]
 });
 chrome.notifications.clear(lNotification, function () {
 });
 } else if (buttonIndex === 1) {
 chrome.tts.speak(texts[lNotification][1], {
 'lang': 'nl-NL',
 rate: 1
 });
 chrome.notifications.clear(lNotification, function () {
 });
 }
 });
 } else {
 chrome.notifications.create(
 lNotification, {
 type: "basic",
 iconUrl: "icons/icon48.png",
 title: "Koffie Roulette!",
 message: ((rouletteObj.loser[0].loser == data.name) ? "jij" : rouletteObj.loser[0].loser) + " moet " + rouletteObj.item + " " + rouletteObj.action + ".",
 buttons: [{
 title: "Lekker voor " + rouletteObj.loser[0].loser + "!",
 iconUrl: "icons/icon48.png"
 },
 {
 title: "Het kan de besten overkomen!",
 iconUrl: "icons/icon48.png"
 }],
 priority: 9
 }
 );


 texts[lNotification] = [];
 texts[lNotification][0] = "Lekker voor " + rouletteObj.loser[0].loser + "!";
 texts[lNotification][1] = "Het kan de besten overkomen!";

 chrome.notifications.onButtonClicked.addListener(function (lNotification, buttonIndex) {
 if (buttonIndex === 0) {
 chrome.tts.speak(texts[lNotification][0], {
 'lang': 'nl-NL',
 rate: 1
 });
 chrome.notifications.clear(lNotification, function () {
 });
 } else if (buttonIndex === 1) {
 chrome.tts.speak(texts[lNotification][1], {
 'lang': 'nl-NL',
 rate: 1
 });
 chrome.notifications.clear(lNotification, function () {
 });
 }
 });

 }
 chrome.tts.speak("Het lot heeft bepaald dat " + ((rouletteObj.loser[0].loser == data.name) ? "jij" : rouletteObj.loser[0].loser) + " " + rouletteObj.item + " moet halen.", {
 'lang': 'nl-NL',
 rate: 1
 });

 rouletteInfoObj[roulette_id]['local'].loserNotification = true;
 setLocalStorage('rouletteInfo', rouletteInfoObj);
 }
 }

 if (rouletteObj.reaction == null && rouletteObj.active == true) {

 if (rouletteObj.end_timestamp > (Date.now() / 1000)) {

 var secondsLeft = Math.floor(rouletteObj.end_timestamp - (Date.now() / 1000));
 if (secondsLeft < 61 && rouletteInfoObj[roulette_id]['local'].aMinute == false) {


 // A MINUTE


 var aMinNotificationId = "min" + roulette_id;
 chrome.notifications.create(
 aMinNotificationId, {
 type: "basic",
 iconUrl: "icons/icon48.png",
 title: "Koffie Roulette!",
 message: "Je hebt nog 1 minuut om mee te doen met de " + rouletteObj.item + " roulette, wil je ook " + data.name + "?",
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
 chrome.tts.speak("Je hebt nog 1 minuut om mee te doen met de " + rouletteObj.item + " roulette, wil je ook " + data.name + "?", {
 'lang': 'nl-NL',
 rate: 1
 });
 }
 );


 chrome.notifications.onButtonClicked.addListener(function (aMinNotificationId, buttonIndex) {

 if (buttonIndex === 0) {
 chrome.tts.speak("Ja, ik ook.", {
 'lang': 'nl-NL',
 rate: 1
 });
 $.post('http://kantoorroulette.nl/api/response', {
 roulette_id: roulette_id,
 reaction: "1"
 }, function (data) {
 });

 chrome.notifications.clear(aMinNotificationId, function () {
 });
 }
 if (buttonIndex === 1) {
 chrome.tts.speak("Nee, ik hoef niet.", {
 'lang': 'nl-NL',
 rate: 1
 });

 $.post('http://kantoorroulette.nl/api/response', {
 roulette_id: roulette_id,
 reaction: "2"
 }, function (data) {

 });


 chrome.notifications.clear(aMinNotificationId, function () {
 });
 }
 });

 rouletteInfoObj[roulette_id]['local'].aMinute = true;
 setLocalStorage('rouletteInfo', rouletteInfoObj);
 // END A MINUTE
 }
 }


 rouletteInfoObj[roulette_id]['local'].active = true;
 var notificationId = roulette_id;
 chrome.notifications.create(
 notificationId, {
 type: "basic",
 iconUrl: "icons/icon48.png",
 title: "Koffie Roulette!",
 message: "Hallo " + data.name + ", " + rouletteObj.initiator + " wil " + rouletteObj.item + "?",
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
 if (rouletteInfoObj[roulette_id]['local'].initialNotification == false) {
 chrome.tts.speak(rouletteObj.initiator + " wil graag " + rouletteObj.item + ".. jij ook " + data.name + "?", {
 'lang': 'nl-NL',
 rate: 1
 });
 }
 rouletteInfoObj[roulette_id]['local'].initialNotification = true;
 setLocalStorage('rouletteInfo', rouletteInfoObj);
 }
 );

 chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
 if (buttonIndex === 0) {
 chrome.tts.speak("Ja, ik ook.", {
 'lang': 'nl-NL',
 rate: 1
 });

 if (!rouletteObj.loser.length) {
 $.post('http://kantoorroulette.nl/api/response', {
 roulette_id: roulette_id,
 reaction: "1"
 }, function (data) {
 });
 }

 chrome.notifications.clear(notificationId, function () {
 });
 }
 if (buttonIndex === 1) {
 chrome.tts.speak("Nee, ik niet.", {
 'lang': 'nl-NL',
 rate: 1
 });
 if (!rouletteObj.loser.length) {
 $.post('http://kantoorroulette.nl/api/response', {
 roulette_id: roulette_id,
 reaction: "2"
 }, function (data) {

 });
 }


 chrome.notifications.clear(notificationId, function () {
 });
 }
 });
 } else if (rouletteObj.reaction == 1) {
 if ((rouletteObj.active != true && rouletteInfoObj[roulette_id]['local'].active == true && !rouletteObj.loser.length && !rouletteObj.spinning.length)) {

 var rNotification = "R" + roulette_id;
 var aantalDeelnemers = 0;
 var aantalAfhakers = 0;
 var afhakers = [];
 $.each(rouletteObj.reactions, function (user_id, reactionObj) {
 if (reactionObj.reaction == 1) {
 aantalDeelnemers++;
 } else if (reactionObj.reaction == 2) {
 aantalAfhakers++;
 afhakers.push(reactionObj.name);
 }
 });
 var afhakersText = "";
 if (aantalAfhakers > 0) {
 if (aantalAfhakers == 1) {
 afhakersText = "De afhaker is " + afhakers[0];
 } else {
 afhakersText = "De afhaker zijn " + opsomming(afhakers, "en");
 }
 }

 chrome.notifications.create(
 rNotification, {
 type: "basic",
 iconUrl: "icons/icon48.png",
 title: "Kantoor Roulette!",
 message: "De aanvraag is verlopen, er zijn " + aantalDeelnemers + " deelnemers die ook " + rouletteObj.item + " willen. " + afhakersText,
 priority: 9
 }
 );
 chrome.tts.speak("De aanvraag is verlopen, er zijn " + aantalDeelnemers + " deelnemers die ook " + rouletteObj.item + " willen. " + afhakersText, {
 'lang': 'nl-NL',
 rate: 1
 });
 rouletteInfoObj[roulette_id]['local'].active = false;
 }

 if (rouletteObj.spinning.length > 0 && rouletteInfoObj[roulette_id]['local'].spinningNotification == false) {
 var sNotification = "S" + roulette_id;
 chrome.notifications.create(
 sNotification, {
 type: "basic",
 iconUrl: "icons/icon48.png",
 title: "Kantoor Roulette!",
 message: rouletteObj.spinning[0].spinner + " heeft zojuist de roulette gestart.",
 priority: 9
 }
 );
 rouletteInfoObj[roulette_id]['local'].spinningNotification = true;
 }
 }
 setLocalStorage('rouletteInfo', rouletteInfoObj);
 }
 */
/*

 startRequest();
 var socket = io.connect('http://kantoorroulette.nl/ws/', { reconnection: true, timeout: 10000, reconnectionDelay: 10000 });


 socket.on('initialinfo', function (data) {
 console.log(data);
 });
 socket.on('users connected', function(data) {
 console.log(data);
 });

 chrome.tts.getVoices(
 function (voices) {
 for (var i = 0; i < voices.length; i++) {
 if (voices[i].lang == 'nl' || voices[i].lang == 'nl-NL')
 availableVoices.push(voices[i]);
 }
 }
 );
 */