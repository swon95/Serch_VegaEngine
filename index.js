// parsing dependencies
const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");

// fetch-url
const baseURL = "https://en.wikipedia.org";

let DBList = {
    // url == key
    "https://en.wikipedia.org/wiki/Computer": {
        title: "Computer",
        keywords: ["computer", "hardware", "software"],
        score: 1, // Increments by 1 each it reference.
    },
};

let queue = [];
let visited = 0;

const crawl = async (url) => {
    console.log("fetch URL: ", url);

    try {
        var htmlDocs = await axios.get(url);
    } catch (error) {
        await startNextQueue();
        return;
    }

    // exception handling
    if (!htmlDocs.data) {
        console.log("HTML docs is not parsing");
        await startNextQueue();
        return;
    }

    // $ == jQuery convention
    const $ = cheerio.load(htmlDocs.data);
    const links = $("a"); // a tag parsing
    // refactor => h1 태그 뿐만 아니라 p 태그도 같이 요청 시 추가적인 데이터 파싱 가능
    const title = $("h1").text();

    if (DBList[url]) {
        DBList[url].score += 1;
    } else {
        DBList[url] = {
            title,
            score: 1,
        };
    }

    links.each((index, element) => {
        const href = $(element).attr("href");

        // exception handling
        if (!href) return;

        // 만약, href 가 http:// 또는 https:// 로 시작한다면 새로운 URL 로 인식하여
        // crawl 함수 호출
        if (href.startsWith("http://") || href.startsWith("https://")) {
            // 이미 방문했다면 실행 x
            checkAlreadyVisited(href);

            return;
        }

        // 그렇지 않은 경우 현재 URL 의 경로를 기준으로 새로운 URL 을 만들어줘야함
        // ex) 현재 URL 이 https://en.wikipedia.org/wiki/Computer 이고,
        // href 가 /wiki/Computer_science 라면,
        // https://en.wikipedia.org/wiki/Computer_science 로 만들어줘야함

        // const originURL = url.slice(0, url.lastIndexOf('/'))
        const originURL = new URL(url).origin;
        const newURL = originURL + href;
        checkAlreadyVisited(newURL);
    });

    if (queue[visited]) {
        await startNextQueue();
    } else {
        console.log("크롤링 종료");
        console.log(DBList);
    }
};

// 중복된 코드 제거 후 함수 생성 => 이미 방문한 사이트라면 큐에 push x
const checkAlreadyVisited = (href) => {
    if (!DBList[href]) {
        queue.push(href);
    }
};

// queue 에 있는 다음 사이트 방문
const startNextQueue = async () => {
    await timeOut();
    crawl(queue[visited]);
    visited += 1;
    if (visited % 10 === 0) {
        storeDB();
    }
};

// create interval
const timeOut = () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 500);
    });
};

// create parsing data file
const storeDB = () => {
    const json = JSON.stringify(DBList);
    fs.writeFileSync("./db.json", json);
};

crawl(baseURL);
