const puppeteer = require('puppeteer');
const creds = require('./constants');
const low = require('lowdb');
const numeral = require('numeral');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

const printers = db.get('printers').value();

async function startBrowser() {
  const browser = await puppeteer.launch({ headless: true});
  const page = await browser.newPage();
  return {browser, page};
}

async function closeBrowser(browser) {
  return browser.close();
}

const ui_type = {}

async function scrapPrinter (printer) {
  console.log(`Getting ${printer.name} counter`);
  const {browser, page} = await startBrowser();
  page.setViewport({width: 1366, height: 768});
  await page.setRequestInterception(true);

  page.on('request', (req) => {
    if(req.resourceType() == 'stylesheet' || req.resourceType() ==  'font' || req.resourceType() == 'image') {
      req.abort();
    }
    else {
      req.continue();
    }
  });
  try {
    await page.goto(printer.ip_address);
  } catch (e) {
    console.log('Printer not online', e.message);
    return
  }
  console.log(`${printer.name} is online`);

  if (!printer.cta) {
    await page.goto(printer.browse_to_address);
    let element = await page.$(printer.counter_field);
    let text = await page.evaluate(element => element.innerText, element)
    console.log(printer.name)
    console.log(numeral(text).format(0,0));
    return
  }
  if (!printer.password) {
    await page.goto(printer.ip_address);
    await page.click(printer.first_click);
    await page.click(printer.selector_user);
    await page.keyboard.type(printer.user);
    await page.click(printer.cta);
    await page.goto(printer.browse_to_address);
    let element = await page.$(printer.counter_field);
    let text = await page.evaluate(element => element.innerText, element);
    console.log(printer.name);
    console.log(numeral(text).format(0,0));
    return
  }
  await page.goto(printer.ip_address);
  await page.waitForNavigation();
  await page.click(printer.selector_user);
  await page.keyboard.type(printer.user);
  await page.click(printer.selector_password);
  await page.keyboard.type(printer.password);
  await page.click(printer.cta);
  await page.waitForSelector(printer.next_click);
  await page.click(printer.next_click);
  await page.waitForTimeout(2000);
  await page.goto(printer.browse_to_address);
  await page.waitForSelector(printer.counter_field);
  let element = await page.$(printer.counter_field);
  let text = await page.evaluate(element => element.innerText, element);
  console.log(printer.name);
  console.log(numeral(text).format(0,0));
  // await page.authenticate({'username': C.username, 'password': C.password})
  // await page.waitForNavigation();
  // await page.screenshot({path: 'calidad_p7.png'});
}

for (let printer of printers) {
  (async () => {
    await scrapPrinter(printer)
    process.exit(1);
    // await ui_type[printer.ui_type](printer);
  })();
}

/*(async () => {
  await playTest("http://192.168.170.31/machine_status.html");
  process.exit(1);
})();*/
