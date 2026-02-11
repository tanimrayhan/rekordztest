<?php

$server   = "sql101.infinityfree.com";
$username = "if0_41122513";
$password = "82464826hH";
$dbname   = "if0_41122513_tanimrayhan2";

$conn = mysqli_connect($server, $username, $password, $dbname);

if (!$conn) {
    die("Connection Failed: " . mysqli_connect_error());
}

?>
