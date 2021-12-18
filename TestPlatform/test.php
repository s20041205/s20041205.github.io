<!DOCTYPE html>
<html>
<body>
<p>PHP Pass Data Through Link</p>

<a href="php-pass-data-through-link-1.php?name=Peter&age=37">Click Me</a>

<br />
<?php

$name = $_GET["name"];
$age = $_GET["age"];

if ($name != null) {
   echo "Name: " . $name . "<br />";
   echo "Age: " . $age;
}

?>


</body>
</html>