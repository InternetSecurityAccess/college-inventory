const express = require('express');
const dbModule = require('../db');
const router = express.Router();

// Маршруты для управления местоположениями
router.get('/locations', async (req, res) => {
    try {
        const locations = await new Promise((resolve, reject) => {
            dbModule.getAllLocations((err, locations) => {
                if (err) {
                    console.error('Ошибка при получении списка местоположений:', err.message);
                    reject(err);
                    return;
                }
                resolve(locations);
            });
        });
        res.render('locations/index', { locations });
    } catch (err) {
        console.error('Ошибка при получении списка местоположений:', err.message);
        res.status(500).send('Ошибка при получении списка местоположений');
    }
});

router.get('/locations/add', (req, res) => {
    res.render('locations/add');
});

router.post('/locations/add', (req, res) => {
    const { name, description } = req.body;
    dbModule.addLocation(name, description, (err, newLocation) => {
        if (err) {
            console.error('Ошибка при добавлении местоположения:', err.message);
            res.status(500).send('Ошибка при добавлении местоположения');
        } else {
            res.redirect('/locations');
        }
    });
});

router.get('/locations/edit/:id', async (req, res) => {
    const locationId = req.params.id;
    dbModule.db.get('SELECT * FROM locations WHERE id = ?', [locationId], (err, location) => {
        if (err) {
            console.error('Ошибка при получении данных местоположения для редактирования:', err.message);
            res.status(500).send('Ошибка при получении данных местоположения');
            return;
        }
        if (!location) {
            res.status(404).send('Местоположение не найдено');
            return;
        }
        res.render('locations/edit', { location });
    });
});

router.post('/locations/edit/:id', (req, res) => {
    const locationId = req.params.id;
    const { name, description } = req.body;

    dbModule.db.get('SELECT id FROM locations WHERE name = ? AND id != ?', [name, locationId], (err, row) => {
        if (err) {
            console.error('Ошибка при проверке уникальности названия местоположения:', err.message);
            return res.status(500).send('Ошибка при проверке данных.');
        }
        if (row) {
            return res.status(400).send('Местоположение с таким названием уже существует.');
        }

        const stmt = dbModule.db.prepare('UPDATE locations SET name = ?, description = ? WHERE id = ?');
        stmt.run(name, description, locationId, function(err) {
            if (err) {
                console.error('Ошибка при обновлении местоположения:', err.message);
                res.status(500).send('Ошибка при обновлении местоположения');
            } else {
                console.log(`Местоположение с ID ${locationId} обновлено.`);
                res.redirect('/locations');
            }
        });
        stmt.finalize();
    });
});

module.exports = router;