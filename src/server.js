const fs = require('fs');

const http = require('http');
const { URL } = require('url');
const query = require('querystring');

const htmlHandler = require('./htmlResponses.js');
const jsonHandler = require('./jsonResponses.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// importing books.json data
try {
  const booksData = JSON.parse(fs.readFileSync('./src/books.json', 'utf8'));

  jsonHandler.loadData(booksData);
} catch (e) {
  jsonHandler.loadData({ books: [] });
}

// functions to parse the body
const readStreamBody = (request) => new Promise((resolve, reject) => {
  const body = [];

  request.on('error', (err) => {
    reject(err);
  });

  request.on('data', (chunk) => {
    body.push(chunk);
  });

  request.on('end', () => {
    resolve(Buffer.concat(body).toString());
  });
});

const parseBody = async (request, response, handler) => {
  try {
    const bodyString = await readStreamBody(request);
    const contentType = request.headers['content-type'];

    if (contentType && contentType.includes('application/json')) {
      try {
        request.body = JSON.parse(bodyString);
      } catch (e) {
        console.error('JSON parsing error', e.message);
        return jsonHandler.respondJSON(request, response, 400, { message: 'Malformed JSON in request,' });
      }
    } else if (contentType && contentType.includes('x-www-form-urlencoded')) {
      request.body = query.parse(bodyString);
    } else {
      request.body = {};
    }
    return handler(request, response);
  } catch (err) {
    console.dir(err);
    return jsonHandler.respondJSON(request, response, 400, { message: 'Request data error.' });
  }
};

// function for handling Post method
const handlePost = (request, response, parsedUrl) => {
  const { pathname } = parsedUrl;
  if (pathname === '/api/books') {
    return parseBody(request, response, jsonHandler.addBook);
  }

  if (pathname.startsWith('/api/books/')) {
    const parts = pathname.split('/');
    const title = parts[3];
    if (title) {
      request.params = { title };
      return parseBody(request, response, jsonHandler.editBook);
    }
    return htmlHandler.get404(request, response);
  }

  return htmlHandler.get404(request, response);
};

// function for handling get method
const handleGet = (request, response, parsedUrl) => {
  const { pathname, searchParams } = parsedUrl;

  const params = Array.from(searchParams.entries()).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

  if (pathname.endsWith('.css')) {
    return htmlHandler.getCSS(request, response);
  }

  if (pathname.endsWith('js') || pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.txt')) {
    return htmlHandler.getStaticFile(request, response, pathname);
  }

  if (pathname === '/') {
    return htmlHandler.getIndex(request, response);
  }

  if (pathname === '/api/booksByTitle' || pathname === '/api/booksByTitle') {
    return jsonHandler.getBooks(request, response, params);
  }

  if (pathname.startsWith('/api/booksByTitle')) {
    const parts = pathname.split('/');
    const title = parts[parts.length - 1];

    if (title) {
      request.params = { title: decodeURIComponent(title) };
      return jsonHandler.getBookByTitle(request, response, params);
    }
  }

  if (pathname === '/api/books') {
    return jsonHandler.getBooks(request, response, params);
  }

  if (pathname.startsWith('/api/books/')) {
    const parts = pathname.split('/');
    if (parts.length > 3 && parts[2] === 'books') {
      const title = parts[3];
      request.params = { title: decodeURIComponent(title) };
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

// function for onRequest
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
