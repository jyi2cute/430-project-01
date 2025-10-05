const fs = require('fs');

let index;
let css;

try {
  index = fs.readFileSync(`${__dirname}/../client/client.html`);
  css = fs.readFileSync(`${__dirname}/../client/style.css`);
} catch (e) {
  console.error('Error reading static files (html or css).', e.message);
  index = 'Error: Client html not found';
  css = '';
}

const respondStatic = (request, response, status, content, contentType) => {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(content),
  });

  if (request.method !== 'HEAD') {
    response.write(content);
  }
  response.end();
};

const getIndex = (request, response) => {
  respondStatic(request, response, 200, index, 'text/html');
};

const getCSS = (request, response) => {
  respondStatic(request, response, 200, css, 'text/css');
};

const get404 = (request, response) => {
  const errorMsg = 'Not FoundL The requested endpoint does not exist.';
  respondStatic(request, response, 404, errorMsg, 'text/html');
};

const getStaticFile = (request, response, pathname) => {
  const filePath = `${__dirname}/../client${pathname.substring(1)}`;

  try {
    const fileContent = fs.readFileSync(filePath);

    let contentType = 'application/octet-stream';
    if (pathname.endsWith('.js')) {
      contentType = 'text/javascript';
    } else if (pathname.endsWith('.png')) {
      contentType = 'image/png';
    } else if (pathname.endsWith('.jpg')) {
      contentType = 'image/jpg';
    } else if (pathname.endsWith('.txt')) {
      contentType = 'text/plain';
    }
    return respondStatic(request, response, 200, fileContent, contentType);
  } catch (e) {
    return get404(request, response);
  }
};

module.exports = {
  getIndex,
  getCSS,
  get404,
  getStaticFile,
};
