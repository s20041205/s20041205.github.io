<?php
    //ref: http://vvv.lionfree.net/learnshow.php?l_url=db_002.php
   include("connection/login.php"); //載入連線資訊檔 
   //或載入此行 require_once('Connections/login.php');

   //若有出現中文亂碼現象,再加入此行唄！ mysql_query("SET NAMES 'UTF8'");

   $sql = "select * from learn limit 5";
   $result = mysql_query($sql) or die('MySQL query error'); 

   $fdnum=mysql_num_fields($result); //返回結果集中行的fields數目，也就是一行內有幾個欄位啦!
     echo '<table>';
     while($row = mysql_fetch_array($result)){
        echo '<tr>';
        for ($i=0; $i<$fdnum; $i++){
        echo '<td>'.$row[$i].'</td>';
        }
        echo '</tr>'; 
     }
     echo '</table>';
   mysql_close($conn);
?>