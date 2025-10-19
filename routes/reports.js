const express = require('express');
const dbModule = require('../db');
const router = express.Router();
const moment = require('moment');
const csv = require('csv-stringify');

// --- Helper function to get locations and itemTypes for rendering forms ---
async function getLocationsForView() {
    return new Promise((resolve, reject) => {
        dbModule.getAllLocations((err, locations) => {
            if (err) {
                console.error('Ошибка в getLocationsForView:', err.message);
                reject(err);
                return;
            }
            resolve(locations);
        });
    });
}

async function getItemTypesForView() {
    return new Promise((resolve, reject) => {
        dbModule.getAllItemTypes((err, itemTypes) => {
            if (err) {
                console.error('Ошибка в getItemTypesForView:', err.message);
                return reject(err);
            }
            resolve(itemTypes);
        });
    });
}

// --- Маршруты для управления отчетами ---

// Главная страница отчетов (для навигации)
router.get('/reports', async (req, res) => {
    try {
        const locations = await getLocationsForView();
        const itemTypes = await getItemTypesForView();
        res.render('reports/index', { locations, itemTypes, currentFilters: {} }); // Передаем пустые фильтры для начальной загрузки
    } catch (err) {
        console.error('Ошибка при загрузке страницы отчетов:', err.message);
        res.status(500).send('Ошибка при загрузке страницы отчетов');
    }
});

// Отчет по местоположению (с фильтрами по дате и конкретному местоположению)
router.get('/reports/by-location', async (req, res) => {
    const { startDate, endDate, locationId } = req.query;

    let query = `
        SELECT
            l.name AS location_name,
            i.name AS item_name,
            i.inventory_number,
            i.responsible_employee,
            COUNT(i.id) AS total_items,
            i.status
        FROM locations l
        LEFT JOIN items i ON l.id = i.location_id
    `;
    const queryParams = [];
    const whereClauses = [];

    if (locationId) {
        whereClauses.push('l.id = ?');
        queryParams.push(parseInt(locationId, 10));
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' GROUP BY l.id, i.name, i.inventory_number, i.responsible_employee, i.status ORDER BY l.name, i.name;';

    dbModule.db.all(query, queryParams, (err, rows) => {
        if (err) {
            console.error('Ошибка при генерации отчета по местоположению:', err.message);
            res.status(500).send('Ошибка при генерации отчета');
            return;
        }

        Promise.all([getLocationsForView()])
            .then(([locations]) => {
                res.render('reports/by_location', {
                    reportData: rows,
                    currentFilters: { startDate, endDate, locationId },
                    locations: locations
                });
            })
            .catch(err => {
                console.error('Ошибка при загрузке данных для фильтров отчета:', err.message);
                res.status(500).send('Ошибка при загрузке данных для фильтров отчета');
            });
    });
});

// Экспорт отчета по местоположению в CSV
router.get('/reports/by-location/export-csv', async (req, res) => {
    const { startDate, endDate, locationId } = req.query;

    let query = `
        SELECT
            l.name AS "Местоположение",
            i.name AS "Наименование",
            i.inventory_number AS "Инвентарный номер",
            i.responsible_employee AS "Ответственный",
            COUNT(i.id) AS "Количество",
            i.status AS "Статус"
        FROM locations l
        LEFT JOIN items i ON l.id = i.location_id
    `;
    const queryParams = [];
    const whereClauses = [];

   if (locationId) {
        whereClauses.push('l.id = ?');
        queryParams.push(parseInt(locationId, 10));
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' GROUP BY l.id, i.name, i.inventory_number, i.responsible_employee, i.status ORDER BY l.name, i.name;';


    dbModule.db.all(query, queryParams, (err, rows) => {
        if (err) {
            console.error('Ошибка при экспорте отчета по местоположению:', err.message);
            return res.status(500).send('Ошибка при экспорте отчета');
        }

        csv.stringify(rows, {
            header: true,
            columns: {
                "Местоположение": "Местоположение",
                "Наименование": "Наименование",
                "Инвентарный номер": "Инвентарный номер",
                "Ответственный": "Ответственный",
                "Количество": "Количество",
                "Статус": "Статус"
            }
        }, (err, result) => {
            if (err) {
                console.error('Ошибка при преобразовании в CSV:', err.message);
                return res.status(500).send('Ошибка при преобразовании в CSV');
            }
            res.setHeader('Content-disposition', 'attachment; filename=report_by_location.csv');
            res.setHeader('Content-type', 'text/csv');
            res.send(result);
        });
    });
});

// Отчет по виду предмета (с фильтрами по дате и конкретному виду)
router.get('/reports/by-item-type', async (req, res) => {
    const { startDate, endDate, itemTypeId } = req.query;

    let query = `
        SELECT
            it.name AS item_type_name,
            COUNT(i.id) AS total_items,
            SUM(CASE WHEN i.status = 'В наличии' THEN 1 ELSE 0 END) AS available_items,
            SUM(CASE WHEN i.status = 'В ремонте' THEN 1 ELSE 0 END) AS repair_items,
            SUM(CASE WHEN i.status = 'Списан' THEN 1 ELSE 0 END) AS written_off_items,
            SUM(CASE WHEN i.status = 'На выдаче' THEN 1 ELSE 0 END) AS issued_items
        FROM item_types it
        LEFT JOIN items i ON it.id = i.item_type_id
    `;
    const queryParams = [];
    const whereClauses = [];

    if (startDate) { whereClauses.push('i.acquisition_date >= ?'); queryParams.push(startDate); }
    if (endDate) { whereClauses.push('i.acquisition_date >= ?'); queryParams.push(endDate); }
    if (itemTypeId) { whereClauses.push('it.id = ?'); queryParams.push(parseInt(itemTypeId, 10)); }

    if (whereClauses.length > 0) { query += ' WHERE ' + whereClauses.join(' AND '); }
    query += ' GROUP BY it.id, it.name ORDER BY it.name;';

    dbModule.db.all(query, queryParams, (err, rows) => {
        if (err) { console.error('Ошибка при генерации отчета по виду предмета:', err.message); res.status(500).send('Ошибка при генерации отчета'); return; }
        Promise.all([getItemTypesForView()]).then(([itemTypes]) => {
            res.render('reports/by_item_type', {
                reportData: rows,
                currentFilters: { startDate, endDate, itemTypeId },
                itemTypes: itemTypes
            });
        }).catch(err => { console.error('Ошибка при загрузке данных для фильтров отчета:', err.message); res.status(500).send('Ошибка при загрузке данных для фильтров отчета'); });
    });
});

// Экспорт отчета по виду предмета в CSV
router.get('/reports/by-item-type/export-csv', async (req, res) => {
    const { startDate, endDate, itemTypeId } = req.query;

    let query = `
        SELECT
            it.name AS "Вид предмета",
            COUNT(i.id) AS "Всего предметов",
            SUM(CASE WHEN i.status = 'В наличии' THEN 1 ELSE 0 END) AS "В наличии",
            SUM(CASE WHEN i.status = 'В ремонте' THEN 1 ELSE 0 END) AS "В ремонте",
            SUM(CASE WHEN i.status = 'Списан' THEN 1 ELSE 0 END) AS "Списано",
            SUM(CASE WHEN i.status = 'На выдаче' THEN 1 ELSE 0 END) AS "На выдаче"
        FROM item_types it
        LEFT JOIN items i ON it.id = i.item_type_id
    `;
    const queryParams = [];
    const whereClauses = [];

    if (startDate) { whereClauses.push('i.acquisition_date >= ?'); queryParams.push(startDate); }
    if (endDate) { whereClauses.push('i.acquisition_date >= ?'); queryParams.push(endDate); }
    if (itemTypeId) { whereClauses.push('it.id = ?'); queryParams.push(parseInt(itemTypeId, 10)); }

    if (whereClauses.length > 0) { query += ' WHERE ' + whereClauses.join(' AND '); }
    query += ' GROUP BY it.id, it.name ORDER BY it.name;';

    dbModule.db.all(query, queryParams, (err, rows) => {
        if (err) { console.error('Ошибка при экспорте отчета по виду предмета:', err.message); return res.status(500).send('Ошибка при экспорте отчета'); }

        csv.stringify(rows, { header: true, columns: {
            item_type_name: "Вид предмета", total_items: "Всего предметов", available_items: "В наличии", repair_items: "В ремонте", written_off_items: "Списано", issued_items: "На выдаче"
        }}, (err, result) => {
            if (err) { console.error('Ошибка при преобразовании в CSV:', err.message); return res.status(500).send('Ошибка при преобразовании в CSV'); }
            res.setHeader('Content-disposition', 'attachment; filename=report_by_item_type.csv');
            res.setHeader('Content-type', 'text/csv');
            res.send(result);
        });
    });
});

// Отчет по статусу (с фильтром по дате)
router.get('/reports/by-status', async (req, res) => {
    const { startDate, endDate } = req.query;

    let query = `
        SELECT
            status,
            COUNT(id) AS total_items
        FROM items
    `;
    const queryParams = [];
    const whereClauses = [];

    if (startDate) { whereClauses.push('acquisition_date >= ?'); queryParams.push(startDate); }
    if (endDate) { whereClauses.push('acquisition_date <= ?'); queryParams.push(endDate); }

    if (whereClauses.length > 0) { query += ' WHERE ' + whereClauses.join(' AND '); }
    query += ' GROUP BY status ORDER BY status;';

    dbModule.db.all(query, queryParams, (err, rows) => {
        if (err) { console.error('Ошибка при генерации отчета по статусу:', err.message); res.status(500).send('Ошибка при генерации отчета'); return; }
        res.render('reports/by_status', {
            reportData: rows,
            currentFilters: { startDate, endDate }
        });
    });
});

// Экспорт отчета по статусу в CSV
router.get('/reports/by-status/export-csv', async (req, res) => {
    const { startDate, endDate } = req.query;

    let query = `
        SELECT
            status AS "Статус",
            COUNT(id) AS "Количество предметов"
        FROM items
    `;
    const queryParams = [];
    const whereClauses = [];

    if (startDate) { whereClauses.push('acquisition_date >= ?'); queryParams.push(startDate); }
    if (endDate) { whereClauses.push('acquisition_date <= ?'); queryParams.push(endDate); }

    if (whereClauses.length > 0) { query += ' WHERE ' + whereClauses.join(' AND '); }
    query += ' GROUP BY status ORDER BY status;';

    dbModule.db.all(query, queryParams, (err, rows) => {
        if (err) { console.error('Ошибка при экспорте отчета по статусу:', err.message); return res.status(500).send('Ошибка при экспорте отчета'); }

        csv.stringify(rows, { header: true, columns: {
            status: "Статус", total_items: "Количество предметов"
        }}, (err, result) => {
            if (err) { console.error('Ошибка при преобразовании в CSV:', err.message); return res.status(500).send('Ошибка при преобразовании в CSV'); }
            res.setHeader('Content-disposition', 'attachment; filename=report_by_status.csv');
            res.setHeader('Content-type', 'text/csv');
            res.send(result);
        });
    });
});

// Общий отчет (без фильтров, только сводка)
router.get('/reports/overview', async (req, res) => {
    const { startDate, endDate } = req.query; // Добавим поддержку дат для общего отчета

    let query = `
        SELECT
            COUNT(i.id) AS total_items,
            SUM(CASE WHEN i.status = 'В наличии' THEN 1 ELSE 0 END) AS available_items,
            SUM(CASE WHEN i.status = 'В ремонте' THEN 1 ELSE 0 END) AS repair_items,
            SUM(CASE WHEN i.status = 'Списан' THEN 1 ELSE 0 END) AS written_off_items,
            SUM(CASE WHEN i.status = 'На выдаче' THEN 1 ELSE 0 END) AS issued_items
        FROM items i
    `;
    const queryParams = [];
    const whereClauses = [];

    if (startDate) {
        whereClauses.push('i.acquisition_date >= ?');
        queryParams.push(startDate);
    }
    if (endDate) {
        whereClauses.push('i.acquisition_date <= ?');
        queryParams.push(endDate);
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    dbModule.db.get(query, queryParams, (err, row) => {
        if (err) { console.error('Ошибка при генерации общего отчета:', err.message); res.status(500).send('Ошибка при генерации отчета'); return; }
        const reportData = row || { total_items: 0, available_items: 0, repair_items: 0, written_off_items: 0, issued_items: 0 };
        res.render('reports/overview', { reportData: reportData, currentFilters: { startDate, endDate } });
    });
});

module.exports = router;