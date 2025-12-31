const bcrypt = require('bcrypt');
const config = require('../config/config');

module.exports = {
    hashPassword: async (password) => {
        return bcrypt.hash(password, config.saltRounds);
    },
    
    comparePassword: async (password, hashedPassword) => {
        return bcrypt.compare(password, hashedPassword);
    }
};