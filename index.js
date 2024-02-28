/*
    uwu~ i see u like looking at my code, u can sure do that, but make sure to credit me if u re-use my project ^^
    -cnsl
*/

import axios from "axios";
import fs from "fs";
import yaml from "js-yaml";
import colors from "colors";
import { rando } from "@nastyox/rando.js";
import crypto from "crypto";

console.clear();
console.log("Made with love by cnsl - discord.gg/robtopgames\n".bgMagenta);
console.log("Warning: If you abuse this tool, GD Mods ".red + "WILL".white.bgRed + " ban your account, you might wanna use a VPN and/or an alternative account\n".red);

// Pre-define config
let config;

try {
    config = yaml.load(fs.readFileSync("./config.yml", "utf8"));
}
catch(error) {
    throw new Error(`Could load config, make sure it's formatted correctly:\n${error}`);
}

// Check if the account is valid
if(config.account.username.includes(" ") || config.account.password.includes(" ")) {
    throw new Error(`I think you forgot to change the default config and add your Geometry Dash account inside config.yml ^^`);
}

// Pre-difine accountId
let accountId;

// Fetch accountId, we need it to comment but i didn't want to add it in the config as it would have made the bot more complicated to use
try {
    // I know the api is deprecated, but hey, who cares it works and it's simpler
    const response = await axios.get(`https://gdbrowser.com/api/profile/${config.account.username}`);
    const data = response.data;

    // Check if the data contains the accountId (it always should but we can't 100% trust an external API)
    if(data && data.accountID) {
        accountId = data.accountID;
    }
    else {
        throw new Error(`Could not fetch accountId (missing?):\n\n${JSON.stringify(data, null, 2)}`);
    }
}
catch(error) {
    throw new Error(`Could not fetch accountId seems like the username in the config is not valid`);
}

console.log(`Fetched accountId with success: ${accountId}`.green);

// Define the xor function used to generate the gjp
function xor(str, key) {
    return String.fromCodePoint(...str.split("").map((char, i) => char.charCodeAt(0) ^ key.toString().charCodeAt(i % key.toString().length)));
}

// Define the xor function used to generate the chk
function sha1(data) {
    return crypto.createHash("sha1").update(data, "binary").digest("hex");
}

// Define the encrypt function used to generate the gjp and chk
function encrypt(str, key) {
    return Buffer.from(xor(str, key)).toString("base64").replace(/\//g, "_").replace(/\+/g, "-");
}

const gjp = encrypt(config.account.password, 37526);

// Define the generateChk function used to generate... guessed it? The chk!
function generateChk(username, comment, levelId, percent) {
    let chk = username + comment + levelId + percent + "0xPT6iUrtws0J"
    chk = sha1(chk)
    chk = encrypt(chk, 29481)
    return chk
}

// Define a delay function, it will be used to wait for a certain time
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Define a randomString function, it will be used to generate random strings to add in comments
const randomString = (length) => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomString = '';
    for (let i = 0; i < length; i++) {
        randomString += rando(charset);
    }
    return randomString;
};

// Main loop
while(true) {

    // Pre-define the levelId which the bot will comment on later
    let levelId;

    try {
        const response = await axios.get("https://gdbrowser.com/api/search/*?type=recent");
        const data = response.data;

        if(data && data.length > 0) {
            levelId = data[0].id;
        }

    }
    catch(error) {
        throw new Error(`Could not fetch recent tab (GDBROWSER API DOWN?)`);
    }

    console.log(`Fetched levelId with success: ${levelId}`.green);
    console.log(`${config.account.username} will comment on level ${levelId} in ${config.comment_upload_delay} seconds`)

    await delay(1000 * config.comment_upload_delay);

    // Get a message to send and replace {random} with a random string of the specified length
    const message = (rando(config.messages).value).replace("{random}", randomString(config.random_length));

    const encodedMessage = Buffer.from(message).toString("base64"); // Encode the comment to base64 (not url safe because idk it's broken)

    // We're actually sending a request to the real GD-api 😎
    try {
        const response = await axios.post("http://www.boomlings.com/database/uploadGJComment21.php", {
            secret: "Wmfd2893gb7",
            accountID: accountId,
            gjp: gjp,
            userName: config.account.username,
            comment: encodedMessage,
            levelID: levelId,
            percent: config.percentage,
            chk: generateChk(config.account.username, encodedMessage, levelId, config.percentage),
        },
        {
            headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": null }
            // Geometry Dash server forces you to set your User-Agent as null
        });

        const data = response.data;

        if(data) {
            if(data == -1) {
                console.log(`Could not comment on level ${levelId} (got -1)`.red);
            }
            else if(typeof data === "string" && data.startsWith("temp")) {
                console.log(`${config.account.username} is banned from uploading comments: ${data}`.red);
            }
            else {
                console.log(`${config.account.username} successfully commented on level ${levelId}`.green);
            }
        }
    }
    catch(error) {
        console.log(`Could not comment on level ${levelId}`.red);
        console.log(error);
    }
}