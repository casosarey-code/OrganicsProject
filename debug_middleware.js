const fs = require('fs');
const path = '/opt/backend/src/middleware/validatePermission.js';
let content = fs.readFileSync(path, 'utf8');

// Agregar logs de debug
content = content.replace(
    'const userRoles = await db_1.default.userRoles.findMany({',
    'console.log("DEBUG req.user:", JSON.stringify(req.user)); const userRoles = await db_1.default.userRoles.findMany({'
);

content = content.replace(
    'const hasPermission = userRoles.some',
    'console.log("DEBUG userRoles:", JSON.stringify(userRoles)); const hasPermission = userRoles.some'
);

fs.writeFileSync(path, content);
console.log('Debug added to', path);
