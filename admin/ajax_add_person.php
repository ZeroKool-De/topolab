<?php
require_once '../config/config.php';
require_once ROOT_PATH . 'includes/db_connect.php';
require_once ROOT_PATH . 'includes/functions.php';

header('Content-Type: application/json');

// CONTROLLO ACCESSO
if (session_status() == PHP_SESSION_NONE) { session_start(); }

$is_true_admin = isset($_SESSION['admin_user_id']);
$is_contributor = (isset($_SESSION['user_id_frontend']) && isset($_SESSION['user_role_frontend']) && $_SESSION['user_role_frontend'] === 'contributor');
$current_user_id_for_proposal = $_SESSION['user_id_frontend'] ?? 0;

if (!$is_true_admin && !$is_contributor) {
    echo json_encode(['success' => false, 'message' => 'Accesso negato']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Metodo non valido']);
    exit;
}

$name = trim($_POST['name'] ?? '');
$biography = trim($_POST['biography'] ?? '');

// Validazione
if (empty($name)) {
    echo json_encode(['success' => false, 'message' => 'Il nome è obbligatorio']);
    exit;
}

if (strlen($name) < 2) {
    echo json_encode(['success' => false, 'message' => 'Il nome deve contenere almeno 2 caratteri']);
    exit;
}

if (strlen($name) > 100) {
    echo json_encode(['success' => false, 'message' => 'Il nome non può superare i 100 caratteri']);
    exit;
}

// Gestione upload immagine
$image_path_final = null;
if (isset($_FILES['person_image']) && $_FILES['person_image']['error'] == UPLOAD_ERR_OK) {
    $base_upload_path = UPLOADS_PATH;
    $target_subdir = 'persons';
    $final_upload_dir_relative = rtrim($target_subdir, '/') . '/';
    $pending_upload_dir_relative = 'pending_images/' . rtrim($target_subdir, '/') . '/';
    
    $upload_dir_actual_relative = ($is_contributor && !$is_true_admin) ? $pending_upload_dir_relative : $final_upload_dir_relative;
    $upload_dir_absolute = $base_upload_path . $upload_dir_actual_relative;

    if (!is_dir($upload_dir_absolute)) {
        if (!mkdir($upload_dir_absolute, 0775, true)) {
            echo json_encode(['success' => false, 'message' => 'Impossibile creare la cartella di upload']);
            exit;
        }
    }
    
    $original_filename = $_FILES['person_image']['name'];
    $file_extension = strtolower(pathinfo($original_filename, PATHINFO_EXTENSION));
    $allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!in_array($file_extension, $allowed_extensions)) {
        echo json_encode(['success' => false, 'message' => 'Formato file non permesso. Usa JPG, PNG, GIF o WebP']);
        exit;
    }

    $temp_filename_no_ext = 'person_' . uniqid('', true) . '_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($original_filename, PATHINFO_FILENAME));
    $temp_uploaded_file_absolute = $upload_dir_absolute . $temp_filename_no_ext . '.' . $file_extension;

    if (move_uploaded_file($_FILES['person_image']['tmp_name'], $temp_uploaded_file_absolute)) {
        $jpeg_quality = 75;
        $png_compression = 9;
        $convertToWebp = true;

        $processed_image_absolute_path = compress_and_optimize_image(
            $temp_uploaded_file_absolute,
            $temp_uploaded_file_absolute,
            $file_extension,
            $jpeg_quality,
            $png_compression,
            $convertToWebp
        );

        if ($processed_image_absolute_path) {
            $image_path_final = $upload_dir_actual_relative . basename($processed_image_absolute_path);
        } else {
            $image_path_final = $upload_dir_actual_relative . basename($temp_uploaded_file_absolute);
            error_log("Compressione fallita per person_image (Quick Add), usando " . $image_path_final);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Errore durante il caricamento dell\'immagine']);
        exit;
    }
}

try {
    $mysqli->begin_transaction();

    if ($is_contributor && !$is_true_admin) {
        // SALVA PROPOSTA PER CONTRIBUTORE
        $stmt_pending = $mysqli->prepare("INSERT INTO pending_persons 
            (person_id_original, proposer_user_id, action_type, name_proposal, biography_proposal, person_image_proposal)
            VALUES (NULL, ?, 'add', ?, ?, ?)");
        $stmt_pending->bind_param("isss", $current_user_id_for_proposal, $name, $biography, $image_path_final);

        if (!$stmt_pending->execute()) {
            throw new Exception("Errore nell'invio della proposta: " . $stmt_pending->error);
        }
        $stmt_pending->close();

        $mysqli->commit();
        echo json_encode([
            'success' => true, 
            'message' => 'Proposta persona inviata per revisione',
            'is_proposal' => true
        ]);

    } else {
        // GESTIONE ADMIN - AGGIUNTA DIRETTA
        
        // Verifica se esiste già una persona con questo nome
        $stmt_check = $mysqli->prepare("SELECT person_id FROM persons WHERE name = ?");
        $stmt_check->bind_param("s", $name);
        $stmt_check->execute();
        $result_check = $stmt_check->get_result();
        
        if ($result_check->num_rows > 0) {
            $stmt_check->close();
            throw new Exception("Esiste già una persona con questo nome");
        }
        $stmt_check->close();

        // Genera slug
        $exclude_id_for_slug = 0;
        $slug = generate_slug($name, $mysqli, 'persons', 'slug', $exclude_id_for_slug, 'person_id');

        $stmt = $mysqli->prepare("INSERT INTO persons (name, slug, biography, person_image, created_at) VALUES (?, ?, ?, ?, NOW())");
        $stmt->bind_param("ssss", $name, $slug, $biography, $image_path_final);

        if (!$stmt->execute()) {
            if ($mysqli->errno === 1062) {
                throw new Exception("Esiste già una persona con questo nome o slug simile");
            } else {
                throw new Exception("Errore durante l'aggiunta: " . $stmt->error);
            }
        }

        $new_person_id = $mysqli->insert_id;
        $stmt->close();

        $mysqli->commit();
        echo json_encode([
            'success' => true, 
            'message' => 'Persona aggiunta con successo',
            'person_id' => $new_person_id,
            'person_name' => $name,
            'is_proposal' => false
        ]);
    }

} catch (Exception $e) {
    $mysqli->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$mysqli->close();
?>