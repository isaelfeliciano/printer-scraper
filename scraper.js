const puppeteer = require('puppeteer');
const creds = require('./constants');
const low = require('lowdb');
const numeral = require('numeral');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

const printers = db.get('printers').value();

async function startBrowser() {
  const browser = await puppeteer.launch({ headless: false});
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
    console.log('Method 1');
    await page.goto(printer.browse_to_address);
    await page.waitForSelector(printer.counter_field);
    let element = await page.$(printer.counter_field);
    let text = await page.evaluate(element => element.textContent, element)
    text = text.replace(':', '');
    console.log(printer.name, ': ' + numeral(text).format(0,0));
    closeBrowser(browser);
    return
  }
  if (!printer.password) {
    console.log('Method 2');
    await page.goto(printer.ip_address);
    await page.waitForNavigation();
    await page.click(printer.first_click);
    await page.click(printer.selector_user);
    await page.keyboard.type(printer.user);
    await page.click(printer.cta);
    await page.waitForTimeout(2000);
    await page.goto(printer.browse_to_address);
    await page.waitForSelector(printer.counter_field);
    let element = await page.$(printer.counter_field);
    let text = await page.evaluate(element => element.innerText, element);
    console.log(printer.name, ': ' + numeral(text).format(0,0));
    closeBrowser(browser);
    return
  }
  console.log('Method 3');
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
  console.log(printer.name, ': ' + numeral(text).format(0,0));
  closeBrowser(browser);
}

const forLoop = async _ => {
  for (let i = 0; i < printers.length; i++) {
    const printer = printers[i];
    await scrapPrinter(printer);
  }
  process.exit(1);
}
forLoop();