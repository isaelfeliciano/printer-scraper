const numeral = require('numeral');
const log4js = require('log4js');
log4js.configure({
  appenders: { scraper: { type: "file", filename: "scraper.log" } },
  categories: { default: { appenders: ["scraper"], level: "error" } }
})

const logger = log4js.getLogger("scraper");
logger.level = 'debug';

// Socket.io Server

const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer, {
  cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
});


io.on('connection', (socket) => {
  logger.info('watcher app is connected')

  socket.on("collectCounters", async (printers) => {
    await forLoop(printers)
    logger.info("Coleccion de contadores completada")
  })
});

httpServer.listen(4000);

// Scraper logic
var path = require('path');
logger.info(process.cwd())
if (process.pkg) {
  var puppeteer = require(path.resolve(process.cwd(), 'puppeteer'));
} else {
  var puppeteer = require('puppeteer');
}

// const printers = [];
// let printers = db.get('printers').value();
// printers.push(printerslist);

async function startBrowser() {
  const browser = await puppeteer.launch({ headless: true});
  const page = await browser.newPage();
  return {browser, page};
}

async function closeBrowser(browser) {
  return browser.close();
}

async function scrapPrinter (printer) {
  logger.info(`Getting ${printer.name} counter`);
  io.sockets.emit("statusUpdate", `Getting ${printer.name} counter`);
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
    logger.info('Printer not online', e.message);
    io.sockets.emit("updateCounter", {
      _id: printer._id,
      counter: "desconectado",
      toner: "desconectado"
    });
    return
  }
  logger.info(`${printer.name} is online`);
  io.sockets.emit("statusUpdate", `${printer.name} is online`);

  if (!printer.cta) {
    logger.info('Method 1');
    if (printer.status_page) {
      await page.goto(`${printer.ip_address}/${printer.status_page}`);
      await page.waitForSelector(printer.toner_field);
      let element = await page.$(printer.toner_field);
      var toner = await page.evaluate(element => element.textContent, element);
    }
    await page.goto(printer.browse_to_address);
    await page.waitForSelector(printer.counter_field);
    if (typeof toner === "undefined") {
      let element = await page.$(printer.toner_field);
      var toner = await page.evaluate(element => element.textContent, element)
    }
    element = await page.$(printer.counter_field);
    let text = await page.evaluate(element => element.textContent, element)
    text = text.replace(':', '');
    logger.info(printer.name, ': ' + numeral(text).format(0,0));
    logger.info(toner)
    io.sockets.emit("updateCounter", {
      _id: printer._id,
      counter: numeral(text)._value,
      toner: toner,
      method: "method 1"
    });
    closeBrowser(browser);
    return
  }
  if (!printer.password) {
    logger.info('Method 2');
    await page.goto(printer.ip_address);
    // await page.waitForNavigation();
    await page.waitForSelector(printer.selector_user);
    await page.click(printer.first_click);
    await page.click(printer.selector_user);
    await page.keyboard.type(printer.user);
    await page.click(printer.cta);
    await page.waitForTimeout(2000);
    let element = await page.$(printer.toner_field);
    let toner = await page.evaluate(element => element.innerText, element);
    await page.goto(printer.browse_to_address);
    await page.waitForSelector(printer.counter_field);
    element = await page.$(printer.counter_field);
    let text = await page.evaluate(element => element.innerText, element);
    logger.info(printer.name, ': ' + numeral(text).format(0,0));
    logger.info(toner);
    io.sockets.emit("updateCounter", {
      _id: printer._id,
      counter: parseInt(text),
      toner: toner,
      method: "method 2"
    });
    closeBrowser(browser);
    return
  }
  logger.info('Method 3');
  await page.goto(printer.ip_address);
  await page.waitForNavigation();
  if (printer.first_click)
    await page.click(printer.first_click);
  await page.click(printer.selector_user);
  await page.keyboard.type(printer.user);
  await page.click(printer.selector_password);
  await page.keyboard.type(printer.password);
  await page.click(printer.cta);
  if (!printer.status_page) {
    await page.waitForSelector(printer.toner_field)
    let element = await page.$(printer.toner_field);
    var toner = await page.evaluate(element => element.innerText, element);
  }
  if (printer.next_click) {
    await page.waitForSelector(printer.next_click);
    await page.click(printer.next_click);
  }
  await page.waitForTimeout(2000);
  await page.goto(printer.browse_to_address);
  await page.waitForSelector(printer.counter_field);
  if (typeof toner === "undefined") {
    element = await page.$(printer.toner_field);
    var toner = await page.evaluate(element => element.innerText, element); 
  }
  element = await page.$(printer.counter_field);
  let text = await page.evaluate(element => element.innerText, element);
  logger.info(printer.name, ': ' + numeral(text).format(0,0));
  logger.info(toner)
  io.sockets.emit("updateCounter", {
    _id: printer._id,
    counter: parseInt(text),
    toner: toner,
    method: "method 3"
  })
  closeBrowser(browser);
}

const forLoop = async printers => {
  for (let i = 0; i < printers.length; i++) {
    const printer = printers[i];
    await scrapPrinter(printer);
  }
  io.sockets.emit("statusUpdate", "completada")
  // process.exit(1);
}
// forLoop();
