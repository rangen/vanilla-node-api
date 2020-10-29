const config = require('./config');

const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');


const server = http.createServer((req, res)=>{
    unifiedServer(req, res);
});

server.listen(config.httpPort, ()=>{
    console.log(`HTTP server started`);
});

const options = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
}

const secureServer = https.createServer(options, (req, res)=>{
    unifiedServer(req, res);
})


secureServer.listen(config.httpsPort, ()=>{
    console.log('HTTPS server started')
})



const handlers = {};

handlers.sample = (data, callback) => {
    callback(406, {'name' : 'sample handler'})
}

handlers.notFound = (data, callback) => {
    callback(404)
}

const router = {
    'sample':   handlers.sample
}

const unifiedServer = (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');
    const method = req.method.toLowerCase();

    const queryStringObject = parsedUrl.query;
    const headers = req.headers;

    var decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', data => {
        buffer += decoder.write(data);
    });

    req.on('end', ()=> {
        buffer += decoder.end();
 
        const chosenHandler = router[trimmedPath] || handlers.notFound

        const data = {
            'trimmedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'buffer' : buffer
        }

        chosenHandler(data, (statusCode, payload) => {
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            payload = typeof(payload) == 'object' ? payload : {};

            const payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
        });
    });
}