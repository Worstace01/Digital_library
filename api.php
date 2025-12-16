<?php
// api.php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
require 'db.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function getJsonInput() {
    return json_decode(file_get_contents('php://input'), true);
}

try {
    if ($method === 'GET') {
        if ($action === 'get_books') {
            $stmt = $pdo->query("SELECT * FROM books ORDER BY id DESC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }
        if ($action === 'get_users') {
            $stmt = $pdo->query("SELECT id, name, username, role, created_at as date FROM users");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }
        if ($action === 'get_appointments') {
            $stmt = $pdo->query("SELECT * FROM appointments ORDER BY id DESC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }
        if ($action === 'get_favorites') {
            $uid = $_GET['user_id'] ?? 0;
            $stmt = $pdo->prepare("SELECT book_id FROM favorites WHERE user_id = ?");
            $stmt->execute([$uid]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_COLUMN));
            exit;
        }
        if ($action === 'get_user_borrowed_books') {
            $studentName = $_GET['student'] ?? '';
            $stmt = $pdo->prepare("SELECT * FROM appointments WHERE student_name = ? AND book_title IS NOT NULL ORDER BY id DESC");
            $stmt->execute([$studentName]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }
        if ($action === 'get_announcements') {
            $stmt = $pdo->query("SELECT * FROM announcements ORDER BY date DESC, created_at DESC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }
    }

    if ($method === 'POST') {
        $json = getJsonInput();
        $data = $json ? $json : $_POST;

        if ($action === 'login') {
            $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
            $stmt->execute([$data['username']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($data['password'], $user['password'])) {
                unset($user['password']);
                echo json_encode(['status' => 'success', 'user' => $user]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Invalid credentials']);
            }
            exit;
        }

        if ($action === 'register') {
            $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
            $check->execute([$data['username']]);
            if ($check->rowCount() > 0) {
                echo json_encode(['status' => 'error', 'message' => 'Username taken']);
                exit;
            }
            $passHash = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, 'Student')");
            $stmt->execute([$data['name'], $data['username'], $passHash]);
            echo json_encode(['status' => 'success']);
            exit;
        }

        if ($action === 'toggle_favorite') {
            $userId = $data['user_id'];
            $bookId = $data['book_id'];
            $check = $pdo->prepare("SELECT * FROM favorites WHERE user_id = ? AND book_id = ?");
            $check->execute([$userId, $bookId]);
            
            if ($check->rowCount() > 0) {
                $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND book_id = ?")->execute([$userId, $bookId]);
                echo json_encode(['status' => 'success', 'fav_status' => 'removed']);
            } else {
                $pdo->prepare("INSERT INTO favorites (user_id, book_id) VALUES (?, ?)")->execute([$userId, $bookId]);
                echo json_encode(['status' => 'success', 'fav_status' => 'added']);
            }
            exit;
        }

        if ($action === 'add_book') {
            $rating = 5.0; 
            $title = $data['title'] ?? '';
            $author = $data['author'] ?? '';
            $category = $data['category'] ?? '';
            $imagePath = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=60';
            
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = 'uploads/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
                $newFileName = uniqid('book_') . '.' . strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
                if(move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $newFileName)) {
                    $imagePath = $uploadDir . $newFileName;
                }
            }
            
            $stmt = $pdo->prepare("INSERT INTO books (title, author, category, image, status, rating) VALUES (?, ?, ?, ?, 'available', ?)");
            $stmt->execute([$title, $author, $category, $imagePath, $rating]);
            echo json_encode(['status' => 'success']);
            exit;
        }

        if ($action === 'delete_book') {
            $stmt = $pdo->prepare("DELETE FROM books WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['status' => 'success']);
            exit;
        }

        if ($action === 'create_appointment') {
            $stmt = $pdo->prepare("INSERT INTO appointments (student_name, date, purpose, book_title) VALUES (?, ?, ?, ?)");
            $stmt->execute([$data['student'], $data['date'], $data['purpose'], $data['book'] ?? null]);
            if (!empty($data['book_id'])) {
                $pdo->prepare("UPDATE books SET status = 'borrowed' WHERE id = ?")->execute([$data['book_id']]);
            }
            echo json_encode(['status' => 'success']);
            exit;
        }

        if ($action === 'return_book') {
            $pdo->prepare("UPDATE books SET status = 'available' WHERE id = ?")->execute([$data['id']]);
            echo json_encode(['status' => 'success']);
            exit;
        }

        if ($action === 'add_announcement') {
            $stmt = $pdo->prepare("INSERT INTO announcements (title, content, type, date) VALUES (?, ?, ?, ?)");
            $stmt->execute([$data['title'], $data['content'], $data['type'], $data['date']]);
            echo json_encode(['status' => 'success']);
            exit;
        }

        if ($action === 'delete_announcement') {
            $stmt = $pdo->prepare("DELETE FROM announcements WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['status' => 'success']);
            exit;
        }

        if ($action === 'submit_feedback') {
            $apptId = $data['id'];
            $feedback = $data['feedback'];
            $rating = $data['rating'];
            $bookTitle = $data['book_title'];

            // 1. Update Appointment
            $stmt = $pdo->prepare("UPDATE appointments SET feedback = ?, user_rating = ? WHERE id = ?");
            $stmt->execute([$feedback, $rating, $apptId]);

            // 2. Update Book Rating
            $stmt = $pdo->prepare("SELECT id FROM books WHERE title = ? LIMIT 1");
            $stmt->execute([$bookTitle]);
            $book = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($book) {
                $avgStmt = $pdo->prepare("SELECT AVG(user_rating) as avg_rating FROM appointments WHERE book_title = ? AND user_rating IS NOT NULL");
                $avgStmt->execute([$bookTitle]);
                $avg = $avgStmt->fetch(PDO::FETCH_ASSOC)['avg_rating'];

                if ($avg) {
                    $updateStmt = $pdo->prepare("UPDATE books SET rating = ? WHERE id = ?");
                    $updateStmt->execute([round($avg, 1), $book['id']]);
                }
            }
            echo json_encode(['status' => 'success']);
            exit;
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>