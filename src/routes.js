
import { createPuppeteerRouter, Dataset } from 'crawlee';

export const router = createPuppeteerRouter();

let seenJobs = new Set();

// Listings page handler (default)
router.addDefaultHandler(async ({ request, log, enqueueLinks }) => {
    log.info(`getting listings page: ${request.url}`);

    // Enqueue links to job detail pages
    await enqueueLinks({
        selector: '.list-row h2 a',
        label: 'JOB',
    });

    const maxPages = request.userData.maxCrawlPages;
    // Handle pagination
    if (maxPages === 0) {
        await enqueueLinks({
            selector: 'a.next',
        });
    } else{
        const currentPage = request.userData.page || 1;
        console.log(`Current page: ${currentPage}`);
        if (currentPage < maxPages) {
            console.log("maxcraawlpages is: ",maxPages);
            await enqueueLinks({
                selector: 'a.next',
                transformRequestFunction: (req) => {
                    req.userData.page = currentPage + 1; // track pagination depth
                    req.userData.maxCrawlPages = maxPages; // carry over maxCrawlPages
                    return req;
                },
            });
        }
    }

});



// Job detail handler
router.addHandler('JOB', async ({ page, request, log }) => {

    log.info(`Extracting job detail: ${request.url}`);

    let data = await page.evaluate(() => {
        function checkSeniorityLevel(desc_text,title_text){

            if (title_text){

                title_text = title_text.replace(/\s+/g, ' ').toLowerCase();

                let match = title_text.match(/(junior|juniora|juniorný|juniorna|juniorne|juniorní)/i);
                if (match) return match[0];

                match = title_text.match(/(senior|seniora|seniorný|seniorna|seniorne|seniorní)/i);
                if (match) return match[0];

                match = title_text.match(/(mid[- ]?level|mid[- ]?senior)/i);
                if (match) return match[0];

                match = title_text.match(/(lead|leadera|leadný|leadna|leadne|leadní)/i);
                if (match) return match[0];

                match = title_text.match(/(intern |internship|stážista|stážistka|stáž)/i);
                if (match) return match[0];
            }

            if (!desc_text) return null;

            text = desc_text.replace(/\s+/g, ' ').toLowerCase();

            // case of explicit "Počet rokov praxe X"
            let match = text.match(/počet rokov praxe\s*(\d+)/i);
            if (match) return `${match[1]} years`;

            // case of "min. X rokov"
            match = text.match(/min\.?\s*(\d+)\s*rok/);
            if (match) return `${match[1]} years`;

            // case of "X-Y rokov"
            match = text.match(/(\d+)\s*[-–]\s*(\d+)\s*rok/);
            if (match) return `${match[1]}-${match[2]} years`;

            // case of "X rokov praxe"
            match = text.match(/(\d+)\s*rok/);
            if (match && !text.includes("vek")) return `${match[1]} years`;

            return null;
        }

        function getSalary(salary){

            const regex = /([\d\s.,]+)(?:\s*-\s*([\d\s.,]+))?\s*([^\d\s\/]+)\/([^\s]+)/;

            const match = salary.match(regex);
            let [, minStr, maxStr, currency, period] = match;

            const minSalary = minStr.replace(/\s/g, '');
            const maxSalary = maxStr ? maxStr.replace(/\s/g, '') : minSalary;

            salary = [minSalary,maxSalary,currency,period];

            return salary;
        }

        try {
            //no need to add multiple query selectors as they are all the same

            // from the header
            const jobUrl = document.querySelector("link[rel='canonical']")?.href;

            // from the overall footer
            let postedAt = document.querySelector('span[itemprop="datePosted"]')?.innerText.trim();
            postedAt = new Date(postedAt).toISOString();

            const jobId = document.querySelector(".overall-info")?.innerText.split(" ")[1].trim();

            const companyUrl = document.querySelector(".overall-info a:last-of-type")?.href;

            const description = document.querySelector(".nafta-offer-box-wrapper-text ul")?.innerText ||
                document.querySelector('div.details-desc')?.innerText ||
                document.querySelector(".mcdonald-detail-section-white-box")?.innerText.trim() ||
                document.querySelectorAll(".co-content h3 + ul")[0]?.innerText.trim() ||
                null;


            // there might be issues detecting different layouts in some job listings
            const jobTitle = document.querySelector('h1[itemprop="title"]')?.innerText.trim() ||
                document.querySelector('h1')?.innerText.trim();

            const companyName = document.querySelector('h2[itemprop="hiringOrganization"]')?.innerText.trim() ||
                document.querySelector('h2')?.innerText ||
                document.querySelector(".overall-info a:last-of-type")?.innerText.trim();

            const location = document.querySelector('span[itemprop="address"]')?.innerText.trim() ||
                document.querySelector(".upper-info-box-item-regions .upper-info-box-desc")?.children[1]?.innerText.trim() ||
                document.querySelectorAll(".overall-info a")[0]?.innerText.trim() ||
                document.querySelector(".primabanka-container .panel-body div")?.firstElementChild?.lastElementChild?.innerText.trim() ||
                document.querySelectorAll(".telekom-upper-info-box-item")[1]?.lastElementChild?.lastElementChild?.innerText.trim() ||
                document.querySelectorAll(".co-info div")[0]?.innerHTML?.split("</strong>")[1]?.trim() ||
                null;

            // use of regex to check the salary and return available info
            // in case there is not a range, both min and max will have the same value
            let salary = document.querySelector('.salary-range')?.innerText ||
                document.querySelectorAll(".nafta-upper-info-box-item")[1]?.lastElementChild?.innerText ||
                document.querySelectorAll(".telekom-upper-info-box-item")[3]?.lastElementChild?.lastElementChild?.innerText.trim() ||
                 document.querySelector('.overall-info')?.innerHTML.split("</strong>").toReversed()[0].trim() ||
                null;
            salary = getSalary(salary);

            const employmentType = document.querySelector('span[itemprop="employmentType"]')?.innerText.trim() ||
                document.querySelector(".upper-info-box-item-jobtype .upper-info-box-desc")?.children[1]?.innerText.trim() ||
                document.querySelector(".primabanka-container .panel-body div")?.lastElementChild?.lastElementChild?.innerText.trim() ||
                document.querySelectorAll(".nafta-upper-info-box-item")[2]?.lastElementChild?.innerText.trim() ||
                document.querySelectorAll(".telekom-upper-info-box-item")[0]?.lastElementChild?.lastElementChild?.innerText.trim() ||
                document.querySelectorAll(".co-info div")[1]?.innerHTML?.split("</strong>")[1]?.trim() ||
                null;




            // there is no skills tags that I could find, thus I return the text for the job requirements
            const tags_skills = document.querySelector(".nafta-container .mb-8")?.innerText.trim() ||
                document.querySelector('.bg-gray .details-section')?.innerText.trim() ||
                document.querySelectorAll('.zssk-container .job-info .details-desc')[2]?.innerText.trim() ||
                document.querySelectorAll(".co-content h3 + ul")[1]?.innerText.trim() ||
                document.querySelector(".job-requirements")?.innerText.trim();

            // the seniority level is not clearly defined, sometimes  it is included in the text.
            // a simple solution is to use regex to match the text content with regex
            // another option is to use the job name to check the seniority level (Junior, Senior, ... )
            let seniority = document.querySelector(".job-info")?.innerText ||
                tags_skills;
            seniority = checkSeniorityLevel(seniority,jobTitle);

            data = { jobTitle, companyName, location, salary, employmentType, seniority, tags_skills, postedAt, jobId, jobUrl, companyUrl, description}
            return { success: true, data };
        } catch (error) {
            return { success: false, error: `Exception occurred while extracting data: ${error.message}` }
        }
    });

    data.url = request.url;


    // Push into dataset
    if (result.success) {
        if (seenJobs.has(result.data.jobId)) {
            log.warning(`Duplicate job found: ${result.data.jobId}, skipping...`);
            return;
        } else {
            seenJobs.add(result.data.jobId);
            await Dataset.pushData(result.data);
        }

    } else  {
        log.error(`Error extracting data: ${result.error}`);
    }


});

