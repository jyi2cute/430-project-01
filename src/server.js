const fs = require('fs');

const http = require('http');
const query = require('querystring');

const htmlHandler = require('./htmlResponses.js');
const jsonHandler = require('./jsonResponses.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

try {
  const booksData = JSON.parse(fs.readFileSync('./src/books.json', 'utf8'));

  jsonHandler.loadData(booksData);
} catch (e) {
  jsonHandler.loadData({ books: [] });
}

const parseBody = (request, response, handler) => {
  const body = [];

  request.on('error', (err) => {
    console.dir(err);
    response.statusCode = 400;
    response.end();
  });

  request.on('data', (chunk) => {
    body.push(chunk);
  });

  request.on('end', () => {
    const bodyString = Buffer.concat(body).toString();
    request.body = query.parse(bodyString);

    handler(request, response);
  });
};

const handlePost = (request, response, parsedUrl) => {
  const { pathname } = parsedUrl;
  if (pathname === '/api/books') {
    return parseBody(request, response, jsonHandler.addBook);
  }

  if (pathname.startsWith('/api/books')) {
    const title = pathname.split('/')[3];
    if (title) {
      request.params = { title };
      return parseBody(request, response, jsonHandler.editBook);
    }
  }

  return htmlHandler.get404(request, response);
};

const handleGet = (request, response, parsedUrl) => {
  const { pathname, searchParams } = parsedUrl;

  const params = Array.from(searchParams.entries()).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

  if (pathname.endsWith('.css')) {
    return htmlHandler.getCSS(request, response);
  }
  if (pathname === '/') {
    return htmlHandler.getIndex(request, response);
  }

  if (pathname.startsWith('/api/books/')) {
    const title = pathname.split('/')[3];
    if (title) {
      request.params = { title };
      return jsonHandler.getBookByTitle(request, response, params);
    }
  }

  if (pathname === '/api/genres') {
    return jsonHandler.getGenres(request, response);
  }

  if (pathname === '/api/authors') {
    return jsonHandler.getAuthors(request, response);
  }

  if (pathname === '/api/stats') {
    return jsonHandler.getStats(request, response);
  }

  return htmlHandler.get404(request, response);
};

const onRequest = (request, response) => {
  const protocol = request.connection.encrypted ? 'https' : 'http';
  const parsedUrl = new URL(request.url, `${protocol}://${request.headers.host}`);

  if (request.method === 'POST') {
    handlePost(request, response, parsedUrl);
  } else {
    handleGet(request, response, parsedUrl);
  }
};

http.createServer(onRequest).listen(port, () => {
  console.log(`Listening on 127.0.0.1: ${port}`);
});
