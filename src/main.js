
import { Actor } from 'apify';
import { PuppeteerCrawler } from 'crawlee';

import { router } from './routes.js';

await Actor.init();

const input = await Actor.getInput();
let startUrls = input?.startUrls;

// modify startUrls to add userData (number of pages to crawl)
startUrls = startUrls.map(req => ({
    ...req, // keep url, method, headers from input
    userData: {
        maxCrawlPages: input?.maxCrawlPages,
    },
}));

//const proxyConfiguration = await Actor.createProxyConfiguration();


const crawler = new PuppeteerCrawler({
    //proxyConfiguration,
    requestHandler: router,
    maxRequestRetries: input?.maxRequestRetries,
    maxConcurrency: input?.maxConcurrency,
    minConcurrency: input?.minConcurrency,
    maxRequestsPerMinute: input?.maxRequestsPerMinute,
    launchContext: {
        launchOptions: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
    },
    async failedRequestHandler({ request, log }) {
        log.error(`Request ${request.url} failed too many times`);

        await Actor.setValue('failed-urls', request.url, { contentType: 'text/plain' });
    },

});

await crawler.run(startUrls);

const stats = await crawler.stats;
const calculatedStats = stats.calculate();
console.log('Crawler finished with stats:', {
    requestsTotal: calculatedStats.requestsTotal,
    requestsFinished: stats.state.requestsFinished,
    requestsFailed: stats.state.requestsFailed,
});

console.log("Summary Report:");
const data = await crawler.getData();
summaryReport(data.items);


// using crawlee puppeteer docs
await crawler.exportData("output/output.json","json");
await crawler.exportData("output/output.csv","csv");



await Actor.exit();


function summaryReport(data) {

    // --- Top 10 locations ---
    const uniqueLocations = [...new Set(data.map(item => item.location))];

    const countsLocation = uniqueLocations.map(loc => ({
        location: loc,
        count: data.filter(item => item.location === loc).length
    }));
    const topLocations = countsLocation.toSorted((a, b) => b.count - a.count).slice(0, 10);
    console.log('\nTop 10 Locations:');
    console.table(topLocations);

    // --- Top 10 companies ---
    const uniqueCompanies = [...new Set(data.map(item => item.companyName))];

    const countsCompany = uniqueCompanies.map(comp => ({
        companyName: comp,
        count: data.filter(item => item.companyName === comp).length
    }));
    const topCmpanies = countsCompany.toSorted((a, b) => b.count - a.count).slice(0, 10);

    console.log('\nTop 10 Locations:');
    console.table(topCmpanies);
}
