<?php
header("Content-Type: application/json");
include 'db_config.php';

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    if ($action === 'register') {
        $mobile = $conn->real_escape_string($data['mobile']);
        $password = $conn->real_escape_string($data['password']);
        $username = "User" . substr($mobile, -4);
        
        // Check if exists
        $check = $conn->query("SELECT id FROM users WHERE mobile = '$mobile'");
        if ($check->num_rows > 0) {
            echo json_encode(["success" => false, "message" => "User already exists!"]);
            exit;
        }

        $sql = "INSERT INTO users (mobile, password, username, kyc, credit_score, vip, balance, invested) 
                VALUES ('$mobile', '$password', '$username', 'Pending', 100, 0, 0.00, 0.00)";
        
        if ($conn->query($sql)) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["success" => false, "message" => $conn->error]);
        }
    }

    if ($action === 'login') {
        $mobile = $conn->real_escape_string($data['mobile']);
        $password = $conn->real_escape_string($data['password']);

        $result = $conn->query("SELECT * FROM users WHERE mobile = '$mobile' AND password = '$password'");
        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            // Map keys to match frontend expectation
            $user['creditScore'] = intval($user['credit_score']);
            $user['invested'] = floatval($user['invested']);
            $user['balance'] = floatval($user['balance']);
            $user['vip'] = intval($user['vip']);
            echo json_encode(["success" => true, "user" => $user]);
        } else {
            echo json_encode(["success" => false, "message" => "Invalid mobile or password!"]);
        }
    }

    if ($action === 'resetPassword') {
        $mobile = $conn->real_escape_string($data['mobile']);
        $newPassword = $conn->real_escape_string($data['newPassword']);

        $sql = "UPDATE users SET password = '$newPassword' WHERE mobile = '$mobile'";
        if ($conn->query($sql) && $conn->affected_rows > 0) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["success" => false, "message" => "Mobile number not found!"]);
        }
    }
}
$conn->close();
?>
