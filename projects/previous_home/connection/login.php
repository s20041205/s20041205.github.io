<?php
           $dbhost = 'https://192-168-0-139.hcclst.direct.quickconnect.to/';  //server
           $dbuser = 'root';       //user
           $dbpass = '*AeAc0805*';   //pw
           $dbname = 'hcclst_home';     //db name
           $conn = mysql_connect($dbhost, $dbuser, $dbpass) or die('Error with MySQL connect') ;
           mysql_query("SET NAMES 'UTF8'"); 
           mysql_select_db($dbname);
?>