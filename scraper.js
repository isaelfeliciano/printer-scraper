const puppeteer = require('puppeteer');
const C = require('./constants');
const USERNAME_SELECTOR = '#login-email';
const PASSWORD_SELECTOR = '#login-password';
const CTA_SELECTOR = '#login-submit';

async function startBrowser() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  return {browser, page};
}

async function closeBrowser(browser) {
  return browser.close();
}

async function playTest(url) {
  const {browser, page} = await startBrowser();
  page.setViewport({width: 1366, height: 768});
  await page.authenticate({'username': C.username, 'password': C.password})
  await page.goto(url);
  /*await page.click(USERNAME_SELECTOR);
  await page.keyboard.type(C.username);
  await page.click(PASSWORD_SELECTOR);
  await page.keyboard.type(C.password);
  await page.click(CTA_SELECTOR);*/
  // await page.waitForNavigation();
  let element = await page.$('div.msts:nth-child(12) > table:nth-child(1) > tbody:nth-child(2) > tr:nth-child(1) > td:nth-child(2)');
  let text = await page.evaluate(element => element.textContent, element);
  console.log(text);
  // await page.screenshot({path: 'calidad_p7.png'});
}

(async () => {
  await playTest("http://192.168.170.31/machine_status.html");
  process.exit(1);
})();