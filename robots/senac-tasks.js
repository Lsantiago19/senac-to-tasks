const puppeteer = require('puppeteer');

async function robot () {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
    });
    
    try {
        const page = await browser.newPage();

        await page.goto(url);
    }
    catch(e) {
        throw e;
    }
    finally {
        await browser.close();
    }
}


module.exports = robot;