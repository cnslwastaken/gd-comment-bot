import axios from "axios";
import fs from "fs";
import yaml from "js-yaml";
import colors from "colors";
import { rando } from "@nastyox/rando.js";
import crypto from "crypto";

let config;
try {
    config = yaml.load(fs.readFileSync("./config.yml", "utf8"));
} catch (error) {
    console.error(`Could not load config: ${error}.`);
    process.exit(1);
}

if (config.account.username.includes(" ") || config.account.password.includes(" ")) {
    console.error(`Please update config.yml with your Geometry Dash account details.`);
    process.exit(1);
}

async function fetchAccountId(username) {
    try {
        const response = await axios.get(`https://gdbrowser.com/api/profile/${username}`);
        const data = response.data;
        if (data && data.accountID) {
            return data.accountID;
        } else {
            throw new Error(`Could not fetch accountId for ${username}.`);
        }
    } catch (error) {
        console.error(`Could not fetch accountId for ${username}: ${error}.`);
        process.exit(1);
    }
}

function encrypt(str, key) {
    return Buffer.from(xor(str, key)).toString("base64").replace(/\//g, "_").replace(/\+/g, "-");
}

function generateChk(username, comment, levelId, percent) {
    let chk = username + comment + levelId + percent + "0xPT6iUrtws0J";
    chk = sha1(chk);
    return encrypt(chk, 29481);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const accountId = await fetchAccountId(config.account.username);

    while (true) {
        try {
            const levelId = await fetchRecentLevelId();

            await delay(1000 * config.comment_upload_delay);

            const message = rando(config.messages).value.replace("{random}", randomString(config.random_length));
            const encodedMessage = Buffer.from(message).toString("base64");

            await uploadComment(accountId, message, encodedMessage, levelId);
        } catch (error) {
            console.error(`An error occurred: ${error}.`);
        }
    }
}

async function fetchRecentLevelId() {
    try {
        const response = await axios.get("https://gdbrowser.com/api/search/*?type=recent");
        const data = response.data;
        if (data && data.length > 0) {
            return data[0].id;
        } else {
            throw new Error(`Could not fetch recent levelId.`);
        }
    } catch (error) {
        throw new Error(`Could not fetch recent levelId: ${error}.`);
    }
}

async function uploadComment(accountId, message, encodedMessage, levelId) {
    try {
        const response = await axios.post("http://www.boomlings.com/database/uploadGJComment21.php", {
            secret: "Wmfd2893gb7",
            accountID: accountId,
            gjp: encrypt(config.account.password, 37526),
            userName: config.account.username,
            comment: encodedMessage,
            levelID: levelId,
            percent: config.percentage,
            chk: generateChk(config.account.username, encodedMessage, levelId, config.percentage),
        }, {
            headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": null }
        });

        const data = response.data;
        if (data == -1) {
            console.log(`Could not comment on level ${levelId} (got -1)`.red);
        } else if (typeof data === "string" && data.startsWith("temp")) {
            console.log(`${config.account.username} is banned from uploading comments: ${data}.`.red);
        } else {
            console.log(`${config.account.username} successfully commented on level ${levelId}.`.green);
        }
    } catch (error) {
        throw new Error(`Could not comment on level ${levelId}: ${error}.`);
    }
}

main().catch(error => {
    console.error(`An error occurred: ${error}.`);
    process.exit(1);
});
