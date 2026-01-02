/**
 * Script to create a Super Admin manually
 * Run: node scripts/create-super-admin.js <-- type this in vscode terminal in the backend folder
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'securevoice'
};

async function createSuperAdmin() {
    let connection;
    
    try {
        console.log('🔗 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected successfully!\n');

        // Super Admin credentials
        const username = 'superadmin';
        const email = 'superadmin@crime.gov.bd';
        const password = 'SuperAdmin@2026'; // Change this to your desired password
        const fullName = 'System Super Administrator';

        console.log('📋 Creating Super Admin with credentials:');
        console.log('   Username:', username);
        console.log('   Email:', email);
        console.log('   Password:', password);
        console.log('   Full Name:', fullName);
        console.log('');

        // Check if super admin already exists
        const [existing] = await connection.query(
            'SELECT * FROM super_admins WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            console.log('⚠️  Super Admin already exists!');
            console.log('   Updating password instead...\n');
            
            // Hash new password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Update existing super admin
            await connection.query(
                'UPDATE super_admins SET password = ?, fullName = ?, is_active = 1 WHERE username = ?',
                [hashedPassword, fullName, username]
            );
            
            console.log('✅ Super Admin password updated successfully!');
        } else {
            // Hash password
            console.log('🔐 Hashing password...');
            const hashedPassword = await bcrypt.hash(password, 10);
            console.log('✅ Password hashed!\n');

            // Insert super admin
            console.log('💾 Inserting Super Admin into database...');
            await connection.query(
                `INSERT INTO super_admins (username, email, password, fullName, is_active) 
                 VALUES (?, ?, ?, ?, 1)`,
                [username, email, hashedPassword, fullName]
            );
            
            console.log('✅ Super Admin created successfully!\n');
        }

        console.log('═══════════════════════════════════════════');
        console.log('🎉 SUPER ADMIN READY TO USE');
        console.log('═══════════════════════════════════════════');
        console.log('');
        console.log('📍 Login URL: http://localhost:3000/super-admin-login.html');
        console.log('👤 Username:', username);
        console.log('🔑 Password:', password);
        console.log('📧 Email:', email);
        console.log('');
        console.log('⚠️  IMPORTANT: Change the password after first login!');
        console.log('═══════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed.');
        }
    }
}

// Run the script
createSuperAdmin();
