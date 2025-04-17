require('dotenv').config();

const puppeteer = require('puppeteer-extra');
const stealPlugin = require('puppeteer-extra-plugin-stealth');
const readline = require('readline');
const cliProgress = require('cli-progress');

const email = process.env.EMAIL;
const password = process.env.PASSWORD;

puppeteer.use(stealPlugin());
const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));



// Function to get user input from terminal
function getUserInput(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

(async () => {
    bar.start(100, 0);
    const browser = await puppeteer.launch({
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: false,
        args: ['--start-maximized']
    });
    bar.update(5);
    const page = await browser.newPage()
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
    await page.click('input[type="submit"]');
    bar.update(50);

    // Chờ cho trường mật khẩu xuất hiện và nhập mật khẩu
    await page.waitForSelector('input[type="password"]');
    await page.type('input[type="password"]', password, { delay: 50 });
    await delay(1000);

    await page.click('button[type="submit"]');
    bar.update(70);

    // Chờ hoàn tất quá trình đăng nhập
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Kiểm tra và thông báo đăng nhập thành công
    bar.update(90);
    bar.update(100);
    bar.stop();
    console.log("Login successfull");

    await page.waitForSelector('#prompt-textarea')

    let continueChat = true;

    while (continueChat) {
        // Get user input from terminal
        const userPrompt = await getUserInput('🗣️: ');

        await page.evaluate((text) => {
            const divPrompt = document.getElementById('prompt-textarea');
            if (divPrompt) {
                divPrompt.innerHTML = `<p>${text}</p>`;
            } else {
                console.error('💀 NOTFOUND divID: prompt-textarea');
            }
        }, userPrompt);

        console.log('🤩REPLACED CONTENT!');
        await page.click('#composer-submit-button');

        await page.waitForSelector('button[data-testid="composer-speech-button"]');
        const content = await page.evaluate(() => {
            const elements = document.querySelectorAll('.flex.max-w-full.flex-col.grow');
            const divContent = elements.length > 0 ? elements[elements.length - 1] : null;
            if (divContent) {
                return divContent.innerText;
            }
            return '💀 NOTFOUND \'.flex.max-w-full.flex-col.grow!!\'';
        });

        console.log(`🐮:
              ${content}`);

        // Check if user wants to exit
        if (userPrompt.toLowerCase() === "") {
            continueChat = false;
            console.log("Exiting chat...");
        }
    }

    await browser.close();
})();