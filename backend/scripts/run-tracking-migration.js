// Run database migration for tracking_token
const pool = require('../src/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('📦 Running migration: 010_add_tracking_token.sql');
        
        const migrationPath = path.join(__dirname, '../database/010_add_tracking_token.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split SQL statements by semicolon and execute them
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('USE'));
        
        for (const statement of statements) {
            if (statement.toUpperCase().includes('ALTER TABLE') || 
                statement.toUpperCase().includes('UPDATE')) {
                await pool.query(statement);
                console.log('✅ Executed:', statement.substring(0, 50) + '...');
            }
        }
        
        console.log('✅ Migration completed successfully!');
        console.log('📝 tracking_token column added to complaint table');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
