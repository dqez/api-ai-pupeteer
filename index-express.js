require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const stealPlugin = require('puppeteer-extra-plugin-stealth');

const cliProgress = require('cli-progress');
const express = require('express');

const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const PORT = process.env.PORT || 3000;

puppeteer.use(stealPlugin());
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


let page;
let browser;

async function getResponse(prompt) {
    if (!page) {
        throw new Error("browser page is not initialized.");
    }
    try {
        await page.evaluate(text => {
            const divPrompt = document.getElementById('prompt-textarea');
            if (divPrompt) {
                divPrompt.innerHTML = `<p>${text}</p>`;
            } else {
                console.log('❌: not found div#prompt-textarea');
                throw new Error("Prompt text-area");
            }
        }, prompt);

        console.log('FILLED PROMPT !');

        await delay(200);

        const submitButtonSelector = '#composer-submit-button';
        await page.waitForSelector(submitButtonSelector);
        await page.click(submitButtonSelector);
        console.log("Sended prompt");

        const responseIndicatorSelector = 'button[data-testid="composer-speech-button"]';
        await page.waitForSelector(responseIndicatorSelector, { timeout: 60000 });
        await delay(500);

        const content = await page.evaluate(() => {
            const responseElements = document.querySelectorAll('.flex.max-w-full.flex-col.grow');
            const lastResponse = responseElements.length > 0 ? responseElements[responseElements.length - 1] : null;
            if (lastResponse) {
                return lastResponse.innerText;
            }
            return '❌ not found response element';

        });

        return content;
    } catch (err) {
        console.error("❌ error in trycatch prompt!. Error:", err);
    }
}

async function initializeBrowser() {
    console.log('Initializing browser and logging in ...');
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar.start(100, 0);

    try {
        browser = await puppeteer.launch({
            executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            headless: false,
            args: ['--start-maximized']
        });
        bar.update(5);
        page = await browser.newPage();
        bar.update(10);

        // Điều hướng đến trang đăng nhập của ChatGPT
        await page.goto('https://chatgpt.com/auth/login', { waitUntil: 'networkidle2' });
        bar.update(20);

        // Wait for login button to appear and click it
        await page.waitForSelector('button[data-testid="login-button"]');
        await delay(500);
        await page.click('button[data-testid="login-button"]');
        bar.update(30);

        // Chờ cho trường email xuất hiện và nhập email
        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', email, { delay: 50 });

        // await delay(1000);
        await page.click('button[type="submit"]');

        bar.update(50);

        // Chờ cho trường mật khẩu xuất hiện và nhập mật khẩu
        await page.waitForSelector('input[type="password"]');
        await page.type('input[type="password"]', password, { delay: 50 });
        await delay(1000);

        await page.click('form[action="/log-in/password"] button[aria-disabled="false"]');
        bar.update(70);

        // Chờ hoàn tất quá trình đăng nhập
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Kiểm tra và thông báo đăng nhập thành công
        bar.update(90);
        bar.update(100);
        bar.stop();
        console.log("✅ Login successfull");
    } catch (err) {
        bar.stop();
        console.error("❌ Login failed:", err);
        process.exit(1);
    }
}

async function startApi() {
    await initializeBrowser();

    const app = express();
    app.use(express.json());
    app.post('/chat', async (req, res) => {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'missing "prompt" in request body' });
        }

        console.log('receied prompt!');

        try {
            const response = await getResponse(prompt);
            console.log('sendding response!');
            res.json({ response });
        } catch (error) {
            console.error(`--- Error processing prompt "${prompt}":`, error.message);
            res.status(500).json({ error: `failed to get response from CHAT: ${error.message}` });
        }
    });

    app.get('/checkrun', (req, res) => {
        res.json({ status: 'API is running', loggedIn: !!page });
    });

    app.listen(PORT, () => {
        console.log(`🚀 ChatGPT API server listening on http://localhost:${PORT}`);
        console.log(`   Send POST requests to http://localhost:${PORT}/chat`);
        console.log(`   Request body example: { "prompt": "Your question here" }`);
    });

    process.on('SIGINT', async () => {
        console.log("shuting down server and closing browser...");
        if (browser) {
            await browser.close();
        }
        process.exit(0);
    })
}

startApi();