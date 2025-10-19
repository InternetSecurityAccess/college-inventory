const db = require('../db').db;

module.exports = {
    addMovement: (movement, callback) => {
        const { item_id, from_location_id, location_id, description } = movement;
        const stmt = db.prepare('INSERT INTO item_movements (item_id, from_location_id, location_id, description) VALUES (?, ?, ?, ?)');
        stmt.run(item_id, from_location_id, location_id, description, function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, { id: this.lastID, ...movement });
            }
        });
        stmt.finalize();
    },

    getMovementsByItemId: (itemId, callback) => {
        const query = `
            SELECT
                im.moved_at,
                fl.name AS from_location_name,
                l.name AS location_name,
                im.description
            FROM item_movements im
            LEFT JOIN locations fl ON im.from_location_id = fl.id
            LEFT JOIN locations l ON im.location_id = l.id
            WHERE im.item_id = ?
            ORDER BY im.moved_at DESC;
        `;
        db.all(query, [itemId], callback);
    }
};