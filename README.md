# Elevon.io Internship Assignment

## Overview
This project is part of the Elevon.io Internship Assignment. It is designed to demonstrate web crawling, data extraction, and processing using Node.js. The project includes scripts to crawl listings from web pages and store the results in structured formats.

## Features
- Web crawler for extracting job listings from (https://www.profesia.sk/)
- Data storage in JSON and CSV formats
- Modular code structure for easy extension
- Docker support for containerized execution

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (Node package manager)
- Docker (optional, for containerized runs)

### Overview
This project is based on the template [Crawlee + Puppeteer + Chrome](https://apify.com/templates/js-crawlee-puppeteer-chrome) provided from Apify.


### Installation

1. Clone the repository:
	```sh
	git clone https://github.com/theone25/Elevon.io-Internship-Assignment.git
	cd Elevon.io-Internship-Assignment
	```
2. Install dependencies:
	```sh
	npm i
	```

### Running the crawler
To run the crawler:
```sh
npm start
```

### Setting Up Environment Variables
To set up environment variables, there are three options:
- Using dotenv and including the variables in a `.env` file.
- Using the provided option to include environment variables in `actor.json` file or Apify console. This option is not suitable as it only works if you run the project using Apify CLI.

    Example:
    ```json
    "environmentVariables": {
        "MAX_PAGES": "1",
        "CONCURRENCY_MIN": "5",
        "CONCURRENCY_MAX": "10"
    }
    ```
- Using the `input_schema.json` file to set up variables that can be accessed locally.

    Example:
    ```json
    {
        "maxCrawlPages": 1,
        "maxConcurrency": 10,
        "minConcurrency": 1
    }
    ```
To be in compliance with the assignment requirements, we opted to set up the variables in the [`INPUT.json`](storage/key_value_stores/default/INPUT.json) file.

#### Setting up the maximum number of pages to crawl
The maxCrawlPages takes integer values with a minimum value of 0.
To specify unlimited number of pages, use the value 0, else you can specify the number of pages to crawl.
    Example:
        ```json
        {
            "maxCrawlPages": 10,
        }
        ```

#### Setting up concurrency
Similar to maxCrawlPages, Concurrency can be set up by changing the values `minConcurrency` and `maxConcurrency`.
For my use case, I went with a minimum concurrency of 3 and a maximum of 10 as to not be heavy on ressources.
    Example:
        ```json
        {
            "maxConcurrency": 10,
            "minConcurrency": 3
        }
        ```

#### Retrying
In a similar fashion, Retrying can be setup by using `maxRequestRetries`.

#### Handling Robots.txt file
We have made use of Crawlee Puppeteer option of `respectRobotsTxtFile`. when set to true, the crawler will automatically try to fetch the robots.txt file for each domain, and skip those that are not allowed.
    Example:
        ```json
        {
            "respectRobotsTxtFile": true
        }
        ```

### Handling Data

#### De-Duping
As it is almost a certainty to have a JobId available, we do not need to fallback on the JobUrl for De-duping.
It was setup at in [`routes.js`](src/routes.js). We used a SET to store viewed ID's and check if an ID is not already stored before pushing data to the Dataset.

#### Validating Data
To validate the data before storing it, we rely on [`dataset_schema.json`](/.actor/dataset_schema.json) to validate our data,
as for handling exceptions, we user a try-catch block to capture errors and we log them using Crawlee based logger instance log.

### Rate-limit setup
To manage Rate-limit, we can use either Crawlee `createProxyConfiguration()` function to distribute requests across different IP addresses, or by setting limits such as `maxRequestsPerMinute` directly in the crawler configuration.

## Output

- Results are saved in [`jobs.json`](/output/jobs.json) and [`jobs.csv`](/output/jobs.csv) in the [`output`](/output) folder

## Summary Report

When the run ends, we print a small summary repport that inludes:
- Total number of request that were made.
- Total number of requests successfully finished.
- Total number of failed requests.

We also print some statistics:
- Top 10 companies with the most job offers.
- Top 10 locations.

