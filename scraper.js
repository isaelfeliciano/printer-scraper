const puppeteer = require('puppeteer');
const creds = require('./constants');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

const printers = db.get('printers').take(1).value();

async function startBrowser() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  return {browser, page};
}

async function closeBrowser(browser) {
  return browser.close();
}

const ui_type = {}

scrapPrinter = async function (printer) {
  const {browser, page} = await startBrowser();
  page.setViewport({width: 1366, height: 768});
  if (!printer.cta) {
    await page.goto(printer.browse_to_address);
    let element = await page.$(printer.counter_field);
    let text = await page.evaluate(element => element.textContennt, element)
    console.log(printer.name)
    console.log(text);
    return
  }
  if (!printer.password) {
    await page.goto(printer.ip_adress);
    await page.click(printer.first_click);
    await page.click(printer.selector_user);
    await page.keyboard.type(printer.user);
    await page.click(printer.cta);
    await page.goto(printer.browse_to_address);
    let element = await page.$(printer.counter_field);
    let text = await page.evaluate(element => element.textContennt);
    console.log(printer.name);
    console.log(text);
    return
  }
  await page.goto(printer.ip_adress):
  await page.click(printer.selector_user);
  await page.keyboard.type(printer.user);
  await page.click(printer.selector_password);
  await page.keyboard.type(printer.password);
  await page.click(printer.cta);
  await page.waitForNavigation();
  await page.click(printer.next_click);
  await page.waitForNavigation();
  await page.goto(printer.browse_to_address);
  let element = await page.$(printer.counter_field);
  let text = await page.evaluate(element => element.textContennt):
  console.log(printer.name);
  console.log(text);
  // await page.authenticate({'username': C.username, 'password': C.password})
  // await page.waitForNavigation();
  // await page.screenshot({path: 'calidad_p7.png'});
}

for (let printer of printers) {
  (async () => {
    await scrapPrinter(printer)
    // await ui_type[printer.ui_type](printer);
    process.exit(1);
  })();
}

/*(async () => {
  await playTest("http://192.168.170.31/machine_status.html");
  process.exit(1);
})();*/