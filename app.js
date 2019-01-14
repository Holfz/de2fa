var SteamUser = require('steam-user'); 
var request = require('request');
const jsdom = require("jsdom");
var htmlStringify = require('html-stringify');
const { JSDOM } = jsdom;
var waitUntil = require('wait-until');
var LineByLineReader = require('line-by-line'),
    lr = new LineByLineReader('accounts.txt');


const author = "Holfz";
var nexts = false;
var endfile = false;

lr.on('line', function (line) {
    endfile = false
    nexts = false
    console.log('[LBL] Reading Line And Send to RequestSteamGuardCode process.');
    lr.pause();
    var input = line;
    var inputsplit = input.split(":");
    var username = inputsplit[0];
    var password = inputsplit[1];
    var mail = username.toLowerCase();
    SteamLogin(username,password,mail);
    waitUntil()
    .interval(1000)
    .times(Infinity)
    .condition(function() {
        if(nexts === true && endfile == false) {
            return true;
        }
    })
    .done(function(result) {
        console.log('[ProcessWatchDog] It\'s seem finished.. Starting Next account in accounts.txt LBL!!!.');
        setTimeout(function () {
            lr.resume();
        }, 10000);
    });
});

lr.on('end', function () {
    endfile = true;
	console.log('[LBL] All lines are read, accounts.txt is closed now.')
});

function SteamLogin(username,password,mail) {
    var client = new SteamUser();
    client.setOption("promptSteamGuardCode", false);


    client.logOn({
        "accountName": username,
        "password": password,
    });
    
    client.on('loggedOn', function(details) {
        console.log("[Steam] Logged into Steam as " + client.steamID);
        client.setPersona(SteamUser.EPersonaState.Online);
        nexts = false;
    });
    
    client.on('disconnected', function(eresult,msg) {
        nexts = true;
        if(eresult == 3 || eresult == '3') {
            console.log('[Steam] Disconnected')
        } else {
            console.log('[Steam] Disconnected from steam as result code', eresult)
        }
    });

    client.on('steamGuard', function(domain, callback) {
        console.log("[Steam] Steam Guard code needed from email ending in " + domain);
        nexts = false;
        console.log('[ProcessWatchdog] Let\'s wait for 10 seconds')
        setTimeout(function(){ 
            GetMailList(mail,callback)
            console.log('[ProcessWatchdog] Sended to GetmailList Process...')
        }, 10000);
    });

    
    client.on('webSession', (sessionID, cookies) => {
        console.log('[Steam] WebSession Triggered');
        let cookiejar = request.jar();
        for (let arr of cookies) {
            cookiejar.setCookie(arr, 'https://store.steampowered.com');
        }
        request({
            method: 'POST',
            uri: 'https://store.steampowered.com/twofactor/manage_action',
            jar: cookiejar,
            simple: false,
            form: {
                action: 'actuallynone',
                sessionid: sessionID
            }
        }, function (error, response, body){
            if(response.statusCode == 200 || !error) {
                console.log('[Steam] Steam guard disabled....');
                client.logOff();
            } else {
                console.log('[Steam] Error while disable steam guard... Please contact holfz or disable it by your self.');
                client.logOff();
            }
        });
    });
}

function GetMailList(mail,callback) {
    console.log('[InboxKitten-Parser] Got a Mail Request... Request to inboxkitten mail api...')
    var options = { method: 'GET',
            url: 'https://api.xforce.family/api/inboxkitten/GetList',
            qs: { recipient: mail , author: author },
            headers: 
            { 'cache-control': 'no-cache' } 
        };
    
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
        if(response.statusCode == 200) {
            console.log('[InboxKitten-Parser] Got a mail list body... Finding Url for lastest mail..')
            let bodydecode = JSON.parse(body);
            let mailkey = bodydecode[0].storage.key;
            let mailurl = bodydecode[0].storage.url;
            let urlcut = mailurl.replace(/(^\w+:|^)\/\//, '');
            let region = urlcut.split(".")[0];
            let combine = `${region}-${mailkey}`;
            GetSteamGuardCode(combine,callback);
        } else {
            console.log('[GetSteamGuardCode] Can\'t Contact API Server..')
            client.logOff();
        }
    });
}
    
function GetSteamGuardCode(key,callback) {
        console.log('[GetSteamGuardCode] Got a Code Request... Request to inboxkitten mail api...')
        var options = { method: 'GET',
            url: 'https://api.xforce.family/api/inboxkitten/GetMail',
            qs: { mailKey: key , author: author },
            headers: 
            { 'cache-control': 'no-cache' } 
        };
    
        request(options, function (error, response, body) {
        if (error) throw new Error(error);
        if(response.statusCode == 200) {
            console.log('[GetSteamGuardCode] Got a mail latest body... Parsing for steam guard code..')
            let bodydecode = JSON.parse(body);
            let mailbody = bodydecode['stripped-html'];
            var Stringify = htmlStringify(mailbody);
            const dom = new JSDOM(Stringify);
            if(dom.window.document.querySelector("[style=\"font-size: 24px; color: #66c0f4; font-family: Arial, Helvetica, sans-serif; font-weight: bold;\"]") == null) {
                console.log('[DisableSteamGuardCode] Can\'t find Steam Guard Code. Possible Steam Guard Already disable. Ending...')
                client.logOff();
            }
            let SGCode = dom.window.document.querySelector("[style=\"font-size: 24px; color: #66c0f4; font-family: Arial, Helvetica, sans-serif; font-weight: bold;\"]").textContent;
            console.log('[GetSteamGuardCode] Got Steam Guard Code, Code:',SGCode)
            console.log('[GetSteamGuardCode] Call Back To Steam')
            let fuckspace = SGCode.replace(/\s/g, ''); // FUCK THE SPACE
            callback(fuckspace)
        } else {
            console.log('[GetSteamGuardCode] Can\'t Contact API Server..')
            client.logOff();
        }
    });
}
