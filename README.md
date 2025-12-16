# 📚 Digital Library

A web-based Digital Library management system built with PHP, JavaScript, and MySQL. This application allows users to interact with a library catalog, serving as a simplified interface for borrowing or managing digital resources.

## 🚀 Features

* **Frontend Interface:** Clean and responsive UI using HTML5 and CSS3.
* **Dynamic Data:** Fetches library data asynchronously using JavaScript (`js.js`) and the PHP API (`api.php`).
* **Database Integration:** Connects to a MySQL database via `db.php` to store book and user information.
* **RESTful API:** Simple backend structure to handle requests between the client and the database.

## 🛠️ Technologies Used

* **Frontend:** HTML, CSS (`css.css`), JavaScript (`js.js`)
* **Backend:** PHP
* **Database:** MySQL

## 📂 Project Structure

```text
Digital_library/
├── api.php       # Handles backend logic and API requests
├── css.css       # Main stylesheet for the application
├── db.php        # Database connection configuration
├── index.html    # Main entry point (homepage)
└── js.js         # Frontend logic and API fetching
