
# Library Books API Design

## Overview

The Library Books API allows clients to retrieve, create, update,
and delete books. It also supports searching for books by author.

**Base URL:** `/api/v1`

**Resource:** `/books`

## Endpoints

### 1. List All Books

- **Method:** GET
- **Path:** `/api/v1/books`
- **Description:** Returns a list of all books in the library.
- **Request body:** Not required.
- **Success status:** `200 OK`

Example request:

```http
GET /api/v1/books
```

### 2. Get a Single Book

- **Method:** GET
- **Path:** `/api/v1/books/{id}`
- **Description:** Returns details of a book identified by its ID.
- **Request body:** Not required.
- **Success status:** `200 OK`

Example request:

```http
GET /api/v1/books/1
```

### 3. Create a Book

- **Method:** POST
- **Path:** `/api/v1/books`
- **Description:** Creates a new book in the library.
- **Request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "isbn": "9780385474542",
  "publishedYear": 1958
}
```

- **Success status:** `201 Created`

### 4. Update a Book

- **Method:** PUT
- **Path:** `/api/v1/books/{id}`
- **Description:** Replaces the details of an existing book.
- **Request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "isbn": "9780385474542",
  "publishedYear": 1958
}
```

- **Success status:** `200 OK`

### 5. Delete a Book

- **Method:** DELETE
- **Path:** `/api/v1/books/{id}`
- **Description:** Deletes a book identified by its ID.
- **Request body:** Not required.
- **Success status:** `204 No Content`

Example request:

```http
DELETE /api/v1/books/1
```

### 6. List Books by Author

- **Method:** GET
- **Path:** `/api/v1/books?author={author}`
- **Description:** Returns books written by the specified author.
- **Request body:** Not required.
- **Success status:** `200 OK`

Example request:

```http
GET /api/v1/books?author=Chinua%20Achebe
```

## Error Responses

### 400 Bad Request

Returned when the request is invalid or contains missing or
incorrectly formatted required data.

Example: Creating a book without the required title or author.

### 404 Not Found

Returned when the requested book does not exist.

Example: Requesting `GET /api/v1/books/999` when no book has ID 999.

## Notes

- All request and response bodies use JSON where applicable.
- Book IDs uniquely identify individual books.
- The API should validate incoming data before creating or updating books.
- The API should return appropriate error messages with error status codes.
