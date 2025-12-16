<?php
// db.php
$host = '127.0.0.1';
$port = '3307'; // Ensure this matches your MySQL port
$db   = 'digital_library_db';
$user = 'root';
$pass = ''; 

$dsn = "mysql:host=$host;port=$port;charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create Database
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db`");
    $pdo->exec("USE `$db`");

    // 1. Users Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        username VARCHAR(50) UNIQUE,
        password VARCHAR(255),
        role ENUM('Admin', 'Student') DEFAULT 'Student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // 2. Books Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200),
        author VARCHAR(100),
        category VARCHAR(50),
        status ENUM('available', 'borrowed') DEFAULT 'available',
        image VARCHAR(500),
        rating DECIMAL(3,1) DEFAULT 5.0
    )");

    // 3. Appointments Table (With Feedback Columns)
    $pdo->exec("CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_name VARCHAR(100),
        date DATE,
        purpose VARCHAR(100),
        book_title VARCHAR(200) DEFAULT NULL,
        feedback TEXT DEFAULT NULL,
        user_rating INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // 4. Favorites Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS favorites (
        user_id INT,
        book_id INT,
        PRIMARY KEY (user_id, book_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )");

    // 5. Announcements Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200),
        content TEXT,
        type ENUM('Event', 'Update', 'News') DEFAULT 'News',
        date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // Seed Admin
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = 'admin'");
    $stmt->execute();
    if ($stmt->fetchColumn() == 0) {
        $passHash = password_hash('admin', PASSWORD_DEFAULT);
        $pdo->exec("INSERT INTO users (name, username, password, role) VALUES ('System Admin', 'admin', '$passHash', 'Admin')");
    }

} catch (PDOException $e) {
    die("DB Connection Failed: " . $e->getMessage());
}
?>