const Nightmare = require('nightmare')
require('nightmare-real-mouse')(Nightmare);
const jsdom = require("jsdom");
var htmlStringify = require('html-stringify');
const { JSDOM } = jsdom;
var nexts = false;
var endfile = false;
const author = 'Holfz';
var request = require("request");
var waitUntil = require('wait-until');
var LineByLineReader = require('line-by-line'),
    lr = new LineByLineReader('accounts.txt');

console.log(`...Welcome To ${author} 2FA InboxKitten Disabler...`);
console.log('Starting Process...');
lr.on('line', function (line) {
    endfile = false
    console.log('[LBL] Reading Line And Send to RequestSteamGuardCode process.');
    lr.pause();
    var input = line;
    var inputsplit = input.split(":");
    var id = inputsplit[0];
    var pw = inputsplit[1];
    var mail = id.toLowerCase();
    RequestSteamGuardCode(id,pw,mail);
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


function RequestSteamGuardCode(id,pw,mail) {
    var nightmare = Nightmare({ show: false }) // For Debug Set it to true
    nexts = false;
    console.log(`[RequestSteamGuardCode] Start Request Code By Logging in... | ID : ${id}`)
    nightmare
    .goto('https://store.steampowered.com/login/')
    .wait('body')
    .insert('#input_username', id)
    .wait(1000)
    .insert('#input_password', pw)
    .click('button.btnv6_blue_hoverfade.btn_medium')
    .then(() => {
        console.log('[ProcessWatchdog] Let\'s wait for 10 seconds')
        setTimeout(function(){ 
            GetmailList(mail,nightmare)
            console.log('[ProcessWatchdog] Sended to GetmailList Process...')
        }, 10000);
    })
}

function GetmailList(mail,nightmare) {
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
            GetSteamGuardCode(combine,nightmare);
        } else {
            console.log('[GetSteamGuardCode] Can\'t Contact API Server..')
            nightmare.end();
            nexts = true;
        }
    });
}
    
function GetSteamGuardCode(key,nightmare) {
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
                nexts = true;
                return nightmare.end();
            }
            let SGCode = dom.window.document.querySelector("[style=\"font-size: 24px; color: #66c0f4; font-family: Arial, Helvetica, sans-serif; font-weight: bold;\"]").textContent;
            console.log('[GetSteamGuardCode] Got Steam Guard Code, Code:',SGCode)
            console.log('[GetSteamGuardCode] Continue Next Phase (DisableSteamGuardCode)')
            DisableSteamGuardCode(SGCode,nightmare)
        } else {
            console.log('[GetSteamGuardCode] Can\'t Contact API Server..')
            nightmare.end();
            nexts = true;
        }
    });
}

function DisableSteamGuardCode(Code,nightmare) {
    console.log('[DisableSteamGuardCode] Code Got. Start Filling And Disable Steam Guard...')
    nightmare
    .wait(3000)
    .evaluate(function() {
        return document.querySelector('#twofactorcode_entry');
    })
    .then(function(fa) {
        if (fa != null || fa != undefined) {
            nightmare
			.type('#twofactorcode_entry', Code)
			 .type('body', '\u000d') // press enter
			 .wait(1000)
			 .realMouseover('#success_continue_btn')
             .realClick('#success_continue_btn')
			 .wait(3000)
			 .goto('https://store.steampowered.com/twofactor/manage')
             .wait('#none_authenticator_check')
             .realClick('#none_authenticator_check')
             .wait(1000)
             .evaluate(function() {
                return document.querySelector('.btnv6_green_white_innerfade.btn_medium.button');
             })
            .then(function(continuebtn) {
               if (continuebtn != null || continuebtn != undefined) {
                nexts = true;
                 nightmare
                 .realMouseover('.btnv6_green_white_innerfade.btn_medium.button')
                 .realClick('.btnv6_green_white_innerfade.btn_medium.button')
                 .end()
                 .then(console.log('[DisableSteamGuardCode] Done.'))
               } else {
                 console.log('[DisableSteamGuardCode] Can\'t find confirm button. Possible Steam Guard Already disable. Ending...')
                 nexts = true;
                 nightmare.end();
                }
            })
        } else {
            console.log('[DisableSteamGuardCode] Can\'t find input for steam guard code. Ending...')
            nexts = true;
            return nightmare.end();
        }
    })
}
