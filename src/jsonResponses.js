const data = {
  books: [],
  booksMap: new Map(),
};

// Resource referenced: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions, https://www.w3schools.com/jsref/jsref_regexp_whitespace.asp
const normalizeSearch = (text) => {
  if (!text) return '';
  return text.replace(/\s+/g, '').toLowerCase().trim();
};

// initialize data
const loadData = (initialData) => {
  if (initialData && initialData.books) {
    data.books = initialData.books;
    data.booksMap.clear();
  }

  data.books.forEach((book) => {
    const normalizedTitle = normalizeSearch(book.title);
    console.log(`Loading Book Key: [${normalizedTitle}] | Length: ${normalizedTitle.length}`);
    data.booksMap.set(normalizedTitle, book);
  });
};

const respondJSON = (request, response, status, obj) => {
  const stringData = JSON.stringify(obj);

  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(stringData),
  });

  const method = request.method ? request.method.toUpperCase() : '';
  if (method !== 'HEAD') {
    response.write(stringData);
  }
  response.end();
};

const respondNoContent = (request, response) => {
  response.writeHead(204);
  response.end();
};

// Resource Refreneced: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array

// 4 GET API endpoints
const getBooks = (request, response, params) => {
  let booksToReturn = data.books;

  if (params.author) {
    const queryAuthor = normalizeSearch(params.author);
    booksToReturn = booksToReturn.filter((b) => b.author.toLowerCase().includes(queryAuthor));
  }

  if (params.genre) {
    const queryGenre = normalizeSearch(params.genre);
    booksToReturn = booksToReturn.filter((b) => b.genres
      && b.genres.some((g) => g.toLowerCase().includes(queryGenre)));
  }

  if (params.limit && !Number.isNaN(parseInt(params.limit, 10))) {
    const limit = parseInt(params.limit, 10);
    booksToReturn = booksToReturn.slice(0, limit);
  }

  return respondJSON(request, response, 200, {
    count: booksToReturn.length,
    books: booksToReturn,
  });
};

const getBookByTitle = (request, response) => {
  const { title } = request.params;
  const normalizedTitle = normalizeSearch(title);
  const book = data.booksMap.get(normalizedTitle);

  if (!book) {
    return respondJSON(request, response, 404, {
      message: `Book titled "${title}" not found.`,
    });
  }

  return respondJSON(request, response, 200, book);
};

const getGenres = (request, response) => {
  const genres = new Set();
  data.books.forEach((book) => {
    if (book.genres && Array.isArray(book.genres)) {
      book.genres.forEach((genre) => genres.add(genre));
    }
  });

  return respondJSON(request, response, 200, { genres: Array.from(genres) });
};

const getAuthors = (request, response) => {
  const authors = new Set(data.books.map((b) => b.author).filter(Boolean));

  return respondJSON(request, response, 200, { authors: Array.from(authors) });
};

const getStats = (request, response) => {
  const stats = {
    totalBooks: data.books.length,
    totalAuthors: new Set(data.books.map((b) => b.author).filter(Boolean)).size,
    lastUpdated: new Date().toISOString(),
  };

  return respondJSON(request, response, 200, stats);
};

/*
* Post Methods: Edit book and Add book
*/

// function to edit book api
const editBook = (request, response) => {
  const { title: oldTitle } = request.params;
  const { body } = request;
  const normalizedOldTitle = normalizeSearch(oldTitle);
  const bookToEdit = data.booksMap.get(normalizedOldTitle);

  if (!bookToEdit) {
    return respondJSON(request, response, 404, {
      message: `Book titled ${oldTitle} not found for update.`,
    });
  }

  let updated = false;

  // Resource Refrenced: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN
  if (body.author) { bookToEdit.author = body.author; updated = true; }

  if (body.year && !Number.isNaN(parseInt(body.year, 10))) {
    bookToEdit.year = parseInt(body.year, 10); updated = true;
  }
  if (body.genres) {
    bookToEdit.genres = Array.isArray(body.genres) ? body.genres : [body.genres];
    updated = true;
  }

  if (body.title && body.title !== bookToEdit.title) {
    const newTitle = body.title;
    const normalizedNewTitle = normalizeSearch(newTitle);
    if (data.booksMap.has(normalizedNewTitle)) {
      return respondJSON(request, response, 409, {
        message: `Book titled ${newTitle} already exists.`,
      });
    }

    data.booksMap.delete(normalizedOldTitle);
    bookToEdit.title = newTitle;
    data.booksMap.set(normalizedNewTitle, bookToEdit);

    updated = true;
  }

  if (!updated) {
    return respondJSON(request, response, 200, {
      message: 'No updatedable fields provided.',
      book: bookToEdit,
    });
  }

  return respondJSON(request, response, 200, {
    message: 'Book updated successfully.',
    book: bookToEdit,
  });
};

// function to add book api
const addBook = (request, response) => {
  const { body } = request;
  const requiredFields = ['title', 'author', 'genres', 'year'];
  const normalizedNewTitle = normalizeSearch(body.title);
  const includesAllFields = requiredFields.every((field) => body[field]);

  if (!includesAllFields) {
    return respondJSON(request, response, 400, {
      message: `Missing required field: ${requiredFields.join(', ')}`,
    });
  }

  if (data.booksMap.has(normalizedNewTitle)) {
    return respondJSON(request, response, 409, {
      message: `Book titled ${body.title} already exists.`,
    });
  }

  let bookGenres = [];
  if (body.genres) {
    bookGenres = Array.isArray(body.genres) ? body.genres : [body.genres];
  }

  const year = parseInt(body.year, 10);
  if (Number.isNaN(year) || year < 0) {
    return respondJSON(request, response, 400, {
      message: 'The year field is required and must be a postive int.',
    });
  }
  const newBook = {
    title: body.title,
    author: body.author,
    year: year,
    genres: bookGenres,
  };

  data.books.push(newBook);
  data.booksMap.set(normalizedNewTitle, newBook);

  return respondJSON(request, response, 201, { message: 'Book added successfully', book: newBook });
};

module.exports = {
  loadData,
  getBooks,
  getBookByTitle,
  getGenres,
  getAuthors,
  getStats,
  addBook,
  editBook,
  respondJSON,
  respondNoContent,
};
