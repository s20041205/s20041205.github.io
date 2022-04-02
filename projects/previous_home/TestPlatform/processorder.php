<?php
// create short variable names, also can use '$_REQUEST['name']'
$tireqty = $_POST['tireqty'];
$oilqty = $_POST['oilqty'];
$sparkqty = $_POST['sparkqty'];
?>
<!DOCTYPE html>
<html>
<head>
<title>Bob 's Auto Parts - Order Results</title>
</head>
<body>
<h1>Bob 's Auto Parts</h1>
<h2>Order Results</h2>
<?php
echo "<p>Order processed at ";
echo date('H:i, jS F Y')."</p>";
echo "<p>Your order is as follows: </p>";
echo "$tireqty tires<br />";
echo $oilqty.' bottles of oil<br />';
echo $sparkqty." spark plugs<br />"
?>
---------------------------------------------------<br />
<?php
$testHeredoc = <<< EOF
line 1  
line 2  
line 3  
EOF;
echo "$testHeredoc"."<br />";
?>
---------------------------------------------------<br />
<?php
echo "About Comment:";
//Here is a comment.
#Here is a comment too.
/*
Here is multi line comment.
Here is multi line comment.
*/
?>
</body>
</html>