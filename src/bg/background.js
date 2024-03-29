/*

Roulette chrome background socket magic!!
Door Sebastiaan Pasma (sebastiaan [a] pixelq.nl / sebastiaan [a] pas.ma)

sockets worden hier geregeld en allemaal storage dingetjes voor opslag van settings, gebruikers e.d.

TODO: Local storage communicatie tussen window en background verbeteren.

*/

var pollInterval = 1000 * 30; // halve minuut, in milliseconds
var timerId;
var rouletteInfoObj = {};
var socket = false;
var serverInfo;
var lastState = 'active';
var lastIconBadgeText = "";
var updateSettings = 0;
var disabledCd = false;
var secondsLeftDisabled = false;


function isDevMode() {
    return false; // !('update_url' in chrome.runtime.getManifest());
}

chrome.idle.setDetectionInterval(300);
chrome.idle.onStateChanged.addListener(function(newstate) {
    var time = new Date();
    if (newstate == 'locked' || newstate == 'idle') {
        socket.emit('user_idle', {idle: true});
    } else if (newstate == 'active' && lastState != 'active') {
        socket.emit('user_idle', {idle: false});
    }
    lastState = newstate;
});

var defaultSettings = {
    notification_new: true,
    notification_reminder: true,
    notification_end_message: true,
    speak_new: true,
    speak_reminder: true,
    speak_end_message: true,
    disable_plugin: false,
    disabled_last_chosen: false,
    gamble: false,
    balance: 0,
    harco_feature: false // feature bedacht door Harco Janssen van paperblue.nl
};

function updateData(data) {
    if (!data) {
        data = getLocalStorageObj('data');
        jQuery.getJSON('https://kantoorroulette.nl/apiv2/rouletteserver', {api_key: (data && data.api_key) ? data.api_key : "none"}, function (data) {
            setLocalStorage('data', data);
            updateData(data);
        });
    } else if (data.user_id) {
        if (data.balance !== undefined) {
            gamble = true;
            settings = getLocalStorageObj('settings');
            settings.balance = data.balance;
            setLocalStorage('settings', settings);
        }
    }
}

function storageEventHandler(evt) {
    if (evt.key == "chatSentQueue") {
        processNewChatMessages();
    } else if (evt.key == "changeParticipation") {
        var partObj = getLocalStorageObj('changeParticipation');
        if ((partObj.reaction && (partObj.reaction == "1" || partObj.reaction == "2")) || partObj.gamble) {
            if ((settings.gamble && !partObj.gamble) || partObj.gamble == 1) {
                if (settings.balance>=0.25) {
                    addChatMessage({
                        type: 'gamble_success',
                        message: 'Je doet mee met de Gulden Gamble!',
                        time: AddZero(new Date().getHours()) + ":" + AddZero(new Date().getMinutes())
                    });
                    partObj.gamble = 1;
                } else {
                    addChatMessage({
                        type: 'gamble_error',
                        message: 'Je hebt niet genoeg saldo om mee te doen met de Gulden Gamble.',
                        time: AddZero(new Date().getHours()) + ":" + AddZero(new Date().getMinutes())
                    });
                    partObj.gamble = false;
                }
            }
            socket.emit('request_response', partObj);
        }
        setLocalStorage('changeParticipation', []);
    } else if (evt.key == "newRouletteRequest") {
        var sendObj = getLocalStorageObj('newRouletteRequest');
        if (sendObj && sendObj.what) {
            if (settings.gamble) {
                sendObj.gamble = 1;
            }
            startRoulette(sendObj);
        }
    } else if (evt.key == "settings") {
        checkSettings();
    }
}
window.addEventListener('storage', storageEventHandler, false);



function countDownDisabled() {
    var settings = getLocalStorageObj('settings');
    if (disabledCd)
        clearTimeout(disabledCd);
    var now = new Date();
    var disabledPluginUntill = new Date(settings.disable_plugin);
    secondsLeftDisabled = Math.floor((disabledPluginUntill - now) / 1000);

    if (secondsLeftDisabled > 0) {
        chrome.browserAction.setIcon({path: 'src/browser_action/img/icon_disabled.png'});
        disabledCd = setTimeout(function () {
            countDownDisabled();
        }, 1000);
    } else {
        chrome.browserAction.setIcon({path: 'src/browser_action/img/icon.png'});
        settings.disable_plugin = false;
        secondsLeftDisabled = false;
        popupMessage({messageText: 'Meldingen voor de Kantoor Roulette zijn weer ingeschakeld.'})
        setLocalStorage('settings', settings);
    }

    if (secondsLeftDisabled % 20 === 0 || secondsLeftDisabled == false) {
        if (socket)
            socket.emit('user_disabled', {disabled: settings.disable_plugin});
    }

}

function startRoulette(sendObj) {
    socket.emit('newroulette', sendObj);
    setLocalStorage('newRouletteRequest', []);
}


setInterval(function () {
    var iconBadgeText = "";
    var cur_roulette = getLocalStorageObj('current_roulette');
    if (cur_roulette && cur_roulette.roulette && Object.keys(cur_roulette.roulette).length !== 0) {
        var a = new Date(); // Now
        var b = new Date(cur_roulette.roulette.end_date);
        var secondsLeft = Math.floor((b - a) / 1000);
        iconBadgeText = secondsLeft + "";
    } else {
        var chatReceivedQueue = getLocalStorageObj('chatRecQueue');
        if (chatReceivedQueue.length) {
            var receivedNum = 0;
            $.each(chatReceivedQueue, function (id, val) {
                if (val.type == 'chat')
                    receivedNum++;
            });
            if (receivedNum)
                iconBadgeText = receivedNum < 11 ? (receivedNum + "") : "10+";
            else
                iconBadgeText = "";
        } else {
            iconBadgeText = "";
        }

    }
    if ((lastIconBadgeText != iconBadgeText) || (iconBadgeText == "")) {
        chrome.browserAction.setBadgeText({text: iconBadgeText});
        lastIconBadgeText = iconBadgeText;
    }
    updateSettings++;

}, 1000);

setInterval(function() {
    check();
}, 10000);

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
setLocalStorage('participants', []); // Oude manier van mensen tonen .. is nu people_v2, kan weg
setLocalStorage('people_v2', []);
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
        }
    }
    setLocalStorage('settings', settings);
}
function startRequest() {
    checkSettings();
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
var connectionTimeout = false;
function check() {
    var posCb = function (position) {
        var pos = 'la=' + position.coords.latitude + '&lo=' + position.coords.longitude; // XX SP: Note to self: Voor toekomstige positiegebasseerde roulette server ipv ip-gebaseerd. regel dat seb!!!
        setLocalStorage('pos', pos);
    };

    if (connectionTimeout == false) { // Timeout voor het connecten zodat alles kan laden :)
        connectionTimeout = setTimeout(function() { checkSocket(); }, 5000);
    }

    navigator.geolocation.getCurrentPosition(posCb);
}

function AddZero(num) {
    return (num >= 0 && num < 10) ? "0" + num : num + "";
}

// var audioMessage = new Audio("src/bg/message.wav");

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
}

function checkSettings() {
    settings = getLocalStorageObj('settings');
    var now = new Date();
    if (settings.disable_plugin != false) {
        var disabledPluginUntill = new Date(settings.disable_plugin);
        var secondsLeft = Math.floor((disabledPluginUntill - now) / 1000);
        if (secondsLeft > 0) {
            countDownDisabled();
            socket.emit('user_disabled', {disabled: settings.disable_plugin});
        } else {
            if (socket)
                socket.emit('user_disabled', {disabled: false});
            settings.disable_plugin = false;
            setLocalStorage('settings', settings);
        }
    }
}

function popupMessage(obj) {
    if (!secondsLeftDisabled)
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
                        rate: 1,
                        'enqueue': true
                    });
            }
        );
}
function replaceName(text) {
    return text.replace('{userName}', serverInfo.name);
}

function checkSocket() {
    if (lastState == 'locked' || lastState == 'idle') {
        return;
    }

    connectionTimeout = false;
    serverInfo = getLocalStorageObj('data');
    pos = getLocalStorageObj('pos');
    var query = 'apiKey=' + serverInfo.api_key + "&version=" + chrome.app.getDetails().version + '&' + pos + '&debug=' + (isDevMode() ? '1' : '0');
    if (serverInfo && serverInfo.user_id && !socket) {
        socket = io.connect('https://kantoorroulette.nl', {
            query: query,
            // path: (isDevMode()?'/socket.dev':'/socket.io'),
            path: '/socket.io',
            reconnection: true,
            timeout: 5000,
            reconnectionDelay: 10000
        });
        socket.on('new message', function (obj) {
            addChatMessage(obj);
        });
        socket.on('connect', function () {
            check();
            updateData();
        });
        // socket.on('disconnect', function () {
        //     addChatMessage({
        //         type: 'disconnect',
        //         message: 'Verbinding verbroken!',
        //         time: AddZero(new Date().getHours()) + ":" + AddZero(new Date().getMinutes())
        //     })
        // });
        socket.on('update-server-info', function (obj) {
            setLocalStorage('roulettes', obj.roulettes);
            setLocalStorage('people_v2', obj.people_v2);

        });
        socket.on('update-to-current-roulette', function (obj) {
            setLocalStorage('current_roulette', obj);
        });
        //

        socket.on('roulette_request_response', function (obj) {
            setLocalStorage('request_response', obj);
        });

        socket.on('harcoFeature', function (data) {
            if (settings.harco_feature) {

                if (data.cancel)
                    chrome.tts.stop();

                chrome.tts.speak(data.text, {
                    'lang': 'nl-NL',
                    rate: data.rate,
                    pitch: data.pitch,
                    'enqueue': true
                });

            }
        });

        socket.on('initSpinnerData', function (obj) {
            popupMessage({
                messageText: 'De roulette is gestart door ' + obj.spinner
            });
            setLocalStorage('init_spinner_data', obj);
        });

        socket.on('spinposition', function (obj) {
            if (obj.spinnerData) {
                setLocalStorage('init_spinner_data', obj.spinnerData);
                delete obj.spinnerData;
            }
            setLocalStorage('spinposition', obj);
        });


        socket.on('popupMessage', function (obj) {
            popupMessage(obj);
            updateData();
        });

        socket.on('roulette_request', function (obj) {
            if (!secondsLeftDisabled) {
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
                                var settings = getLocalStorageObj('settings');
                                if (settings.speak_new)
                                    chrome.tts.speak(replaceName(obj.ttsText), {
                                        'lang': 'nl-NL',
                                        rate: 1
                                    });
                                rouletteInfoObj[roulette_id].initialNotification = true;
                            }
                            if (obj.type == 'reminder' && !rouletteInfoObj[roulette_id].reminderNotification) {
                                var settings = getLocalStorageObj('settings');
                                if (settings.speak_reminder)
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
                                var settings = getLocalStorageObj('settings');
                                if (settings.speak_new)
                                    chrome.tts.speak("Ja, ik ook.", {
                                        'lang': 'nl-NL',
                                        rate: 1
                                    });

                                var sendObj = {
                                    roulette_id: roulette_id,
                                    reaction: "1",
                                    gamble: false
                                };

                                if (settings.gamble) {
                                    if (settings.balance >= 0.25) {
                                        sendObj.gamble = 1;
                                    }
                                }

                                socket.emit('request_response', sendObj);
                            });
                        }
                        if (buttonIndex === 1) {
                            chrome.notifications.clear(notificationId, function () {
                                var settings = getLocalStorageObj('settings');
                                if (settings.speak_new)
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
                }
            }
            //setLocalStorage('current_roulette', obj);
        });
    } else if (socket) {
        socket.io.opts.query = query;
    }
}

function addParticipantsMessage(data) {
}
function removeChatTyping(data) {
}
function addChatTyping(data) {
}

startRequest();