const data = {
  books: [],
  booksMap: new Map(),
};

// Resource referenced: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
const normalizeTitle = (title) => {
  if (!title) return '';
  return title.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
};

// initialize data
const loadData = (initialData) => {
  if (initialData && initialData.books) {
    data.books = initialData.books;
    data.booksMap.clear();
  }

  data.books.forEach((book) => {
    const normalizedTitle = normalizeTitle(book.title);
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

// API endpoints and posts
const getBooks = (request, response, params) => {
  let booksToReturn = data.books;

  if (params.author) {
    const queryAuthor = params.author.toLowerCase();
    booksToReturn = booksToReturn.filter((b) => b.author.toLowerCase().includes(queryAuthor));
  }

  if (params.genre) {
    const queryGenre = params.genre.toLowerCase();
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
  const normalizedTitle = normalizeTitle(title);
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

// functions to add and edit book api
const addBook = (request, response) => {
  const { body } = request;
  const requiredFields = ['title', 'author', 'genres', 'year'];

  const includesAllFields = requiredFields.every((field) => body[field]);

  if (!includesAllFields) {
    return respondJSON(request, response, 400, {
      message: `Missing required field: ${requiredFields.join(', ')}`,
    });
  }

  const normalizedTitle = normalizeTitle(body.title);
  if (data.booksMap.has(normalizedTitle)) {
    return respondJSON(request, response, 409, {
      message: `Book titled "${body.title}" already exists.`,
    });
  }

  let bookGenres = [];
  if (body.genres) {
    bookGenres = Array.isArray(body.genres) ? body.genres : [body.genres];
  }

  const newBook = {
    title: body.title,
    author: body.author,
    country: body.country || 'Unknown',
    language: body.language || 'English',
    pages: parseInt(body.pages, 10) || 0,
    year: parseInt(body.year, 10) || 0,
    genres: bookGenres,
    link: body.link || '',
  };

  data.books.push(newBook);
  data.booksMap.set(normalizedTitle, newBook);

  return respondJSON(request, response, 201, { message: 'Book added successfully', book: newBook });
};

const editBook = (request, response) => {
  const { title } = request.params;
  const { body } = request;
  const normalizedTitle = normalizeTitle(title);

  const bookToEdit = data.booksMap.get(normalizedTitle);

  if (!bookToEdit) {
    return respondJSON(request, response, 404, {
      message: `Book titled "${title}" not found for update.`,
    });
  }

  let updated = false;

  // Resource Refrenced: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN
  if (body.author) { bookToEdit.author = body.author; updated = true; }
  if (body.country) { bookToEdit.country = body.country; updated = true; }
  if (body.year && !NaN(parseInt(body.year, 10))) {
    bookToEdit.year = parseInt(body.year, 10); updated = true;
  }
  if (body.genres) {
    bookToEdit.genres = Array.isArray(body.genres) ? body.genres : [body.genres];
    updated = true;
  }

  if (body.title && body.title !== bookToEdit.title) {
    const newNormalizedTitle = normalizeTitle(body.title);

    data.booksMap.delete(normalizedTitle);
    bookToEdit.title = body.title;
    data.booksMap.set(newNormalizedTitle, bookToEdit);

    updated = true;
  }

  if (!updated) {
    return respondJSON(request, response, 200, {
      message: 'No updatedable fields provided.',
      book: bookToEdit,
    });
  }

  return respondJSON(request, response, 200, {
    messsage: 'Book updated succesfully.',
    book: bookToEdit,
  });
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
