#!/bin/bash
echo "Stopping MySQL server..."
/usr/local/mysql/support-files/mysql.server stop 2>/dev/null || true

echo "Removing MySQL files and directories..."
rm -rf /usr/local/mysql*
rm -rf /Library/StartupItems/MySQLCOM
rm -rf /Library/PreferencePanes/My*
rm -rf /Library/Receipts/mysql*
rm -rf /Library/Receipts/com.mysql.*
rm -rf /var/db/receipts/com.mysql.*
rm -f /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist

echo "Native MySQL has been completely uninstalled! You can now start XAMPP MySQL safely."
